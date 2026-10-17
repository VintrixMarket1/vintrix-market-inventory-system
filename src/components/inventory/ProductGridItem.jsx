import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import ProductCard from "./ProductCard";

export default function ProductGridItem({ product, t, isPracownik, palletsMap, refundLoadingId, selected, onToggleSelect, onEdit, onDelete, onFlag, onConvert, onList, onSell, onReturn, onPartialRefund }) {
  return (
    <div>
      <ProductCard
        product={product}
        onEdit={onEdit}
        onDelete={onDelete}
        onFlag={onFlag}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
      {product.pallet_id && palletsMap[product.pallet_id] && (
        <div className="mt-1 px-1">
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
            📦 {palletsMap[product.pallet_id].pallet_code}
          </span>
        </div>
      )}
      <div className="flex gap-1 mt-1.5">
        {product.product_name === "Nieznany produkt" && product.status !== "reclassified" && (
          <Button size="sm" className="flex-1 text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => onConvert(product)}>
            🔄 {t("inv_convert")}
          </Button>
        )}
        {!isPracownik && product.product_name !== "Nieznany produkt" && (product.status || "in_stock") !== "sold" && product.status !== "reclassified" && (
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => onList(product)}>{t("inv_list")}</Button>
        )}
        {!isPracownik && product.product_name !== "Nieznany produkt" && ((product.status || "in_stock") !== "sold" || (product.is_multi_item && product.stock_quantity > 0)) && product.status !== "reclassified" && (
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onSell(product)}>{t("inv_sell")}</Button>
        )}
        {!isPracownik && product.status === "sold" && !product.is_multi_item && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-orange-600 border-orange-200 hover:bg-orange-50" disabled={refundLoadingId === product.id}>
                {refundLoadingId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "↩ Zwrot"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReturn(product)} className="text-orange-600 focus:text-orange-700">Pełny zwrot (na magazyn)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPartialRefund(product)} className="text-amber-600 focus:text-amber-700">Częściowy zwrot środków</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isPracownik && product.is_multi_item && product.product_name !== "Nieznany produkt" && product.status !== "reclassified" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-amber-600 border-amber-200 hover:bg-amber-50" disabled={refundLoadingId === product.id}>
                {refundLoadingId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "↩ Zwrot"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReturn(product)} className="text-orange-600 focus:text-orange-700">Pełny zwrot (na magazyn)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPartialRefund(product)} className="text-amber-600 focus:text-amber-700">Częściowy zwrot środków</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}