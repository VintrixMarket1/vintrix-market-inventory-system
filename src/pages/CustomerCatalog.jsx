import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LogOut, LogIn, SlidersHorizontal, X, MessageCircle, ShoppingCart, Heart, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLang } from "@/lib/i18n";
import { CATEGORY_GROUPS, getCategoryLabel, getCategoryGroupLabel } from "@/lib/categoryConfig";
import ProductDetailModal from "@/components/catalog/ProductDetailModal";
import CustomerMessagesPanel from "@/components/catalog/CustomerMessagesPanel";
import CartPanel from "@/components/catalog/CartPanel";
import CheckoutModal from "@/components/catalog/CheckoutModal";
import { useCart, CartProvider } from "@/lib/CartContext.jsx";

const CONDITIONS = ["new", "like_new", "used"];
const CONDITION_COLORS = { new: "bg-emerald-900/60 text-emerald-300", like_new: "bg-sky-900/60 text-sky-300", used: "bg-stone-700/60 text-stone-300" };

function CustomerCatalog() {
  const { user, logout, navigateToLogin } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLang();

  const requireAuth = () => {
    if (!user) {
      navigateToLogin();
      return false;
    }
    return true;
  };

  const condLabels = { new: t("cond_new"), like_new: t("cond_like_new"), used: t("cond_used") };

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
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
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
    if (!requireAuth()) return;
    const isFav = favoriteProductIds.has(product.id);
    if (isFav) {
      const fav = favorites.find(f => f.product_id === product.id);
      if (fav) await base44.entities.Favorite.delete(fav.id);
    } else {
      await base44.entities.Favorite.create({
        product_id: product.id, product_name: product.product_name,
        customer_name: user?.full_name || "", customer_email: user?.email || "",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["my_favorites"] });
  };

  const { data: products = [] } = useQuery({
    queryKey: ["catalog_products"],
    queryFn: () => base44.entities.Product.filter({ ai_verified: true, status: { $in: ["in_stock", "listed"] } }, "-created_date", 5000),
  });

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const nameLower = (p.product_name || "").toLowerCase();
      if (nameLower.includes("nieznany") || nameLower.includes("unknown")) return false;
      if (p.internal_code?.startsWith("UNK-")) return false;
      if (p.status === "sold" || p.status === "reclassified") return false;
      if (search && ![p.product_name, p.brand, p.category, p.subcategory].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) return false;
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false;
      if (priceMin !== "" && (p.suggested_sale_price ?? 0) < Number(priceMin)) return false;
      if (priceMax !== "" && (p.suggested_sale_price ?? 0) > Number(priceMax)) return false;
      return true;
    });
    if (activeTab === "favorites") result = result.filter(p => favoriteProductIds.has(p.id));
    return result;
  }, [products, search, selectedCategories, selectedConditions, priceMin, priceMax, activeTab, favoriteProductIds]);

  // Reset do pierwszej strony przy zmianie filtrów / wyszukiwania
  useEffect(() => { setPage(1); }, [search, selectedCategories, selectedConditions, priceMin, priceMax, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleCategory = (val) => setSelectedCategories(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  const toggleCondition = (val) => setSelectedConditions(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  const activeFiltersCount = selectedCategories.length + selectedConditions.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0);
  const clearFilters = () => { setSelectedCategories([]); setSelectedConditions([]); setPriceMin(""); setPriceMax(""); };

  const handleSendInquiry = async (product, message) => {
    if (!requireAuth()) return;
    await base44.entities.ProductInquiry.create({
      product_id: product.id, product_name: product.product_name,
      message, customer_name: user?.full_name || "", customer_email: user?.email || "", status: "new",
    });
    toast({ title: t("cat_inquiry_sent"), description: t("cat_contact_soon") });
  };

  const handleShare = async (product, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("pd_share_copied") });
    } catch {}
  };

  const buildDirectOffer = (product) => ({
    id: `direct_${product.id}`,
    product_id: product.id, product_name: product.product_name,
    offered_price: product.suggested_sale_price || 0,
    status: "accepted", customer_name: user?.full_name || "", customer_email: user?.email || "",
  });

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.2em] mb-3">{t("cat_condition")}</p>
        <div className="space-y-2">
          {CONDITIONS.map(c => (
            <div key={c} onClick={() => toggleCondition(c)} className="flex items-center gap-3 cursor-pointer group touch-manipulation">
              <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${selectedConditions.includes(c) ? "bg-amber-500 border-amber-500" : "border-stone-600 group-hover:border-stone-400"}`}>
                {selectedConditions.includes(c) && <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm text-stone-300 group-hover:text-white transition-colors">{condLabels[c]}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.2em] mb-3">{t("cat_price_range")}</p>
        <div className="flex gap-2">
          <input type="number" placeholder={t("cat_price_from")} value={priceMin} onChange={e => setPriceMin(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg px-3 py-2 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500" />
          <input type="number" placeholder={t("cat_price_to")} value={priceMax} onChange={e => setPriceMax(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 text-stone-200 rounded-lg px-3 py-2 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.2em] mb-3">{t("cat_categories")}</p>
        <div className="space-y-4">
          {CATEGORY_GROUPS.map(group => (
            <div key={group.group}>
              <p className="text-xs text-stone-500 mb-2">{group.icon} {getCategoryGroupLabel(group.group, lang)}</p>
              <div className="space-y-1.5 pl-1">
                {group.items.map(item => (
                  <div key={item.value} onClick={() => toggleCategory(item.value)} className="flex items-center gap-3 cursor-pointer group touch-manipulation">
                    <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${selectedCategories.includes(item.value) ? "bg-amber-500 border-amber-500" : "border-stone-600 group-hover:border-stone-400"}`}>
                      {selectedCategories.includes(item.value) && <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-xs text-stone-400 group-hover:text-stone-200 transition-colors">{getCategoryLabel(item.value, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-stone-900 rounded-t-3xl max-h-[88vh] flex flex-col border-t border-stone-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white tracking-wide">{t("cat_filters")}</span>
                {activeFiltersCount > 0 && <span className="bg-amber-500 text-black text-xs font-bold rounded-full px-2 py-0.5">{activeFiltersCount}</span>}
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && <button onClick={clearFilters} className="text-sm text-amber-400 font-medium">{t("cat_clear")}</button>}
                <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 touch-manipulation">
                  <X className="w-5 h-5 text-stone-300" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 flex-1"><FiltersContent /></div>
            <div className="p-4 border-t border-stone-800 shrink-0">
              <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-colors touch-manipulation" onClick={() => setShowFilters(false)}>
                {t("cat_show_results")} ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-950/90 backdrop-blur-xl border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-lg font-black tracking-[0.15em] text-white uppercase">Vintrix</div>
            <div className="hidden sm:block w-px h-4 bg-stone-600" />
            <div className="hidden sm:block text-xs text-stone-500 tracking-[0.2em] uppercase font-light">{t("cat_premium_catalog")}</div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
              placeholder={t("cat_search_placeholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {user && (
              <span className="hidden md:block text-xs text-stone-500 mr-2">
                {t("cat_hello")}, <span className="text-stone-200 font-medium">{user?.full_name?.split(" ")[0]}</span>
              </span>
            )}
            {user && (
              <button onClick={() => setShowMessages(true)} className="relative p-2.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all" title={t("cat_messages")}>
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setShowCart(true)} className="relative p-2.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all" title={t("cat_cart")}>
              <ShoppingCart className="w-5 h-5" />
              {cartItems.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{cartItems.length}</span>
              )}
            </button>
            {user ? (
              <button onClick={() => logout()} className="p-2.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all" title={t("cat_logout")}>
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => navigateToLogin()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all" title={t("cat_login")}>
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t("cat_login")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500"
            placeholder={t("cat_search_placeholder_short")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 border-t border-stone-800/50">
          {[
            { key: "all", label: t("cat_all"), count: filtered.length },
            { key: "favorites", label: t("cat_favorites"), count: favoriteProductIds.size },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase border-b-2 transition-all ${activeTab === tab.key ? "border-amber-500 text-amber-400" : "border-transparent text-stone-500 hover:text-stone-300"}`}
            >
              {tab.key === "favorites" && <Heart className={`w-3.5 h-3.5 ${activeTab === "favorites" ? "fill-current" : ""}`} />}
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "bg-stone-800 text-stone-500"}`}>{tab.count}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter + results bar */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showFilters || activeFiltersCount > 0 ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("cat_filters")}
              {activeFiltersCount > 0 && <span className="bg-amber-500 text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{activeFiltersCount}</span>}
            </button>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors">
                <X className="w-3.5 h-3.5" /> {t("cat_clear")}
              </button>
            )}
          </div>
          <p className="text-xs text-stone-500 tracking-wide">{filtered.length} {t("cat_products_count")}</p>
        </div>

        {/* Active filter chips */}
        {(selectedConditions.length > 0 || selectedCategories.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedConditions.map(c => (
              <button key={c} onClick={() => toggleCondition(c)} className="flex items-center gap-1.5 bg-stone-800 text-stone-300 text-xs px-3 py-1.5 rounded-full border border-stone-700 hover:border-stone-500 transition-all">
                {condLabels[c]} <X className="w-3 h-3" />
              </button>
            ))}
            {selectedCategories.map(c => (
              <button key={c} onClick={() => toggleCategory(c)} className="flex items-center gap-1.5 bg-stone-800 text-stone-300 text-xs px-3 py-1.5 rounded-full border border-stone-700 hover:border-stone-500 transition-all">
                {getCategoryLabel(c, lang)} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          {showFilters && (
            <aside className="w-60 shrink-0 hidden md:block">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sticky top-[8.5rem] max-h-[calc(100vh-9rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-stone-300 uppercase tracking-[0.15em]">{t("cat_filters")}</span>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">{t("cat_clear")}</button>
                  )}
                </div>
                <FiltersContent />
              </div>
            </aside>
          )}

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-28">
                <div className="text-6xl mb-4 opacity-20">◈</div>
                <p className="text-stone-500 text-sm tracking-wide">{t("cat_no_results")}</p>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="mt-4 text-amber-400 text-sm hover:underline">{t("cat_clear_filters")}</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {paged.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={favoriteProductIds.has(product.id)}
                    isInCart={isInCart(product.id)}
                    onSelect={() => setSelectedProduct(product)}
                    onToggleFavorite={(e) => toggleFavorite(product, e)}
                    onAddToCart={() => { addToCart(product); if (requireAuth()) setShowCart(true); }}
                    onBuyNow={() => { if (requireAuth()) setDirectCheckoutProduct(product); }}
                    onShare={(e) => handleShare(product, e)}
                    condLabels={condLabels}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Paginacja */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Poprzednia
              </button>
              <span className="text-sm text-stone-400 tracking-wide">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-stone-900 border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-400"
              >
                Następna
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {showMessages && <CustomerMessagesPanel user={user} onClose={() => setShowMessages(false)} />}
      {showCart && <CartPanel user={user} onClose={() => setShowCart(false)} />}
      {directCheckoutProduct && (
        <CheckoutModal offer={buildDirectOffer(directCheckoutProduct)} onClose={() => setDirectCheckoutProduct(null)} />
      )}
      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} user={user} onSendInquiry={handleSendInquiry} />
    </div>
  );
}

function ProductCard({ product, isFavorite, isInCart, onSelect, onToggleFavorite, onAddToCart, onBuyNow, onShare, condLabels, t }) {
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
            <p className="text-base font-black text-amber-400">{product.suggested_sale_price} <span className="text-xs font-normal text-stone-500">PLN</span></p>
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

export default function CustomerCatalogWrapper() {
  return (
    <CartProvider>
      <CustomerCatalog />
    </CartProvider>
  );
}