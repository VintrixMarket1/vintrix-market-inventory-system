import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import PalletForm from "@/components/pallets/PalletForm";

const STATUS_CONFIG = {
  accepted:   { label: "Przyjęta",             color: "bg-blue-100 text-blue-700",      icon: "📥" },
  sorting:    { label: "W trakcie sortowania", color: "bg-amber-100 text-amber-700",    icon: "🔄" },
  ready:      { label: "Gotowa do rozbicia",   color: "bg-emerald-100 text-emerald-700",icon: "✅" },
  exploded:   { label: "Rozbita",              color: "bg-purple-100 text-purple-700",  icon: "🔓" },
  closed:     { label: "Zamknięta",            color: "bg-slate-100 text-slate-600",    icon: "🏁" },
  // legacy aliases
  active:     { label: "Przyjęta",             color: "bg-blue-100 text-blue-700",      icon: "📥" },
  processing: { label: "W trakcie sortowania", color: "bg-amber-100 text-amber-700",    icon: "🔄" },
  processed:  { label: "Rozbita",              color: "bg-purple-100 text-purple-700",  icon: "🔓" },
};

const STATUS_ORDER = ["accepted", "sorting", "ready", "exploded", "closed"];

export default function Pallets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: pallets = [], isLoading } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list("-created_date"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pallets"] });

  // Stats per status
  const statusCounts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = pallets.filter(p => (p.status || "accepted") === s || (s === "accepted" && p.status === "active") || (s === "sorting" && p.status === "processing") || (s === "exploded" && p.status === "processed")).length;
    return acc;
  }, {});

  const filtered = pallets.filter(p => {
    const matchesSearch = !search || p.pallet_code?.toLowerCase().includes(search.toLowerCase()) || p.investor_name?.toLowerCase().includes(search.toLowerCase());
    const pStatus = p.status || "accepted";
    const matchesStatus = statusFilter === "all" || pStatus === statusFilter
      || (statusFilter === "accepted" && pStatus === "active")
      || (statusFilter === "sorting" && pStatus === "processing")
      || (statusFilter === "exploded" && pStatus === "processed");
    return matchesSearch && matchesStatus;
  });

  const getProductCount = (palletId) => products.filter(p => p.pallet_id === palletId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Palety</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pallets.length} palet · {products.length} produktów</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nowa paleta
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          Wszystkie ({pallets.length})
        </button>
        {STATUS_ORDER.map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = statusCounts[s] || 0;
          if (count === 0 && statusFilter !== s) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Szukaj palety..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Brak palet</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(true)}>
            Dodaj pierwszą paletę
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(pallet => {
            const cfg = STATUS_CONFIG[pallet.status] || STATUS_CONFIG.accepted;
            const productCount = getProductCount(pallet.id);
            const totalValue = pallet.total_value || (pallet.total_cost || 0) + (pallet.additional_costs || 0);
            return (
              <div
                key={pallet.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/PalletDetail?id=${pallet.id}`)}
              >
                <div className="text-2xl w-10 text-center shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{pallet.pallet_code}</span>
                    <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span>{pallet.investor_name}</span>
                    {pallet.purchase_date && <span>· {format(new Date(pallet.purchase_date), "dd.MM.yyyy")}</span>}
                    <span>· {productCount} produktów</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-900">{totalValue.toFixed(2)} PLN</p>
                  {pallet.invoice_number && <p className="text-xs text-slate-400 mt-0.5">{pallet.invoice_number}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PalletForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}
    </div>
  );
}