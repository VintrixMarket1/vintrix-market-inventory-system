import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Plus, Check, Loader2 } from "lucide-react";
import { AVAILABLE_STATUSES } from "@/lib/allegroCsv";

const STATUS_LABEL = { in_stock: "Na stanie", listed: "Wystawiony" };

export default function AddProductToList({ existingIds, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const page = await base44.entities.Product.filter({
        status: { $in: AVAILABLE_STATUSES },
        $or: [{ product_name: { $regex: q, $options: "i" } }, { internal_code: { $regex: q, $options: "i" } }, { brand: { $regex: q, $options: "i" } }],
      }, { limit: 50 }).finally(() => setLoading(false));
      setResults(page.items || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-2">
      <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj produktu po nazwie, SKU lub marce..." />
      {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      {results.length > 0 && (
        <div className="border border-slate-100 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
          {results.map(p => {
            const added = existingIds.includes(p.id);
            return (
              <button key={p.id} disabled={added} onClick={() => onAdd([p.id])}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50">
                <span className="flex-1 truncate">{p.product_name} <span className="text-slate-400">{p.internal_code}</span></span>
                <span className="text-xs text-slate-500">{STATUS_LABEL[p.status]}</span>
                {added ? <Check className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}