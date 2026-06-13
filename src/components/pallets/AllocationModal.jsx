import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const CATEGORY_LABELS = {
  electronics: "Elektronika", home: "Dom/AGD", sports: "Sport",
  clothing: "Odzież", shoes: "Obuwie", accessories: "Akcesoria",
  books: "Książki", toys: "Zabawki", other: "Inne"
};
const DEFAULT_WEIGHTS = {
  electronics: 3, home: 2, sports: 2, clothing: 1.5,
  shoes: 1.5, accessories: 1, books: 0.5, toys: 1, other: 1
};

export default function AllocationModal({ open, onClose, pallet, products, onConfirm, loading }) {
  const [method, setMethod] = useState("equal");

  const totalValue = pallet?.total_value || ((pallet?.total_cost || 0) + (pallet?.additional_costs || 0));

  const allocations = useMemo(() => {
    if (!products.length || !totalValue) return [];
    const result = products.map(p => {
      const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
      let value = 0;
      if (method === "equal") {
        const totalUnits = products.reduce((s, x) => s + (x.is_multi_item && x.stock_quantity > 0 ? x.stock_quantity : 1), 0);
        value = parseFloat(((totalValue / totalUnits) * qty).toFixed(2));
      } else if (method === "proportional") {
        const totalSale = products.reduce((s, x) => {
          const q = x.is_multi_item && x.stock_quantity > 0 ? x.stock_quantity : 1;
          return s + ((x.suggested_sale_price || 0) * q);
        }, 0);
        const ratio = totalSale > 0 ? ((p.suggested_sale_price || 0) * qty) / totalSale : 1 / products.length;
        value = parseFloat((totalValue * ratio).toFixed(2));
      } else if (method === "category_weight") {
        const weightedTotal = products.reduce((s, x) => {
          const q = x.is_multi_item && x.stock_quantity > 0 ? x.stock_quantity : 1;
          return s + ((DEFAULT_WEIGHTS[x.category] || 1) * q);
        }, 0);
        const w = (DEFAULT_WEIGHTS[p.category] || 1) * qty;
        value = parseFloat((totalValue * (w / weightedTotal)).toFixed(2));
      }
      return { ...p, allocated: value, qty };
    });
    // Fix rounding
    const allocated = result.reduce((s, r) => s + r.allocated, 0);
    const diff = parseFloat((totalValue - allocated).toFixed(2));
    if (diff !== 0 && result.length > 0) result[result.length - 1].allocated = parseFloat((result[result.length - 1].allocated + diff).toFixed(2));
    return result;
  }, [products, totalValue, method]);

  const allocatedSum = allocations.reduce((s, a) => s + a.allocated, 0);
  const missingPrices = method === "proportional" && products.some(p => !p.suggested_sale_price);

  const validation = {
    hasProducts: products.length > 0,
    allNamed: products.every(p => p.product_name && p.product_name.trim() !== ''),
    hasTotalValue: totalValue > 0,
    noPropIssue: !missingPrices,
  };
  const canConfirm = Object.values(validation).every(Boolean);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🔓 Zatwierdź rozbicie palety</span>
            <Badge className="bg-orange-100 text-orange-700 text-xs">{pallet?.pallet_code}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Tej operacji nie można cofnąć bez dokumentu korekty.</p>
              <p>Zatwierdzenie spowoduje: zdjęcie palety ze stanu (RW), przyjęcie produktów na magazyn (PW) oraz wygenerowanie protokołu rozbicia (DRP).</p>
            </div>
          </div>

          {/* Validation */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Walidacja</p>
            {[
              { ok: validation.hasProducts, label: `Produkty przypisane (${products.length} szt.)` },
              { ok: validation.allNamed, label: `Wszystkie produkty mają nazwy (nieznane dozwolone)` },
              { ok: validation.hasTotalValue, label: `Wartość palety: ${totalValue.toFixed(2)} PLN` },
              { ok: validation.noPropIssue, label: method === "proportional" ? "Wszystkie produkty mają ceny sprzedaży" : "Metoda alokacji OK" },
            ].map((v, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${v.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {v.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {v.label}
              </div>
            ))}
          </div>

          {/* Method */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Metoda alokacji wartości</p>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Równa — podział kosztu na każdą jednostkę</SelectItem>
                <SelectItem value="proportional">Proporcjonalna — wg szacowanej ceny sprzedaży</SelectItem>
                <SelectItem value="category_weight">Wagi kategorii — elektronika=3x, odzież=1.5x itd.</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Podgląd alokacji</p>
              <span className="text-xs text-slate-500">Razem: <strong>{allocatedSum.toFixed(2)} PLN</strong> / {totalValue.toFixed(2)} PLN</span>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 font-medium text-slate-500">Produkt</th>
                    <th className="text-center p-2 font-medium text-slate-500">Kat.</th>
                    <th className="text-right p-2 font-medium text-slate-500">Ilość</th>
                    {method === "proportional" && <th className="text-right p-2 font-medium text-slate-500">Cena spr.</th>}
                    <th className="text-right p-2 font-medium text-slate-500">Koszt wł.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 max-w-[180px] truncate font-medium text-slate-800">{p.product_name}</td>
                      <td className="p-2 text-center text-slate-500">{CATEGORY_LABELS[p.category] || p.category || "—"}</td>
                      <td className="p-2 text-right text-slate-700">{p.qty}</td>
                      {method === "proportional" && <td className="p-2 text-right text-slate-500">{p.suggested_sale_price ? `${p.suggested_sale_price} PLN` : <span className="text-red-400">brak</span>}</td>}
                      <td className="p-2 text-right font-semibold text-slate-800">{p.allocated.toFixed(2)} PLN</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={method === "proportional" ? 4 : 3} className="p-2 text-right font-semibold text-slate-600">Suma:</td>
                    <td className="p-2 text-right font-bold text-slate-900">{allocatedSum.toFixed(2)} PLN</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} disabled={loading}>Anuluj</Button>
            <Button
              onClick={() => onConfirm(method)}
              disabled={!canConfirm || loading}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔓"}
              Zatwierdź rozbicie
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}