import React, { useState } from "react";
import { useCart } from "@/lib/CartContext.jsx";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, Trash2, Package } from "lucide-react";
import CheckoutModal from "./CheckoutModal";

export default function CartPanel({ user, onClose }) {
  const { cartItems, removeFromCart, cartTotal } = useCart();
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  // For cart checkout we create a synthetic "offer" object from the product's listed price
  const buildSyntheticOffer = (product) => ({
    id: `direct_${product.id}`,
    product_id: product.id,
    product_name: product.product_name,
    offered_price: product.suggested_sale_price || 0,
    status: "accepted", // treat as accepted for checkout
    customer_name: user?.full_name || "",
    customer_email: user?.email || "",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
      <div className="w-full max-w-md h-full bg-slate-50 flex flex-col shadow-2xl">
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-slate-900">Koszyk</h2>
              <p className="text-xs text-slate-400">{cartItems.length} {cartItems.length === 1 ? "produkt" : "produkty/ów"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Koszyk jest pusty</p>
              <p className="text-slate-400 text-xs mt-1">Dodaj produkty klikając "Kup teraz"</p>
            </div>
          ) : (
            cartItems.map(({ product }) => (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {product.images?.[0]
                    ? <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-400" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{product.product_name}</p>
                  <p className="text-emerald-600 font-bold text-sm mt-0.5">
                    {product.suggested_sale_price ? `${product.suggested_sale_price} PLN` : "Cena na zapytanie"}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 px-3"
                    onClick={() => setCheckoutProduct(product)}
                    disabled={!product.suggested_sale_price}
                  >
                    Zapłać
                  </Button>
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-4 shrink-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-600">Łącznie (bez dostawy)</span>
              <span className="font-bold text-lg text-emerald-700">{cartTotal.toFixed(2)} PLN</span>
            </div>
            <p className="text-xs text-slate-400 text-center">Każdy produkt opłacany osobno — kliknij "Zapłać" przy wybranym</p>
          </div>
        )}
      </div>

      {checkoutProduct && (
        <CheckoutModal
          offer={buildSyntheticOffer(checkoutProduct)}
          onClose={() => setCheckoutProduct(null)}
        />
      )}
    </div>
  );
}