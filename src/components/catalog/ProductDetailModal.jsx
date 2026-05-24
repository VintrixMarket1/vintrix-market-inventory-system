import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const categoryColors = {
  clothing: "bg-blue-100 text-blue-700",
  shoes: "bg-purple-100 text-purple-700",
  accessories: "bg-pink-100 text-pink-700",
  electronics: "bg-yellow-100 text-yellow-700",
  home: "bg-orange-100 text-orange-700",
  toys: "bg-red-100 text-red-700",
  sports: "bg-green-100 text-green-700",
  books: "bg-teal-100 text-teal-700",
  other: "bg-slate-100 text-slate-600",
};

const statusColors = {
  in_stock: "bg-blue-100 text-blue-700",
  listed: "bg-emerald-100 text-emerald-700",
  sold: "bg-amber-100 text-amber-700",
};

const conditionLabels = {
  new: "Nowy",
  like_new: "Jak nowy",
  used: "Używany",
};

export default function ProductDetailModal({ product, onClose }) {
  if (!product) return null;

  const images = product.images || [];

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
            {product.product_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Images */}
          {images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-36 h-36 object-cover rounded-lg flex-shrink-0 border border-slate-200"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-300" />
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`${categoryColors[product.category] || "bg-slate-100 text-slate-600"}`}>
              {product.category}
            </Badge>
            {product.subcategory && (
              <Badge className="bg-slate-100 text-slate-500">{product.subcategory}</Badge>
            )}
            {product.gender && product.gender !== "none" && (
              <Badge className="bg-indigo-100 text-indigo-700">{product.gender}</Badge>
            )}
            <Badge className={statusColors[product.status || "in_stock"]}>
              {product.status || "in_stock"}
            </Badge>
            {product.condition && (
              <Badge className="bg-slate-100 text-slate-600">{conditionLabels[product.condition] || product.condition}</Badge>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {product.brand && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Marka</p>
                <p className="font-medium text-slate-800">{product.brand}</p>
              </div>
            )}
            {product.internal_code && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Kod SKU</p>
                <p className="font-mono text-slate-700">{product.internal_code}</p>
              </div>
            )}
            {product.size && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Rozmiar</p>
                <p className="font-medium text-slate-800">{product.size}</p>
              </div>
            )}
            {product.color && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Kolor</p>
                <p className="font-medium text-slate-800">{product.color}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Cena zakupu</p>
              <p className="font-semibold text-slate-900">{product.purchase_price} PLN</p>
            </div>
            {product.suggested_sale_price && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Cena sprzedaży</p>
                <p className="font-semibold text-emerald-700">{product.suggested_sale_price} PLN</p>
              </div>
            )}
            {product.warehouse_zone && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Strefa magazynowa</p>
                <p className="font-medium text-slate-800">{product.warehouse_zone}</p>
              </div>
            )}
            {product.shelf && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Półka</p>
                <p className="font-medium text-slate-800">{product.shelf}</p>
              </div>
            )}
            {product.box_number && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Nr pudełka</p>
                <p className="font-medium text-slate-800">{product.box_number}</p>
              </div>
            )}
            {product.barcode && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Barcode</p>
                <p className="font-mono text-slate-700">{product.barcode}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {product.notes && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Notatki</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{product.notes}</p>
            </div>
          )}

          {/* Listing description */}
          {product.listing_description && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Opis oferty</p>
              <div
                className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.listing_description }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}