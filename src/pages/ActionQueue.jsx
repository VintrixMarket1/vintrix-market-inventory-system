import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Flag, Search, CheckCircle, Edit2, MapPin, Filter } from "lucide-react";
import ActionFlagModal, { ACTION_TYPES, getActionTypeInfo } from "@/components/inventory/ActionFlagModal";

export default function ActionQueue() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [flagProduct, setFlagProduct] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["action_queue"],
    queryFn: () => base44.entities.Product.filter({ action_flag: true }, "-action_set_date", 500),
  });

  const filtered = products.filter(p => {
    const searchMatch = !search ||
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.internal_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeFilter === "all" || p.action_type === typeFilter;
    return searchMatch && typeMatch;
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["action_queue"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleResolve = async (product) => {
    await base44.entities.Product.update(product.id, {
      action_flag: false,
      action_type: null,
      action_note: null,
    });
    refresh();
  };

  const typeCounts = ACTION_TYPES.reduce((acc, t) => {
    acc[t.value] = products.filter(p => p.action_type === t.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Flag className="w-6 h-6 text-amber-500" />
          Kolejka działań
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {filtered.length} {filtered.length === 1 ? "oznaczony produkt" : "oznaczonych produktów"} wymagających działania
        </p>
      </div>

      {/* Stats by type */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ACTION_TYPES.map(opt => {
          const Icon = opt.icon;
          const count = typeCounts[opt.value] || 0;
          const active = typeFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(active ? "all" : opt.value)}
              className={`rounded-xl border p-3 text-left transition-all ${active ? `${opt.color} ring-1` : "border-slate-200 bg-white hover:border-slate-300"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${active ? "" : "text-slate-400"}`} />
                <span className={`text-lg font-bold ${active ? "" : "text-slate-700"}`}>{count}</span>
              </div>
              <p className={`text-xs font-medium ${active ? "" : "text-slate-500"}`}>{opt.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Szukaj po nazwie, SKU, marce..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {(typeFilter !== "all" || search) && (
        <Button variant="outline" size="sm" onClick={() => { setTypeFilter("all"); setSearch(""); }} className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Wyczyść filtry
        </Button>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Brak produktów wymagających działania</p>
          <p className="text-xs text-slate-400 mt-1">Wszystkie oznaczenia zostały rozwiązane</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => {
            const typeInfo = getActionTypeInfo(product.action_type);
            const Icon = typeInfo.icon;
            const mainImage = product.images?.[0];

            return (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-md transition-all">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {mainImage ? (
                    <img src={mainImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`text-[10px] ${typeInfo.color}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {typeInfo.label}
                    </Badge>
                    <span className="font-mono text-xs text-slate-400">{product.internal_code}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{product.product_name}</h3>
                  {product.brand && <p className="text-xs text-slate-500">{product.brand}</p>}

                  {product.action_note && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 mt-1.5">
                      {product.action_note}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                    {product.action_set_by && <span>Oznaczył: <strong className="text-slate-500">{product.action_set_by}</strong></span>}
                    {product.action_set_date && (
                      <span>{new Date(product.action_set_date).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                    {(product.warehouse_zone || product.shelf || product.box_number) && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[product.warehouse_zone, product.shelf, product.box_number].filter(Boolean).join(" / ")}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleResolve(product)}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Rozwiąż
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => setFlagProduct(product)}
                  >
                    <Flag className="w-3.5 h-3.5" /> Edytuj
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => navigate(`/Inventory?edit=${product.id}`)}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Produkt
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flagProduct && (
        <ActionFlagModal
          product={flagProduct}
          onClose={() => setFlagProduct(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}