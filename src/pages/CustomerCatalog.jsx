import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, LogOut, SlidersHorizontal, X, MessageCircle, ShoppingCart, Heart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CATEGORY_GROUPS, getCategoryLabel } from "@/lib/categoryConfig";
import ProductDetailModal from "@/components/catalog/ProductDetailModal";
import CustomerMessagesPanel from "@/components/catalog/CustomerMessagesPanel";
import CartPanel from "@/components/catalog/CartPanel";
import CheckoutModal from "@/components/catalog/CheckoutModal";
import { useCart, CartProvider } from "@/lib/CartContext.jsx";

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const CONDITIONS = ["new", "like_new", "used"];

function CustomerCatalog() {
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
  const [showCart, setShowCart] = useState(false);
  const [directCheckoutProduct, setDirectCheckoutProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const { addToCart, isInCart, cartItems } = useCart();

  const queryClient = useQueryClient();
  const { data: favorites = [] } = useQuery({
    queryKey: ["my_favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const favoriteProductIds = new Set(favorites.map(f => f.product_id));

  const toggleFavorite = async (product, e) => {
    e.stopPropagation();
    const isFav = favoriteProductIds.has(product.id);
    if (isFav) {
      const fav = favorites.find(f => f.product_id === product.id);
      if (fav) {
        await base44.entities.Favorite.delete(fav.id);
      }
    } else {
      await base44.entities.Favorite.create({
        product_id: product.id,
        product_name: product.product_name,
        customer_name: user?.full_name || "",
        customer_email: user?.email || "",
      });
      // Notify admin
      await base44.entities.AdminNotification.create({
        type: "favorite",
        title: "Nowe polubienie produktu",
        message: `${user?.full_name || user?.email || "Klient"} dodał "${product.product_name}" do ulubionych.`,
        product_id: product.id,
        product_name: product.product_name,
        customer_name: user?.full_name || "",
        customer_email: user?.email || "",
        is_read: false,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["my_favorites"] });
  };

  const { data: products = [] } = useQuery({
    queryKey: ["catalog_products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (p.status === "sold") return false;
      if (search && ![p.product_name, p.brand, p.category, p.subcategory].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
      if (priceMin !== "" && (p.suggested_sale_price ?? 0) < Number(priceMin)) return false;
      if (priceMax !== "" && (p.suggested_sale_price ?? 0) > Number(priceMax)) return false;
      return true;
    });
    if (activeTab === "favorites") {
      result = result.filter(p => favoriteProductIds.has(p.id));
    }
    return result;
  }, [products, search, selectedCategories, selectedConditions, priceMin, priceMax, activeTab, favoriteProductIds]);

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
    // Notify admin
    await base44.entities.AdminNotification.create({
      type: "new_inquiry",
      title: "Nowe zapytanie o produkt",
      message: `${user?.full_name || user?.email || "Klient"} pyta o "${product.product_name}".`,
      product_id: product.id,
      product_name: product.product_name,
      customer_name: user?.full_name || "",
      customer_email: user?.email || "",
      is_read: false,
    });
    toast({ title: "Zapytanie wysłane!", description: "Skontaktujemy się z Tobą wkrótce." });
  };

  const buildDirectOffer = (product) => ({
    id: `direct_${product.id}`,
    product_id: product.id,
    product_name: product.product_name,
    offered_price: product.suggested_sale_price || 0,
    status: "accepted",
    customer_name: user?.full_name || "",
    customer_email: user?.email || "",
  });

  const FiltersContent = () => (
    <div className="space-y-5">
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
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cena (PLN)</p>
        <div className="flex gap-2">
          <Input type="number" placeholder="Od" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-9 text-sm" />
          <Input type="number" placeholder="Do" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
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
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile filter drawer overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">Filtry</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs rounded-full px-2 py-0.5">{activeFiltersCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-sm text-emerald-600 font-medium">Wyczyść</button>
                )}
                <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <FiltersContent />
            </div>
            <div className="p-4 border-t border-slate-100 shrink-0">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowFilters(false)}>
                Pokaż wyniki ({filtered.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm sm:text-base">Vintrix</span>
            <span className="text-xs text-slate-400 hidden sm:block">— Katalog</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 hidden sm:block mr-1">Cześć, <strong>{user?.full_name?.split(" ")[0]}</strong></span>
            <Button variant="ghost" size="icon" onClick={() => setShowMessages(true)} className="w-9 h-9 text-slate-500 relative" title="Wiadomości">
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowCart(true)} className="w-9 h-9 text-slate-500 relative" title="Koszyk">
              <ShoppingCart className="w-4 h-4" />
              {cartItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none font-bold">{cartItems.length}</span>
              )}
            </Button>
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 ml-1">
              <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5 text-slate-500 text-xs">
                <LogOut className="w-4 h-4" /> Wyloguj
              </Button>
            </span>
            <Button variant="ghost" size="icon" onClick={() => logout()} className="w-9 h-9 text-slate-500 sm:hidden" title="Wyloguj">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-1 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "all" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden xs:inline">Wszystkie</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] rounded-full px-1.5 py-0.5 leading-none">{filtered.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "favorites" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Heart className="w-4 h-4" />
            <span className="hidden xs:inline">Polubione</span>
            <span className="bg-red-100 text-red-600 text-[10px] rounded-full px-1.5 py-0.5 leading-none">{favoriteProductIds.size}</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9 h-10" placeholder="Szukaj po nazwie, marce..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(v => !v)} className="gap-1.5 shrink-0 h-10 px-3">
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtry</span>
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{activeFiltersCount}</span>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0 h-10 w-10 text-slate-500" title="Wyczyść filtry">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar filters */}
          {showFilters && (
            <aside className="w-64 shrink-0 hidden md:block">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-[7.5rem] max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-sm text-slate-800">Filtry</span>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-emerald-600 font-medium hover:underline">Wyczyść</button>
                  )}
                </div>
                <FiltersContent />
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base sm:text-xl font-bold text-slate-900">
                {activeTab === "favorites" ? "Polubione" : "Produkty"}
                <span className="ml-2 text-sm font-normal text-slate-400">({filtered.length})</span>
              </h1>
            </div>

            {(selectedCategories.length > 0 || selectedConditions.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedConditions.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => toggleCondition(c)}>
                    {CONDITION_LABELS[c]} <X className="w-3 h-3" />
                  </Badge>
                ))}
                {selectedCategories.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 cursor-pointer text-xs" onClick={() => toggleCategory(c)}>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                {filtered.map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group flex flex-col"
                  >
                    <div className="aspect-square bg-slate-100 overflow-hidden relative cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(product, e)}
                        className={`absolute top-1.5 right-1.5 z-10 rounded-full p-1.5 shadow-md border transition-all ${favoriteProductIds.has(product.id) ? "bg-red-500 border-red-500 text-white" : "bg-white/90 border-slate-200 text-slate-400 hover:text-red-500"}`}
                      >
                        <Heart className={`w-3 h-3 ${favoriteProductIds.has(product.id) ? "fill-current" : ""}`} />
                      </button>
                      {product.status === "listed" && (
                        <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Wyst.</span>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 space-y-1 flex-1 flex flex-col cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      <p className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">{product.product_name}</p>
                      <div className="flex flex-wrap gap-1">
                        {product.brand && <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{product.brand}</span>}
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1">{CONDITION_LABELS[product.condition] || product.condition}</Badge>
                      </div>
                      {product.suggested_sale_price ? (
                        <p className="text-sm font-bold text-emerald-600 mt-auto pt-1">{product.suggested_sale_price} PLN</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-auto pt-1">Na zapytanie</p>
                      )}
                    </div>
                    {product.suggested_sale_price && (
                      <div className="px-2 sm:px-3 pb-2 sm:pb-3 grid grid-cols-2 gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="h-7 sm:h-8 text-[10px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 px-1"
                          onClick={() => setDirectCheckoutProduct(product)}
                        >
                          Kup
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 sm:h-8 text-[10px] sm:text-xs px-1 ${isInCart(product.id) ? "border-emerald-400 text-emerald-600" : "border-slate-300 text-slate-600"}`}
                          onClick={() => { addToCart(product); setShowCart(true); }}
                        >
                          {isInCart(product.id) ? "✓ Koszyk" : "+ Koszyk"}
                        </Button>
                      </div>
                    )}
                    {!product.suggested_sale_price && (
                      <div className="px-2 sm:px-3 pb-2 sm:pb-3" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="w-full h-7 sm:h-8 text-[10px] sm:text-xs border-slate-300 text-slate-600" onClick={() => setSelectedProduct(product)}>
                          <MessageCircle className="w-3 h-3 mr-1" /> Zapytaj
                        </Button>
                      </div>
                    )}
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

      {showCart && (
        <CartPanel user={user} onClose={() => setShowCart(false)} />
      )}

      {directCheckoutProduct && (
        <CheckoutModal
          offer={buildDirectOffer(directCheckoutProduct)}
          onClose={() => setDirectCheckoutProduct(null)}
        />
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

export default function CustomerCatalogWrapper() {
  return (
    <CartProvider>
      <CustomerCatalog />
    </CartProvider>
  );
}