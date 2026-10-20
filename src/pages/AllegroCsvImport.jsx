import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import CategoryTreePicker from "@/components/categories/CategoryTreePicker";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2, AlertTriangle, FileSpreadsheet } from "lucide-react";

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const CONDITION_LABELS = { new: "Nowy", like_new: "Używany", used: "Używany" };

export default function AllegroCsvImport() {
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCategory = async (cat) => {
    setCategory(cat);
    setLoading(true);
    setProducts(null);
    const page = await base44.entities.Product.filter(
      { category: cat, status: { $in: ["in_stock", "listed"] } },
      { sort: "-created_date", limit: 1000 }
    ).finally(() => setLoading(false));
    setProducts(page.items || []);
  };

  const generateCsv = () => {
    const headers = ["sku", "nazwa", "marka", "rozmiar", "kolor", "stan", "ean", "cena", "ilosc", "kategoria_allegro_id", "opis", "zdjecia"];
    const rows = products.map(p => [
      p.internal_code, p.listing_title || p.product_name, p.brand, p.size, p.color,
      CONDITION_LABELS[p.condition], p.barcode, p.suggested_sale_price,
      p.is_multi_item ? (p.stock_quantity || 0) : 1, p.allegro_category_id,
      p.listing_description, (p.images || []).join("|"),
    ]);
    const lines = [headers, ...rows].map(r => r.map(csvCell).join(";"));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allegro-${category}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Plik wygenerowany", description: `Produktów: ${products.length}` });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allegro — eksport produktów do CSV</h1>
        <p className="text-sm text-slate-500 mt-1">Wybierz kategorię z systemu, a aplikacja wygeneruje plik CSV z produktami z magazynu w tej kategorii.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <CategoryTreePicker value={category} onChange={(v) => loadCategory(v)} />
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Wczytuję produkty…</div>
        )}
        {products && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {getCategoryLabel(category)} — produktów: <span className="font-semibold">{products.length}</span>
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Brak dostępnych produktów w tej kategorii.</p>
            ) : (
              <>
                <div className="border border-slate-100 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {products.map(p => (
                    <div key={p.id} className="px-3 py-2 text-sm flex justify-between gap-3">
                      <span className="truncate text-slate-800">{p.listing_title || p.product_name}</span>
                      <span className="text-slate-500 shrink-0">{p.suggested_sale_price ? `${p.suggested_sale_price} zł` : "—"}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={generateCsv} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-4 h-4" /> Generuj plik CSV
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}