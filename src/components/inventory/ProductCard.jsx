import React from "react";
import { Badge } from "@/components/ui/badge";
import { MapPin, Edit2, Trash2 } from "lucide-react";

const conditionLabels = { new: "New", like_new: "Like New", used: "Used" };
const conditionColors = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  like_new: "bg-blue-50 text-blue-700 border-blue-200",
  used: "bg-amber-50 text-amber-700 border-amber-200",
};
const statusColors = {
  in_stock: "bg-slate-100 text-slate-600",
  listed: "bg-purple-100 text-purple-700",
  sold: "bg-emerald-100 text-emerald-700",
  reclassified: "bg-amber-100 text-amber-700",
};

const statusLabels = {
  in_stock: "Na stanie",
  listed: "Wystawiony",
  sold: "Sprzedany",
  reclassified: "Przeklasyfikowany",
};

export default function ProductCard({ product, onEdit, onDelete, selected, onToggleSelect }) {
  const canDelete = !!onDelete;
  const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200 group ${selected ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200/60"}`}>
      <div
        className="aspect-square bg-slate-100 relative overflow-hidden cursor-pointer"
        onClick={onToggleSelect ? (e) => { e.stopPropagation(); onToggleSelect(product.id); } : undefined}
      >
        {mainImage ? (
          <img src={mainImage} alt={product.product_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <span className="text-4xl">📦</span>
          </div>
        )}
        {/* Checkbox */}
        {onToggleSelect && (
          <div
            className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center shadow cursor-pointer z-10 transition-all ${selected ? "bg-emerald-500 opacity-100" : "bg-white/90 opacity-40 group-hover:opacity-100"}`}
            onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleSelect(product.id); }}
          >
            {selected ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
            )}
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge className={`text-[10px] ${statusColors[product.status] || statusColors.in_stock}`}>
            {statusLabels[product.status] || (product.status || "in_stock").replace("_", " ")}
          </Badge>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 pointer-events-none">
          <div className="flex gap-1.5 pointer-events-auto">
            <button onClick={() => onEdit(product)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-slate-50">
              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
            </button>
            {canDelete && (
              <button onClick={() => onDelete(product)} className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className={`text-[10px] ${conditionColors[product.condition] || ""}`}>
            {conditionLabels[product.condition] || product.condition}
          </Badge>
          <span className="text-[10px] text-slate-400 font-mono">{product.internal_code}</span>
        </div>
        <h3 className="font-semibold text-sm text-slate-900 truncate">{product.product_name}</h3>
        <p className="text-xs text-slate-500 capitalize mt-0.5">{product.category}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-xs text-slate-400">Buy</p>
            <p className="text-sm font-bold text-slate-600">{product.purchase_price} PLN</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Sell</p>
            <p className="text-sm font-bold text-emerald-600">{product.suggested_sale_price || "—"} PLN</p>
          </div>
        </div>
        {(product.warehouse_zone || product.shelf || product.box_number) && (
          <div className="flex items-center gap-1 mt-2.5 text-[10px] text-slate-400">
            <MapPin className="w-3 h-3" />
            {[product.warehouse_zone, product.shelf, product.box_number].filter(Boolean).join(" / ")}
          </div>
        )}
      </div>
    </div>
  );
}