import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Package, FileText, CheckCircle2, AlertTriangle,
  Download, Edit2, Plus, Loader2, TrendingUp, DollarSign,
  ShoppingCart, Trash2, BarChart3, PackageSearch
} from "lucide-react";
import { format } from "date-fns";
import AllocationModal from "../components/pallets/AllocationModal";
import AddUnknownItemsModal from "../components/pallets/AddUnknownItemsModal";
import { exportDRP, exportRW, exportPW, exportPZ } from "@/lib/palletPdfExport";
import { toast } from "@/components/ui/use-toast";

const STATUS_CONFIG = {
  accepted:  { label: "Przyjęta",             color: "bg-blue-100 text-blue-700",    icon: "📥" },
  sorting:   { label: "W trakcie sortowania", color: "bg-amber-100 text-amber-700",  icon: "🔄" },
  ready:     { label: "Gotowa do rozbicia",   color: "bg-emerald-100 text-emerald-700", icon: "✅" },
  exploded:  { label: "Rozbita",              color: "bg-purple-100 text-purple-700", icon: "🔓" },
  closed:    { label: "Zamknięta",            color: "bg-slate-100 text-slate-600",  icon: "🏁" },
  // legacy
  active:    { label: "Przyjęta",             color: "bg-blue-100 text-blue-700",    icon: "📥" },
  processing:{ label: "W trakcie sortowania", color: "bg-amber-100 text-amber-700",  icon: "🔄" },
  processed: { label: "Rozbita",              color: "bg-purple-100 text-purple-700", icon: "🔓" },
};

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const STATUS_PRODUCT_LABELS = { in_stock: "Na stanie", listed: "Wystawiony", sold: "Sprzedany" };

