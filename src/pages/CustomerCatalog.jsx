import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, LogOut, SlidersHorizontal, X, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CATEGORY_GROUPS, getCategoryLabel } from "@/lib/categoryConfig";
import ProductDetailModal from "@/components/catalog/ProductDetailModal";
import CustomerMessagesPanel from "@/components/catalog/CustomerMessagesPanel";

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const CONDITIONS = ["new", "like_new", "used"];

export default function CustomerCatalog() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMessages, setShowMessages] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["catalog_products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (p.status === "sold") return false;
      if (search && ![p.product_name, p.brand, p.category, p.subcategory].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
      if (priceMin !== "" && (p.suggested_sale_price ?? 0) < Number(priceMin)) return false;
      if (priceMax !== "" && (p.suggested_sale_price ?? 0) > Number(priceMax)) return false;
      return true;
    });
  }, [products, search, selectedCategories, selectedConditions, priceMin, priceMax]);

  const toggleCategory = (val) => setSelectedCategories(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  const toggleCondition = (val) => setSelectedConditions(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);

  const activeFiltersCount = selectedCategories.length + selectedConditions.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setPriceMin("");
    setPriceMax("");
  };

  const handleSendInquiry = async (product, message) => {
    await base44.entities.ProductInquiry.create({
      product_id: product.id,
      product_name: product.product_name,
      message,
      customer_name: user?.full_name || "",
      customer_email: user?.email || "",
      status: "new",
    });
    toast({ title: "Zapytanie wysłane!", description: "Skontaktujemy się z Tobą wkrótce." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Vintrix Market</span>
            <span className="text-xs text-slate-400 hidden sm:block">— Katalog produktów</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 hidden sm:block">Cześć, <strong>{user?.full_name}</strong></span>
            <Button variant="ghost" size="sm" onClick={() => setShowMessages(true)} className="gap-1.5 text-slate-500">
              <MessageCircle className="w-4 h-4" /> Wiadomości
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5 text-slate-500">
              <LogOut className="w-4 h-4" /> Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search bar + filter toggle */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Szukaj po nazwie, marce, kategorii..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(v => !v)} className="gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
            Filtry
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{activeFiltersCount}</span>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-slate-500 shrink-0">
              <X className="w-4 h-4" /> Wyczyść
            </Button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters */}
          {showFilters && (
            <aside className="w-64 shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-5 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                {/* Condition */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stan</p>
                  <div className="space-y-1">
                    {CONDITIONS.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedConditions.includes(c)} onChange={() => toggleCondition(c)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700">{CONDITION_LABELS[c]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cena (PLN)</p>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Od" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-8 text-sm" />
                    <Input type="number" placeholder="Do" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kategorie</p>
                  <div className="space-y-4">
                    {CATEGORY_GROUPS.map(group => (
                      <div key={group.group}>
                        <p className="text-xs font-medium text-slate-600 mb-1">{group.icon} {group.group}</p>
                        <div className="space-y-1 pl-1">
                          {group.items.map(item => (
                            <label key={item.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(item.value)}
                                onChange={() => toggleCategory(item.value)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-xs text-slate-700">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">
                Dostępne produkty
                <span className="ml-2 text-sm font-normal text-slate-400">({filtered.length})</span>
              </h1>
            </div>

            {/* Active filter chips */}
            {(selectedCategories.length > 0 || selectedConditions.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedConditions.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleCondition(c)}>
                    {CONDITION_LABELS[c]} <X className="w-3 h-3" />
                  </Badge>
                ))}
                {selectedCategories.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleCategory(c)}>
                    {getCategoryLabel(c)} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Brak produktów spełniających kryteria</p>
                {activeFiltersCount > 0 && (
                  <Button variant="link" onClick={clearFilters} className="text-emerald-600 mt-2">Wyczyść filtry</Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                      {product.status === "listed" && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Wystawiony</span>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="font-semibold text-sm text-slate-900 line-clamp-2">{product.product_name}</p>
                      <div className="flex flex-wrap gap-1">
                        {product.brand && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{product.brand}</span>}
                        <Badge variant="outline" className="text-[10px]">{CONDITION_LABELS[product.condition] || product.condition}</Badge>
                      </div>
                      {product.category && (
                        <p className="text-[10px] text-slate-400">{getCategoryLabel(product.category)}{product.size ? ` · r. ${product.size}` : ""}</p>
                      )}
                      {product.suggested_sale_price ? (
                        <p className="text-sm font-bold text-emerald-600">{product.suggested_sale_price} PLN</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Cena na zapytanie</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMessages && (
        <CustomerMessagesPanel user={user} onClose={() => setShowMessages(false)} />
      )}

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        user={user}
        onSendInquiry={handleSendInquiry}
      />
    </div>
  );
}