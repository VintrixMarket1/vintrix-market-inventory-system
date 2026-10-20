import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import AllegroCategoryPicker from "@/components/listings/AllegroCategoryPicker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2, AlertTriangle, FileSpreadsheet } from "lucide-react";

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const CONDITION_LABELS = { new: "Nowy", like_new: "Używany", used: "Używany" };

// Dopasowanie parametrów Allegro do pól produktu po nazwie parametru
function paramValue(p, product) {
  const n = (p.name || "").toLowerCase();
  if (n === "marka") return product.brand;
  if (n.startsWith("rozmiar")) return product.size;
  if (n.startsWith("kolor")) return product.color;
  if (n === "stan") return CONDITION_LABELS[product.condition];
  if (n === "ean (gtin)" || n === "ean") return product.barcode;
  return "";
}

export default function AllegroCsvImport() {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [categoryPath, setCategoryPath] = useState("");
  const [params, setParams] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCategory = async (id) => {
    setLoading(true);
    setParams(null);
    setProducts([]);
    try {
      const [res, page] = await Promise.all([
        base44.functions.invoke("getAllegroParameters", { category_id: id }),
        base44.entities.Product.filter(
          { allegro_category_id: id, status: { $in: ["in_stock", "listed"] } },
          { sort: "-created_date", limit: 1000 }
        ),
      ]);
      setParams(res.parameters || []);
      setProducts(page.items || []);
    } catch (e) {
      toast({ title: "Błąd", description: e?.message || "Nie udało się wczytać kategorii", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateCsv = () => {
    const baseCols = ["sku", "nazwa", "ean", "cena", "ilosc", "stan", "opis", "zdjecia"];
    const headers = [...baseCols, ...params.map(p => `${p.name}${p.required ? " *" : ""}`)];
    const rows = products.map(pr => [
      pr.internal_code,
      pr.listing_title || pr.product_name,
      pr.barcode,
      pr.suggested_sale_price,
      pr.is_multi_item ? (pr.stock_quantity || 0) : 1,
      CONDITION_LABELS[pr.condition],
      pr.listing_description,
      (pr.images || []).join("|"),
      ...params.map(p => paramValue(p, pr)),
    ]);
    const lines = [headers, ...rows].map(r => r.map(csvCell).join(";"));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allegro-${categoryPath.replace(/[<>"/]/g, "").slice(0, 60) || categoryId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Plik wygenerowany", description: `Produktów: ${products.length}` });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allegro — eksport produktów do CSV</h1>
        <p className="text-sm text-slate-500 mt-1">
          Wybierz kategorię Allegro, a system wygeneruje plik CSV z produktami z magazynu przypisanymi do tej kategorii, z kolumnami parametrów kategorii.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <AllegroCategoryPicker
          value={categoryId}
          valuePath={categoryPath}
          onChange={(id, fullPath) => {
            setCategoryId(id || "");
            setCategoryPath(fullPath || "");
            if (id) loadCategory(id);
            else { setParams(null); setProducts([]); }
          }}
        />
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Wczytuję produkty i parametry…</div>
        )}
        {params && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Produkty w tej kategorii: <span className="font-semibold">{products.length}</span>
              · parametry: <span className="font-semibold">{params.length}</span> ({params.filter(p => p.required).length} wymaganych, oznaczone *)
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Brak produktów w magazynie przypisanych do tej kategorii Allegro.</p>
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