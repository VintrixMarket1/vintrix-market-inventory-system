import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Calculator, Loader2 } from "lucide-react";
import PalletForm from "../components/pallets/PalletForm";
import PalletStats from "../components/pallets/PalletStats";
import { format } from "date-fns";

const statusColors = {
  in_stock: "bg-blue-100 text-blue-700",
  listed: "bg-emerald-100 text-emerald-700",
  sold: "bg-amber-100 text-amber-700",
};

export default function Pallets() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editPallet, setEditPallet] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [calculatingId, setCalculatingId] = useState(null);

  const { data: pallets = [], isLoading } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list("-created_date"),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list(),
  });

  const handleDelete = async (pallet) => {
    if (!confirm(`Delete pallet ${pallet.pallet_code}?`)) return;
    await base44.entities.Pallet.delete(pallet.id);
    queryClient.invalidateQueries({ queryKey: ["pallets"] });
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pallets"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleCalculatePrices = async (pallet) => {
    if (!confirm(`Czy obliczyć ceny jednostkowe dla palety ${pallet.pallet_code}?\n\nKoszt: ${pallet.total_cost} PLN zostanie podzielony równo pomiędzy wszystkie produkty tej palety.`)) return;
    setCalculatingId(pallet.id);
    const response = await base44.functions.invoke("calculatePalletPrices", { pallet_id: pallet.id });
    setCalculatingId(null);
    if (response.data?.success) {
      alert(`✅ Obliczono!\nLiczba produktów: ${response.data.product_count}\nCena jednostkowa: ${response.data.calculated_unit_price} PLN`);
      refresh();
    } else {
      alert(`Błąd: ${response.data?.error || "Nieznany błąd"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pallets</h1>
          <p className="text-sm text-slate-500 mt-1">Track inventory by supply batch & investor</p>
        </div>
        <Button size="sm" onClick={() => { setEditPallet(null); setShowForm(true); }} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> New Pallet
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : pallets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">No pallets yet</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
            Create your first pallet
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pallets.map(pallet => {
            const isExpanded = expandedId === pallet.id;
            const palletProducts = products.filter(p => p.pallet_id === pallet.id);
            return (
              <div key={pallet.id} className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{pallet.pallet_code}</span>
                      <Badge className="bg-slate-100 text-slate-600 text-xs">{pallet.investor_name}</Badge>
                      {pallet.purchase_date && (
                        <span className="text-xs text-slate-400">
                          {format(new Date(pallet.purchase_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {pallet.total_cost} PLN invested · {palletProducts.length} items
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {pallet.status !== 'processed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => handleCalculatePrices(pallet)}
                        disabled={calculatingId === pallet.id}
                      >
                        {calculatingId === pallet.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Calculator className="w-3.5 h-3.5" />
                        }
                        Kalkuluj ceny
                      </Button>
                    )}
                    {pallet.status === 'processed' && (
                      <span className="text-xs text-emerald-600 font-medium px-2">
                        ✓ {pallet.calculated_unit_price} PLN/szt.
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPallet(pallet); setShowForm(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(pallet)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : pallet.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                    <PalletStats pallet={pallet} products={products} sales={sales} />

                    {palletProducts.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No products assigned to this pallet yet</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</p>
                        {palletProducts.map(product => (
                          <div key={product.id} className="bg-white rounded-lg border border-slate-200/60 px-3 py-2 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{product.product_name}</p>
                              <p className="text-xs text-slate-400">{product.internal_code} · {product.category}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge className={`text-[10px] ${statusColors[product.status || "in_stock"]}`}>
                                {product.status || "in_stock"}
                              </Badge>
                              <p className="text-xs text-slate-500 mt-0.5">{product.purchase_price} PLN</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PalletForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditPallet(null); }}
          pallet={editPallet}
          onSaved={refresh}
        />
      )}
    </div>
  );
}