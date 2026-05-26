import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, ShoppingBag, CheckSquare, Square, AlertCircle, CheckCircle } from "lucide-react";

export default function ShopifyBulkPublishModal({ open, onClose, products, onDone }) {
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSelectedCollections([]);
    setLoadingCollections(true);
    base44.functions.invoke("getShopifyCollections", {}).then(res => {
      setCollections(res.data?.collections || []);
      setLoadingCollections(false);
    }).catch(() => setLoadingCollections(false));
  }, [open]);

  const toggleCollection = (id) => {
    setSelectedCollections(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);
    const res = await base44.functions.invoke("bulkPublishToShopify", {
      product_ids: products.map(p => p.id),
      collection_ids: selectedCollections,
    });
    setPublishing(false);
    if (res.data?.success) {
      setResult({ type: "success", successCount: res.data.successCount, totalCount: res.data.totalCount });
      onDone?.();
    } else {
      setResult({ type: "error", message: res.data?.error || "Nieznany błąd" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            Publikuj {products?.length} produktów na Shopify
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            {result.type === "success" ? (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg text-emerald-700">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Opublikowano pomyślnie!</p>
                  <p className="text-sm">{result.successCount} z {result.totalCount} produktów zostało wysłanych do Shopify.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{result.message}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={onClose}>Zamknij</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-slate-600 mb-3">
                Wybierz kolekcje, do których zostaną przypisane produkty (opcjonalnie):
              </p>

              {loadingCollections ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pobieranie kolekcji...
                </div>
              ) : collections.length === 0 ? (
                <p className="text-sm text-slate-400 py-2 text-center">Brak kolekcji w sklepie Shopify</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                  {collections.map(col => {
                    const selected = selectedCollections.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleCollection(col.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors ${selected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"}`}
                      >
                        {selected ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                        <span className="flex-1">{col.title}</span>
                        <span className="text-xs text-slate-400">{col.type === "smart" ? "smart" : "custom"}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedCollections.length > 0 && (
                <p className="text-xs text-emerald-600 mt-2">{selectedCollections.length} kolekcji zaznaczonych</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={publishing}>Anuluj</Button>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                {publishing ? "Publikowanie..." : `Publikuj ${products?.length} produktów`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}