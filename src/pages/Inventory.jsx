import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
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
  const [filters, setFilters] = useState({ search: "", category: "all", status: "all" });

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
    const statusMatch = filters.status === "all" || (p.status || "in_stock") === filters.status;
    return searchMatch && categoryMatch && statusMatch;
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
      ) : (
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
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => setListingProduct(product)}>
                      List
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setSaleProduct(product)}>
                      Sell
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
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