import React from "react";
import { Heart, Share2, ShoppingCart, MessageCircle } from "lucide-react";
import { getPromoInfo } from "@/lib/discounts";

const CONDITION_COLORS = { new: "bg-emerald-900/60 text-emerald-300", like_new: "bg-sky-900/60 text-sky-300", used: "bg-stone-700/60 text-stone-300" };

export default function CatalogProductCard({ product, isFavorite, isInCart, onSelect, onToggleFavorite, onAddToCart, onBuyNow, onShare, condLabels, t }) {
  const promo = getPromoInfo(product);
  return (
    <div className="group flex flex-col bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 hover:border-stone-600 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-stone-800 overflow-hidden cursor-pointer" onClick={onSelect}>
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">◈</div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.condition && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm ${CONDITION_COLORS[product.condition]}`}>
              {condLabels[product.condition]}
            </span>
          )}
          {promo && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500 text-black">
              -{promo.pct}%
            </span>
          )}
        </div>

        {/* Share */}
        <button
          onClick={onShare}
          className="absolute top-2.5 right-12 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg bg-stone-900/80 text-stone-400 hover:text-white backdrop-blur-sm"
          title={t("pd_share")}
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        {/* Favorite */}
        <button
          onClick={onToggleFavorite}
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg ${isFavorite ? "bg-red-500 text-white" : "bg-stone-900/80 text-stone-400 hover:text-red-400 backdrop-blur-sm"}`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
        </button>

        {/* Quick buy overlay on hover */}
        {product.suggested_sale_price && (
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={(e) => { e.stopPropagation(); onBuyNow(); }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-black py-2 rounded-xl uppercase tracking-wider transition-colors"
            >
              {t("cat_buy_now")}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="cursor-pointer" onClick={onSelect}>
          {product.brand && (
            <p className="text-[10px] text-stone-500 uppercase tracking-[0.15em] font-semibold mb-0.5">{product.brand}</p>
          )}
          <p className="text-sm font-semibold text-stone-100 line-clamp-2 leading-snug">{product.product_name}</p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1">
          {product.suggested_sale_price ? (
            <div>
              {promo && (
                <p className="text-[11px] text-stone-500 line-through leading-none mb-0.5">{promo.regularPrice} PLN</p>
              )}
              <p className="text-base font-black text-amber-400 leading-tight">{product.suggested_sale_price} <span className="text-xs font-normal text-stone-500">PLN</span></p>
            </div>
          ) : (
            <p className="text-xs text-stone-600 italic">{t("cat_on_request")}</p>
          )}
          {product.suggested_sale_price ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isInCart ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"}`}
              title={isInCart ? t("cat_in_cart") : t("cat_add_to_cart")}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onSelect}
              className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 hover:bg-stone-700 hover:text-white transition-all"
              title={t("cat_ask")}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}