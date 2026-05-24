import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, LayoutGrid, List, Edit2, Trash2, MapPin } from "lucide-react";
import ProductCard from "../components/inventory/ProductCard";
import ProductForm from "../components/inventory/ProductForm";
import SearchFilters from "../components/inventory/SearchFilters";
import ListingForm from "../components/listings/ListingForm";
import SaleForm from "../components/sales/SaleForm";
import CsvImport from "../components/inventory/CsvImport";

export default function Inventory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [listingProduct, setListingProduct] = useState(null);
  const [saleProduct, setSaleProduct] = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [filters, setFilters] = useState({ search: "", category: "all", subcategory: "all", status: "all" });
  const [viewMode, setViewMode] = useState("grid");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });
  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list(),
  });
  const palletsMap = Object.fromEntries(pallets.map(p => [p.id, p]));

  const filtered = products.filter(p => {
    const searchMatch = !filters.search || p.product_name?.toLowerCase().includes(filters.search.toLowerCase()) || p.internal_code?.toLowerCase().includes(filters.search.toLowerCase());
    const categoryMatch = filters.category === "all" || p.category === filters.category;
    const subcategoryMatch = !filters.subcategory || filters.subcategory === "all" || p.subcategory === filters.subcategory;
    const statusMatch = filters.status === "all" || (p.status || "in_stock") === filters.status;
    return searchMatch && categoryMatch && subcategoryMatch && statusMatch;
  });

  const handleDelete = async (product) => {
    if (!confirm("Delete this product?")) return;
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
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Export
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
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      <SearchFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">No products found</p>
          <Button size="sm" onClick={() => navigate("/AddProduct")} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
            Add your first product
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
              />
              {product.pallet_id && palletsMap[product.pallet_id] && (
                <div className="mt-1 px-1">
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    📦 {palletsMap[product.pallet_id].pallet_code}
                  </span>
                </div>
              )}
              <div className="flex gap-1 mt-1.5">
                {(product.status || "in_stock") !== "sold" && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setListingProduct(product)}>List</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setSaleProduct(product)}>Sell</Button>
                  </>
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
              <div key={product.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-4 hover:shadow-md transition-all">
                {/* Images strip */}
                <div className="flex gap-1 shrink-0">
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
                    {product.size && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Rozmiar: {product.size}</span>}
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
                  <p className="text-xs text-slate-400">Zakup</p>
                  <p className="text-sm font-bold text-slate-600">{product.purchase_price} PLN</p>
                  <p className="text-xs text-slate-400 mt-1">Sprzedaż</p>
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
                  {(product.status || "in_stock") !== "sold" && (
                    <>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setListingProduct(product)}>List</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-emerald-600 border-emerald-200" onClick={() => setSaleProduct(product)}>Sell</Button>
                    </>
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
    </div>
  );
}