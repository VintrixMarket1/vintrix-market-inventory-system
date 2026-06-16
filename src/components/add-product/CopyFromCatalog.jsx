import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Copy, Check, Loader2, Package } from "lucide-react";

const generateSKU = (category) => {
  const prefix = (category || "other").slice(0, 3).toUpperCase();
  const num = Math.floor(Math.random() * 99999999).toString().padStart(8, "0");
  return `${prefix}-${num}`;
};

export default function CopyFromCatalog({ onSaved, onCancel }) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPalletId, setSelectedPalletId] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products_catalog_copy"],
    queryFn: () => base44.entities.Product.list(null, 2000),
  });

  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list("-created_date"),
  });

  const filtered = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.product_name || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.internal_code || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setNewSku(generateSKU(p.category));
    setNewPurchasePrice(p.purchase_price || "");
  };

  const handleCopy = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    const { id, created_date, updated_date, created_by_id, shopify_product_id, olx_listing_id, allegro_listing_id, vinted_listing_id, ebay_listing_id, ...rest } = selectedProduct;
    const copy = {
      ...rest,
      internal_code: newSku || generateSKU(selectedProduct.category),
      purchase_price: parseFloat(newPurchasePrice) || selectedProduct.purchase_price || 0,
      pallet_id: selectedPalletId || null,
      status: "in_stock",
      ai_analyzed: false,
      ai_verified: false,
      ai_analysis_result: null,
      reclassified_from_id: null,
      reclassified_to_id: null,
      dpt_document_id: null,
      dpt_document_number: null,
      wz_document_id: null,
      wz_document_number: null,
    };
    await base44.entities.Product.create(copy);
    // Update pallet status to sorting if needed
    if (selectedPalletId) {
      const pl = pallets.find(p => p.id === selectedPalletId);
      if (pl && (pl.status === "accepted" || pl.status === "active")) {
        await base44.entities.Pallet.update(selectedPalletId, { status: "sorting" });
      }
    }
    setSaving(false);
    setDone(true);
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setNewSku("");
    setNewPurchasePrice("");
    setSelectedPalletId("");
    setDone(false);
    setSearch("");
  };

  if (done) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-semibold">Produkt skopiowany!</h2>
        <p className="text-sm text-slate-500">
          <span className="font-medium">{selectedProduct?.product_name}</span> — nowy SKU: <span className="font-mono font-medium text-emerald-700">{newSku}</span>
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={handleReset}>Kopiuj kolejny</Button>
          <Button variant="outline" onClick={onCancel}>Wróć do inwentarza</Button>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          {selectedProduct.images?.[0] ? (
            <img src={selectedProduct.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover border border-emerald-200 shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-100 border flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{selectedProduct.product_name}</p>
            <p className="text-xs text-slate-500">{selectedProduct.brand} · {selectedProduct.category} · {selectedProduct.condition}</p>
            <p className="text-xs text-slate-400 font-mono">Oryginalny SKU: {selectedProduct.internal_code}</p>
          </div>
          <button onClick={() => setSelectedProduct(null)} className="text-xs text-slate-400 hover:text-slate-600 underline shrink-0">
            Zmień
          </button>
        </div>

        {selectedProduct.images?.length > 1 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Zdjęcia (zostaną skopiowane: {selectedProduct.images.length} szt.)</p>
            <div className="flex gap-2 flex-wrap">
              {selectedProduct.images.map((url, i) => (
                <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nowy SKU *</Label>
            <div className="flex gap-1.5">
              <Input
                value={newSku}
                onChange={e => setNewSku(e.target.value)}
                className="font-mono text-sm"
                placeholder="auto-generated"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setNewSku(generateSKU(selectedProduct.category))} title="Regeneruj SKU">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cena zakupu (PLN)</Label>
            <Input
              type="number"
              value={newPurchasePrice}
              onChange={e => setNewPurchasePrice(e.target.value)}
              placeholder={String(selectedProduct.purchase_price || "0.00")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Przypisz do palety</Label>
          <Select value={selectedPalletId} onValueChange={setSelectedPalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Brak palety" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Brak palety</SelectItem>
              {pallets.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.pallet_code} — {p.investor_name} ({p.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setSelectedProduct(null)}>Wróć</Button>
          <Button onClick={handleCopy} disabled={saving || !newSku} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Kopiowanie…" : "Skopiuj produkt"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie, marce, SKU, kategorii…"
          className="pl-9"
          autoFocus
        />
      </div>

      {loadingProducts ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-1 max-h-[480px] overflow-y-auto rounded-xl border border-slate-200">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Brak wyników</div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 border flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate text-sm">{p.product_name}</p>
                  <p className="text-xs text-slate-500">{p.brand && `${p.brand} · `}{p.category} · {p.condition}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.internal_code}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-700">{p.purchase_price?.toFixed(2)} PLN</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "in_stock" ? "bg-emerald-100 text-emerald-700" :
                    p.status === "listed" ? "bg-blue-100 text-blue-700" :
                    p.status === "sold" ? "bg-slate-100 text-slate-500" :
                    "bg-orange-100 text-orange-700"
                  }`}>{p.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}