import React, { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, LayoutGrid, List, Edit2, Trash2, MapPin, ShoppingBag } from "lucide-react";
import ProductCard from "../components/inventory/ProductCard";
import ProductForm from "../components/inventory/ProductForm";
import SearchFilters from "../components/inventory/SearchFilters";
import ListingForm from "../components/listings/ListingForm";
import SaleForm from "../components/sales/SaleForm";
import CsvImport from "../components/inventory/CsvImport";
import ShopifyProductImporter from "../components/shopify/ShopifyProductImporter";
import BulkActionsBar from "../components/inventory/BulkActionsBar";
import ShopifyBulkPublishModal from "../components/shopify/ShopifyBulkPublishModal";
import PalletSummaryCard from "../components/inventory/PalletSummaryCard";
import ConvertUnknownModal from "../components/inventory/ConvertUnknownModal";
import ReturnModal from "../components/inventory/ReturnModal";

export default function Inventory() {
  const { t } = useLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [listingProduct, setListingProduct] = useState(null);
  const [saleProduct, setSaleProduct] = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showShopifyImport, setShowShopifyImport] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [shopifyBulkProducts, setShopifyBulkProducts] = useState(null);
  const [convertProduct, setConvertProduct] = useState(null);
  const [returnProduct, setReturnProduct] = useState(null);

  const toggleBulkSelect = (id) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [filters, setFilters] = useState({ search: "", category: "all", subcategory: "all", status: "in_stock" });
  const [viewMode, setViewMode] = useState("grid");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  // Auto-open edit form when ?edit=<id> is in URL (e.g. coming from PalletDetail)
  useEffect(() => {
    if (products.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");
    if (editId) {
      const product = products.find(p => p.id === editId);
      if (product) {
        setEditProduct(product);
        setShowForm(true);
        // Clean up URL param without reload
        window.history.replaceState({}, "", "/Inventory");
      }
    }
  }, [products]);
  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list(),
  });
  const palletsMap = Object.fromEntries(pallets.map(p => [p.id, p]));

  // Palety nieskalkulowane (bez cen) — wyświetlane jako karty zbiorcze
  const unsettledPallets = pallets.filter(p => !["exploded", "processed", "closed"].includes(p.status));
  // IDs palet nieskalkulowanych — produkty z tych palet NIE trafiają na listę
  const unsettledPalletIds = new Set(unsettledPallets.map(p => p.id));

  const filtered = products.filter(p => {
    // Ukryj produkty z nieskalkulowanych palet — są reprezentowane przez kartę palety
    if (p.pallet_id && unsettledPalletIds.has(p.pallet_id)) return false;
    const isUnknown = p.product_name === "Nieznany produkt";
    // Filtr "unknown" pokazuje tylko nieznane; inne filtry ukrywają nieznane
    if (filters.status === "unknown") return isUnknown;
    if (isUnknown && filters.status !== "all") return false;
    const searchMatch = !filters.search || p.product_name?.toLowerCase().includes(filters.search.toLowerCase()) || p.internal_code?.toLowerCase().includes(filters.search.toLowerCase());
    const categoryMatch = filters.category === "all" || p.category === filters.category;
    const subcategoryMatch = !filters.subcategory || filters.subcategory === "all" || p.subcategory === filters.subcategory;
    const statusMatch = filters.status === "all" || (p.status || "in_stock") === filters.status;
    return searchMatch && categoryMatch && subcategoryMatch && statusMatch;
  });

  const handleDelete = async (product) => {
    if (!confirm(t("inv_delete_confirm"))) return;
    await base44.entities.Product.delete(product.id);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const exportCSV = () => {
    const headers = ["Code", "Name", "Category", "Condition", "Purchase Price", "Sale Price", "Status", "Location"];
    const rows = filtered.map(p => [
      p.internal_code, p.product_name, p.category, p.condition,
      p.purchase_price, p.suggested_sale_price, p.status || "in_stock",
      [p.warehouse_zone, p.shelf, p.box_number].filter(Boolean).join("/"),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["listings"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("inv_title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} {t("inv_products")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShopifyImport(true)} className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
            <ShoppingBag className="w-4 h-4" /> {t("inv_shopify")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> {t("inv_import_csv")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> {t("inv_export")}
          </Button>
          <div className="flex border rounded-md overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`px-2 py-1.5 ${viewMode === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`px-2 py-1.5 ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => navigate("/AddProduct")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> {t("inv_add_product")}
          </Button>
        </div>
      </div>

      <SearchFilters filters={filters} onChange={setFilters} />

      {/* Karty palet nieskalkulowanych */}
      {unsettledPallets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Palety w trakcie sortowania</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{unsettledPallets.length}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {unsettledPallets.map(pallet => {
              const palletProducts = products.filter(p => p.pallet_id === pallet.id);
              const totalUnits = palletProducts.reduce((sum, p) => sum + (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1), 0);
              return (
                <PalletSummaryCard key={pallet.id} pallet={pallet} productCount={totalUnits} />
              );
            })}
          </div>
          {filtered.length > 0 && <div className="border-t border-slate-200 mt-4 pt-2"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produkty na stanie</span></div>}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">{t("inv_no_products")}</p>
          <Button size="sm" onClick={() => navigate("/AddProduct")} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
            {t("inv_add_first")}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(product => (
            <div key={product.id}>
              <ProductCard
                product={product}
                onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
                onDelete={handleDelete}
                selected={bulkSelected.has(product.id)}
                onToggleSelect={toggleBulkSelect}
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
                  <Button size="sm" className="flex-1 text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setConvertProduct(product)}>
                    🔄 Konwertuj
                  </Button>
                )}
                {product.product_name !== "Nieznany produkt" && (product.status || "in_stock") !== "sold" && product.status !== "reclassified" && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setListingProduct(product)}>{t("inv_list")}</Button>
                )}
                {product.product_name !== "Nieznany produkt" && ((product.status || "in_stock") !== "sold" || (product.is_multi_item && product.stock_quantity > 0)) && product.status !== "reclassified" && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setSaleProduct(product)}>{t("inv_sell")}</Button>
                )}
                {product.status === "sold" && !product.is_multi_item && (
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setReturnProduct(product)}>↩ Zwrot</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(product => {
            const conditionColors = { new: "bg-emerald-50 text-emerald-700 border-emerald-200", like_new: "bg-blue-50 text-blue-700 border-blue-200", used: "bg-amber-50 text-amber-700 border-amber-200" };
            const statusColors = { in_stock: "bg-slate-100 text-slate-600", listed: "bg-purple-100 text-purple-700", sold: "bg-emerald-100 text-emerald-700" };
            const images = product.images || [];
            return (
              <div key={product.id} className={`bg-white border rounded-xl p-3 flex items-center gap-4 hover:shadow-md transition-all ${bulkSelected.has(product.id) ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"}`}>
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shadow cursor-pointer shrink-0 transition-all ${bulkSelected.has(product.id) ? "bg-emerald-500" : "bg-slate-100 hover:bg-slate-200"}`}
                  onClick={() => toggleBulkSelect(product.id)}
                >
                  {bulkSelected.has(product.id) && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                {/* Images strip */}
                <div className="flex gap-1 shrink-0 cursor-pointer" onClick={() => toggleBulkSelect(product.id)}>
                  {images.length > 0 ? images.slice(0, 4).map((url, i) => (
                    <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-2xl shrink-0">📦</div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">{product.product_name}</span>
                    <Badge variant="outline" className={`text-[10px] ${conditionColors[product.condition] || ""}`}>{product.condition?.replace("_", " ")}</Badge>
                    <Badge className={`text-[10px] ${statusColors[product.status] || statusColors.in_stock}`}>{(product.status || "in_stock").replace("_", " ")}</Badge>
                    {product.size && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t("inv_size")}: {product.size}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    <span className="font-mono text-slate-400">{product.internal_code}</span>
                    <span className="capitalize">{product.category}{product.subcategory ? ` › ${product.subcategory}` : ""}</span>
                    {(product.warehouse_zone || product.shelf || product.box_number) && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[product.warehouse_zone, product.shelf, product.box_number].filter(Boolean).join(" / ")}</span>
                    )}
                    {product.pallet_id && palletsMap[product.pallet_id] && (
                      <span className="text-slate-400">📦 {palletsMap[product.pallet_id].pallet_code}</span>
                    )}
                  </div>
                  {product.notes && <p className="text-xs text-slate-400 mt-1 truncate">{product.notes}</p>}
                </div>
                {/* Prices */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{t("inv_purchase")}</p>
                  <p className="text-sm font-bold text-slate-600">{product.purchase_price} PLN</p>
                  <p className="text-xs text-slate-400 mt-1">{t("inv_sale")}</p>
                  <p className="text-sm font-bold text-emerald-600">{product.suggested_sale_price || "—"} PLN</p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200">
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button onClick={() => handleDelete(product)} className="p-1.5 bg-slate-100 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                  {product.product_name === "Nieznany produkt" && product.status !== "reclassified" && (
                    <Button size="sm" className="text-xs h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setConvertProduct(product)}>🔄 Konwertuj</Button>
                  )}
                  {product.product_name !== "Nieznany produkt" && (product.status || "in_stock") !== "sold" && product.status !== "reclassified" && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setListingProduct(product)}>{t("inv_list")}</Button>
                  )}
                  {product.product_name !== "Nieznany produkt" && ((product.status || "in_stock") !== "sold" || (product.is_multi_item && product.stock_quantity > 0)) && product.status !== "reclassified" && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-emerald-600 border-emerald-200" onClick={() => setSaleProduct(product)}>{t("inv_sell")}</Button>
                  )}
                  {product.status === "sold" && !product.is_multi_item && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setReturnProduct(product)}>↩ Zwrot</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          product={editProduct}
          onSaved={refresh}
        />
      )}
      {listingProduct && (
        <ListingForm
          open={!!listingProduct}
          onClose={() => setListingProduct(null)}
          product={listingProduct}
          onSaved={refresh}
        />
      )}
      {saleProduct && (
        <SaleForm
          open={!!saleProduct}
          onClose={() => setSaleProduct(null)}
          product={saleProduct}
          onSaved={refresh}
        />
      )}
      {showCsvImport && (
        <CsvImport
          open={showCsvImport}
          onClose={() => setShowCsvImport(false)}
          pallets={pallets}
          onImported={refresh}
        />
      )}
      {showShopifyImport && (
        <ShopifyProductImporter
          open={showShopifyImport}
          onClose={() => setShowShopifyImport(false)}
        />
      )}
      {bulkSelected.size > 0 && (
        <BulkActionsBar
          selectedIds={bulkSelected}
          allProducts={products}
          pallets={pallets}
          onClear={() => setBulkSelected(new Set())}
          onListSelected={(ids) => {
            const first = products.find(p => p.id === ids[0]);
            if (first) { setListingProduct(first); setBulkSelected(new Set()); }
          }}
          onShopifyPublish={(ids) => {
            const selected = products.filter(p => ids.includes(p.id));
            setShopifyBulkProducts(selected);
          }}
        />
      )}
      {shopifyBulkProducts && (
        <ShopifyBulkPublishModal
          open={!!shopifyBulkProducts}
          onClose={() => setShopifyBulkProducts(null)}
          products={shopifyBulkProducts}
          onDone={() => { refresh(); setBulkSelected(new Set()); setShopifyBulkProducts(null); }}
        />
      )}
      {returnProduct && (
        <ReturnModal
          product={returnProduct}
          onClose={() => setReturnProduct(null)}
          onReturned={() => { refresh(); setReturnProduct(null); }}
        />
      )}
      {convertProduct && (
        <ConvertUnknownModal
          product={convertProduct}
          pallet={palletsMap[convertProduct.pallet_id]}
          palletProductCount={products.filter(p => p.pallet_id === convertProduct.pallet_id).length}
          user={user}
          onClose={() => setConvertProduct(null)}
          onConverted={() => { refresh(); setConvertProduct(null); }}
        />
      )}
    </div>
  );
}