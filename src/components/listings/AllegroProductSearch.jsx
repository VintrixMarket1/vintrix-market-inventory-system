import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, CheckCircle, Package, X } from "lucide-react";

export default function AllegroProductSearch({ categoryId, onSelect, selectedProduct }) {
  const [phrase, setPhrase] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phrase.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await base44.functions.invoke("searchAllegroProducts", {
      phrase: phrase.trim(),
      category_id: categoryId || undefined,
    });
    setResults(res.data?.products || []);
    setLoading(false);
  };

  if (selectedProduct) {
    return (
      <div className="border rounded-lg p-3 bg-green-50 border-green-200 flex items-start gap-3">
        {selectedProduct.images?.[0] && (
          <img src={selectedProduct.images[0]} alt="" className="w-12 h-12 object-contain rounded border bg-white shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-xs font-semibold text-green-800">Produkt z katalogu wybrany</span>
          </div>
          <p className="text-xs text-slate-700 truncate">{selectedProduct.name}</p>
          <p className="text-[10px] text-slate-400">ID: {selectedProduct.id}</p>
        </div>
        <button onClick={() => onSelect(null)} className="text-slate-400 hover:text-red-500 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={phrase}
          onChange={e => setPhrase(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Wyszukaj produkt w katalogu Allegro..."
          className="text-sm h-9"
        />
        <Button onClick={handleSearch} disabled={loading || !phrase.trim()} size="sm" className="h-9 bg-orange-500 hover:bg-orange-600 text-white shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {searched && !loading && (
        <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              <Package className="w-6 h-6 mx-auto mb-1 opacity-40" />
              Brak wyników. Spróbuj innej frazy.
            </div>
          ) : (
            <ul className="divide-y">
              {results.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelect(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-orange-50 text-left transition-colors"
                  >
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-10 h-10 object-contain rounded border bg-white shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded border bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.category?.name || ""} · ID: {p.id}</p>
                    </div>
                    <Badge className="text-[10px] h-4 bg-orange-100 text-orange-700 border-orange-200 px-1 shrink-0">Wybierz</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}