import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShoppingBag, Search, Download, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ShopifyProductImporter({ open, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [fetched, setFetched] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getShopifyProducts", { limit: 100 });
      setProducts(res.data?.products || []);
      setFetched(true);
      setSelected(new Set());
    } catch (err) {
      toast({ title: "Błąd", description: err?.response?.data?.error || err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const filtered = products.filter(p =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.vendor?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.shopify_id)));
    }
  };

  const importSelected = async () => {
    const toImport = products.filter(p => selected.has(p.shopify_id));
    if (!toImport.length) return;
    setImporting(true);
    let imported = 0;
    for (const p of toImport) {
      const shopifyNumericId = p.shopify_id.replace("gid://shopify/Product/", "");
      await base44.entities.Product.create({
        product_name: p.title,
        brand: p.vendor || "",
        category: "other",
        condition: "new",
        purchase_price: parseFloat(p.price) || 0,
        suggested_sale_price: parseFloat(p.price) || 0,
        images: p.images || [],
        listing_description: p.description || "",
        shopify_product_id: shopifyNumericId,
        status: "in_stock",
        notes: `Zaimportowano ze Shopify. SKU: ${p.sku || "—"}, Typ: ${p.product_type || "—"}`,
      });
      imported++;
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Zaimportowano", description: `Dodano ${imported} produktów ze Shopify` });
    setImporting(false);
    onClose();
  };

  const statusColor = (s) => {
    if (s === "ACTIVE") return "bg-emerald-100 text-emerald-700";
    if (s === "DRAFT") return "bg-slate-100 text-slate-600";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Importuj produkty ze Shopify
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {!fetched ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <ShoppingBag className="w-12 h-12 text-slate-300" />
              <p className="text-slate-500 text-sm">Kliknij poniżej, aby pobrać produkty z Shopify</p>
              <Button onClick={fetchProducts} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Pobierz produkty
              </Button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Szukaj po tytule, marce, SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare className="w-4 h-4 mr-1" />
                    : <Square className="w-4 h-4 mr-1" />}
                  {selected.size === filtered.length && filtered.length > 0 ? "Odznacz" : "Zaznacz"} wszystkie
                </Button>
                <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </div>

              <p className="text-xs text-slate-500">{filtered.length} produktów · {selected.size} zaznaczonych</p>

              {/* Product list */}
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {filtered.map(p => (
                  <div
                    key={p.shopify_id}
                    onClick={() => toggleSelect(p.shopify_id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(p.shopify_id) ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Checkbox checked={selected.has(p.shopify_id)} onCheckedChange={() => toggleSelect(p.shopify_id)} onClick={e => e.stopPropagation()} />
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded-md flex-shrink-0 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.vendor}{p.sku ? ` · SKU: ${p.sku}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.price && <span className="text-sm font-semibold text-slate-800">{parseFloat(p.price).toFixed(2)} PLN</span>}
                      <Badge className={`text-[10px] px-1.5 ${statusColor(p.status)}`}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={onClose}>Anuluj</Button>
                <Button
                  onClick={importSelected}
                  disabled={selected.size === 0 || importing}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Importuj {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}