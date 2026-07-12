import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { CATEGORY_GROUPS, getCategoryLabel } from "@/lib/categoryConfig";
import { useLang } from "@/lib/i18n";
import ProductDetailModal from "@/components/catalog/ProductDetailModal";

const genders = ["all", "men", "women", "unisex", "kids", "none"];

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

export default function ProductModels() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [gender, setGender] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { lang } = useLang();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const filtered = products.filter(p => {
    const nameLower = (p.product_name || "").toLowerCase();
    if (nameLower.includes("nieznany") || nameLower.includes("unknown")) return false;
    if (p.internal_code?.startsWith("UNK-")) return false;
    if (!p.ai_verified) return false;
    const searchMatch = !search ||
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.internal_code?.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = category === "all" || p.category === category;
    const genderMatch = gender === "all" || (p.gender || "none") === gender;
    return searchMatch && categoryMatch && genderMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Product Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">{filtered.length} products</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, brand or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="h-9 w-48 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All categories</option>
          {CATEGORY_GROUPS.map(group => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map(item => (
                <option key={item.value} value={item.value}>{getCategoryLabel(item.value, lang)}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={gender}
          onChange={e => setGender(e.target.value)}
          className="h-9 w-36 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {genders.map(g => (
            <option key={g} value={g}>{g === "all" ? "All genders" : g}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(product => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-xl border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              {/* Image */}
              <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-10 h-10 text-slate-300" />
                )}
              </div>
              {/* Info */}
              <div className="p-3 space-y-1.5">
                <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{product.product_name}</p>
                {product.brand && <p className="text-xs text-slate-500 truncate">{product.brand}</p>}
                <p className="text-[10px] text-slate-400 font-mono">{product.internal_code}</p>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge className={`text-[10px] px-1.5 ${categoryColors[product.category] || "bg-slate-100 text-slate-600"}`}>
                    {getCategoryLabel(product.category, lang)}
                  </Badge>
                  {product.subcategory && (
                    <Badge className="text-[10px] px-1.5 bg-slate-100 text-slate-500">
                      {product.subcategory}
                    </Badge>
                  )}
                  <Badge className={`text-[10px] px-1.5 ${statusColors[product.status || "in_stock"]}`}>
                    {product.status || "in_stock"}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-700">{product.purchase_price} PLN</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}