export default function PalletDetail() {
  const [searchParams] = useSearchParams();
  const palletId = searchParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [allocationModal, setAllocationModal] = useState(false);
  const [unknownModal, setUnknownModal] = useState(false);
  const [explodingLoading, setExplodingLoading] = useState(false);
  const [editingPallet, setEditingPallet] = useState(false);
  const [palletForm, setPalletForm] = useState(null);
  const [savingPallet, setSavingPallet] = useState(false);

  const { data: pallet, isLoading: palletLoading } = useQuery({
    queryKey: ["pallet", palletId],
    queryFn: async () => {
      const res = await base44.entities.Pallet.filter({ id: palletId });
      return res[0] || null;
    },
    enabled: !!palletId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "pallet", palletId],
    queryFn: () => base44.entities.Product.filter({ pallet_id: palletId }),
    enabled: !!palletId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_date"),
  });

  const { data: warehouseDocs = [] } = useQuery({
    queryKey: ["warehouse_documents"],
    queryFn: () => base44.entities.WarehouseDocument.list("-created_date"),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pallet", palletId] });
    queryClient.invalidateQueries({ queryKey: ["products", "pallet", palletId] });
    queryClient.invalidateQueries({ queryKey: ["pallets"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse_documents"] });
  };

  const palletDocs = warehouseDocs.filter(d => d.pallet_id === palletId);
  const pzDoc = palletDocs.find(d => d.document_type === "PZ");
  const rwDoc = palletDocs.find(d => d.document_type === "RW");
  const pwDoc = palletDocs.find(d => d.document_type === "PW");
  const drpDoc = palletDocs.find(d => d.document_type === "DRP");

  const totalValue = pallet ? (pallet.total_value || (pallet.total_cost || 0) + (pallet.additional_costs || 0)) : 0;
  const knownProducts = products.filter(p => p.product_name && p.product_name !== "Nieznany produkt");
  const totalUnits = products.reduce((s, p) => s + (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1), 0);
  const sumSalePrice = products.reduce((s, p) => {
    const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
    return s + ((p.suggested_sale_price || 0) * qty);
  }, 0);
  const sumAllocated = products.reduce((s, p) => {
    const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
    return s + ((p.purchase_price || 0) * qty);
  }, 0);
  const soldSales = sales.filter(s => products.some(p => p.id === s.product_id));
  const totalRevenue = soldSales.reduce((s, x) => s + (x.sale_price || 0), 0);
  const actualMargin = totalRevenue - totalValue;

  const handleExplode = async (method) => {
    setExplodingLoading(true);
    const res = await base44.functions.invoke("explodePallet", {
      pallet_id: palletId,
      allocation_method: method,
    });
    setExplodingLoading(false);
    if (res.data?.success) {
      setAllocationModal(false);
      toast({
        title: "Rozbicie palety zatwierdzone ✅",
        description: `Wygenerowano: ${res.data.rw_number}, ${res.data.pw_number}, ${res.data.drp_number}`,
      });
      refresh();
    } else {
      toast({ title: "Błąd", description: res.data?.error || "Nieznany błąd", variant: "destructive" });
    }
  };

  const handleMarkReady = async () => {
    await base44.entities.Pallet.update(palletId, { status: "ready" });
    refresh();
  };

  const handleStatusChange = async (newStatus) => {
    await base44.entities.Pallet.update(palletId, { status: newStatus });
    refresh();
  };

  const handleSavePallet = async () => {
    setSavingPallet(true);
    const tv = (parseFloat(palletForm.total_cost) || 0) + (parseFloat(palletForm.additional_costs) || 0);
    await base44.entities.Pallet.update(palletId, {
      ...palletForm,
      total_cost: parseFloat(palletForm.total_cost) || 0,
      additional_costs: parseFloat(palletForm.additional_costs) || 0,
      total_value: tv,
    });
    setSavingPallet(false);
    setEditingPallet(false);
    refresh();
  };

  if (palletLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );
  if (!pallet) return (
    <div className="text-center py-20 text-slate-400">
      <Package className="w-10 h-10 mx-auto mb-3" />
      <p>Nie znaleziono palety</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/Pallets")}>Powrót</Button>
    </div>
  );

  const statusCfg = STATUS_CONFIG[pallet.status] || STATUS_CONFIG.accepted;
  const isExploded = pallet.status === "exploded" || pallet.status === "closed" || pallet.status === "processed";
  const isReady = pallet.status === "ready";
  const isSorting = pallet.status === "sorting" || pallet.status === "processing";
  const isAccepted = pallet.status === "accepted" || pallet.status === "active";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/Pallets")} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{pallet.pallet_code}</h1>
            <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.icon} {statusCfg.label}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{pallet.investor_name} · {pallet.purchase_date ? format(new Date(pallet.purchase_date), "dd.MM.yyyy") : "—"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isExploded && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPalletForm({ ...pallet }); setEditingPallet(true); }}>
              <Edit2 className="w-3.5 h-3.5" /> Edytuj dane
            </Button>
          )}
          {(isAccepted || isSorting) && products.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={handleMarkReady}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Gotowa do rozbicia
            </Button>
          )}
          {isReady && (
            <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" onClick={() => setAllocationModal(true)}>
              🔓 Zatwierdź rozbicie
            </Button>
          )}
        </div>
      </div>

      {/* Pallet details */}
      {editingPallet && palletForm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Edytuj dane palety</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kod palety</Label><Input value={palletForm.pallet_code} onChange={e => setPalletForm(p => ({ ...p, pallet_code: e.target.value }))} /></div>
            <div><Label>Inwestor / Dostawca</Label><Input value={palletForm.investor_name} onChange={e => setPalletForm(p => ({ ...p, investor_name: e.target.value }))} /></div>
            <div><Label>Data zakupu</Label><Input type="date" value={palletForm.purchase_date || ""} onChange={e => setPalletForm(p => ({ ...p, purchase_date: e.target.value }))} /></div>
            <div><Label>Numer faktury</Label><Input value={palletForm.invoice_number || ""} onChange={e => setPalletForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
            <div><Label>Wartość zakupowa (PLN)</Label><Input type="number" value={palletForm.total_cost} onChange={e => setPalletForm(p => ({ ...p, total_cost: e.target.value }))} /></div>
            <div><Label>Koszty dodatkowe (PLN)</Label><Input type="number" value={palletForm.additional_costs || 0} onChange={e => setPalletForm(p => ({ ...p, additional_costs: e.target.value }))} /></div>
          </div>
          <div><Label>Notatki</Label><Textarea value={palletForm.notes || ""} onChange={e => setPalletForm(p => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingPallet(false)}>Anuluj</Button>
            <Button onClick={handleSavePallet} disabled={savingPallet} className="bg-emerald-600 hover:bg-emerald-700">
              {savingPallet ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zapisz"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pallet info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> Dane palety</h2>
            <div className="space-y-2 text-sm">
              {[
                ["Numer palety", pallet.pallet_code],
                ["Inwestor / Dostawca", pallet.investor_name],
                ["Data zakupu", pallet.purchase_date ? format(new Date(pallet.purchase_date), "dd.MM.yyyy") : "—"],
                ["Numer faktury", pallet.invoice_number || "—"],
                ["Wartość zakupowa", `${(pallet.total_cost || 0).toFixed(2)} PLN`],
                ["Koszty dodatkowe", `${(pallet.additional_costs || 0).toFixed(2)} PLN`],
                ["Łączna wartość do rozlicz.", <strong key="tv">{totalValue.toFixed(2)} PLN</strong>],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-800 font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-400" /> Podsumowanie</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Produkty", val: knownProducts.length, sub: `${totalUnits} szt.`, color: "blue" },
                { label: "Sprzedane", val: soldSales.length, sub: "transakcji", color: "emerald" },
                { label: "Suma cen spr.", val: `${sumSalePrice.toFixed(0)} PLN`, sub: "szacowana", color: "amber" },
                { label: "Przychód", val: `${totalRevenue.toFixed(0)} PLN`, sub: `marża: ${actualMargin >= 0 ? "+" : ""}${actualMargin.toFixed(0)} PLN`, color: actualMargin >= 0 ? "emerald" : "red" },
              ].map(({ label, val, sub, color }) => (
                <div key={label} className={`rounded-lg border p-3 bg-${color}-50 border-${color}-200`}>
                  <p className={`text-xs text-${color}-500 uppercase tracking-wider`}>{label}</p>
                  <p className={`text-lg font-bold text-${color}-700 mt-0.5`}>{val}</p>
                  <p className={`text-xs text-${color}-400 mt-0.5`}>{sub}</p>
                </div>
              ))}
            </div>
            {isExploded && (
              <div className="text-xs text-purple-600 bg-purple-50 rounded-lg p-3 mt-2">
                <span className="font-semibold">Rozbita: </span>
                {pallet.exploded_at ? format(new Date(pallet.exploded_at), "dd.MM.yyyy HH:mm") : "—"} · {pallet.exploded_by || "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4"><FileText className="w-4 h-4 text-slate-400" /> Dokumenty magazynowe</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: "PZ", doc: pzDoc, label: "Przyjęcie Zewnętrzne", color: "blue", onExport: () => pzDoc && exportPZ(pzDoc, pallet) },
            { type: "RW", doc: rwDoc, label: "Rozchód Wewnętrzny", color: "orange", onExport: () => rwDoc && exportRW(rwDoc, pallet) },
            { type: "PW", doc: pwDoc, label: "Przyjęcie Wewnętrzne", color: "emerald", onExport: () => pwDoc && exportPW(pwDoc, pallet) },
            { type: "DRP", doc: drpDoc, label: "Protokół Rozbicia", color: "purple", onExport: () => drpDoc && exportDRP(pallet, products, warehouseDocs) },
          ].map(({ type, doc, label, color, onExport }) => (
            <div key={type} className={`rounded-lg border p-3 ${doc ? `bg-${color}-50 border-${color}-200` : "bg-slate-50 border-slate-200 opacity-60"}`}>
              <div className="flex items-center justify-between mb-1">
                <Badge className={`text-[10px] ${doc ? `bg-${color}-100 text-${color}-700` : "bg-slate-100 text-slate-500"}`}>{type}</Badge>
                {doc && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExport}>
                    <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700">{label}</p>
              {doc ? (
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{doc.document_number}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">Nie wygenerowano</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-400" />
            Produkty z palety
            <Badge className="bg-slate-100 text-slate-600 text-xs">{products.length}</Badge>
          </h2>
          {!isExploded && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setUnknownModal(true)}>
                <PackageSearch className="w-3.5 h-3.5" /> Dodaj nieznane
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate(`/AddProduct?pallet_id=${palletId}`)}>
                <Plus className="w-3.5 h-3.5" /> Dodaj produkt
              </Button>
            </div>
          )}
        </div>

        {(() => {
          const unknownCount = products.filter(p => p.product_name === "Nieznany produkt").length;
          const visibleProducts = products.filter(p => p.product_name !== "Nieznany produkt");
          return products.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak produktów w tej palecie</p>
              {!isExploded && (
                <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/AddProduct?pallet_id=${palletId}`)}>
                  Dodaj pierwszy produkt
                </Button>
              )}
            </div>
          ) : (
            <>
              {unknownCount > 0 && (
                <div className="mb-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <PackageSearch className="w-3.5 h-3.5 shrink-0" />
                  <span>{unknownCount} {unknownCount === 1 ? "nieznany przedmiot ukryty" : "nieznane przedmioty ukryte"} — uzupełnij dane w sekcji Magazyn</span>
                </div>
              )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-2 font-medium text-slate-500 text-xs">Produkt / SKU</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs">Kategoria</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs">Stan</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs text-right">Ilość</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs text-right">Cena spr.</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs text-right">Koszt wł.</th>
                  <th className="pb-2 font-medium text-slate-500 text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleProducts.map(p => {
                  const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/Inventory?edit=${p.id}`)}>
                      <td className="py-2 pr-3">
                        <p className="font-medium truncate max-w-[180px] text-slate-900">{p.product_name}</p>
                        {p.internal_code && <p className="text-xs text-slate-400 font-mono">{p.internal_code}</p>}
                      </td>
                      <td className="py-2 text-xs text-slate-500">{p.category || "—"}</td>
                      <td className="py-2 text-xs text-slate-500">{CONDITION_LABELS[p.condition] || p.condition || "—"}</td>
                      <td className="py-2 text-right text-slate-700 font-medium">{qty}</td>
                      <td className="py-2 text-right text-slate-600 text-xs">{p.suggested_sale_price ? `${p.suggested_sale_price} PLN` : <span className="text-slate-300">—</span>}</td>
                      <td className="py-2 text-right font-semibold text-slate-800 text-xs">{p.purchase_price ? `${p.purchase_price} PLN` : <span className="text-slate-300">—</span>}</td>
                      <td className="py-2">
                        <Badge className={`text-[10px] ${p.status === "sold" ? "bg-emerald-100 text-emerald-700" : p.status === "listed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {STATUS_PRODUCT_LABELS[p.status] || p.status || "Na stanie"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="pt-3 text-xs text-slate-500 font-semibold">Razem</td>
                  <td className="pt-3 text-right font-bold text-slate-800">{totalUnits}</td>
                  <td className="pt-3 text-right text-xs font-semibold text-slate-600">{sumSalePrice.toFixed(2)} PLN</td>
                  <td className="pt-3 text-right text-xs font-bold text-slate-900">{sumAllocated.toFixed(2)} PLN</td>
                  <td></td>
                </tr>
                {isExploded && (
                  <tr>
                    <td colSpan={7} className="pt-1">
                      <div className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${Math.abs(sumAllocated - totalValue) < 0.05 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {Math.abs(sumAllocated - totalValue) < 0.05
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Suma alokacji równa wartości palety ({totalValue.toFixed(2)} PLN) ✓</>
                          : <><AlertTriangle className="w-3.5 h-3.5" /> Różnica: {(sumAllocated - totalValue).toFixed(2)} PLN</>
                        }
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
            </>
          );
        })()}
      </div>

      {/* Notes */}
      {pallet.notes && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notatki</p>
          <p className="text-sm text-slate-700">{pallet.notes}</p>
        </div>
      )}

      {/* Unknown items modal */}
      {unknownModal && pallet && (
        <AddUnknownItemsModal
          open={unknownModal}
          onClose={() => setUnknownModal(false)}
          pallet={pallet}
          onSaved={refresh}
        />
      )}

      {/* Allocation modal */}
      {allocationModal && (
        <AllocationModal
          open={allocationModal}
          onClose={() => setAllocationModal(false)}
          pallet={{ ...pallet, total_value: totalValue }}
          products={products}
          onConfirm={handleExplode}
          loading={explodingLoading}
        />
      )}
    </div>
  );
}