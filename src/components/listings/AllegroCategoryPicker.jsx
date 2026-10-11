import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2, FolderOpen, Tag, Search } from "lucide-react";

// Module-level cache — the tree (~20k rows) is loaded once per session
let categoriesCache = null;
let cachePromise = null;

function loadCategories() {
  if (categoriesCache) return Promise.resolve(categoriesCache);
  if (!cachePromise) {
    cachePromise = base44.entities.AllegroCategory.filter(
      {},
      { limit: 25000, fields: ["dzial", "full_path", "category_id", "ean_status"] }
    ).then(page => {
      categoriesCache = page.items || [];
      return categoriesCache;
    });
  }
  return cachePromise;
}

const EAN_BADGE = {
  WYMAGANY: { label: "EAN wymagany", className: "bg-red-100 text-red-700 border-red-200" },
  WARUNKOWO: { label: "EAN warunkowo", className: "bg-amber-100 text-amber-700 border-amber-200" },
  OPCJONALNY: { label: "EAN opcjonalnie", className: "bg-slate-100 text-slate-600 border-slate-200" },
  "BRAK PARAMETRU EAN": null,
};

export default function AllegroCategoryPicker({ value, valuePath, onChange }) {
  const [all, setAll] = useState(categoriesCache || []);
  const [loading, setLoading] = useState(!categoriesCache);
  const [query, setQuery] = useState("");
  const [path, setPath] = useState([]); // breadcrumb names, e.g. ["Dom i Ogród", "Budownictwo i Akcesoria"]

  useEffect(() => {
    if (categoriesCache) return;
    loadCategories().then(items => {
      setAll(items);
      setLoading(false);
    });
  }, []);

  const dzialy = useMemo(() => {
    const set = new Set(all.map(r => r.dzial));
    return [...set].sort((a, b) => a.localeCompare(b, "pl"));
  }, [all]);

  // Children at current browse level
  const children = useMemo(() => {
    if (query.trim().length >= 2) return null; // search mode
    const prefix = path.length ? path.join(" > ") + " > " : "";
    const map = new Map();
    for (const r of all) {
      if (prefix && !r.full_path.startsWith(prefix)) continue;
      const rest = r.full_path.slice(prefix.length);
      if (!rest) continue;
      const seg = rest.split(" > ")[0];
      const isLeaf = !rest.includes(" > ");
      let entry = map.get(seg);
      if (!entry) {
        entry = { name: seg, folders: 0, leafCount: 0, leaf: null, ean: null };
        map.set(seg, entry);
      }
      if (isLeaf) {
        entry.leafCount++;
        if (!entry.leaf) {
          entry.leaf = r;
          entry.ean = r.ean_status;
        }
      } else {
        entry.folders++;
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [all, path, query]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    const matches = [];
    for (const r of all) {
      if (r.full_path.toLowerCase().includes(q)) matches.push(r);
      if (matches.length >= 60) break;
    }
    return matches;
  }, [all, query]);

  const selectLeaf = (r) => {
    onChange(r.category_id, r.full_path);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Search box */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-white">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Szukaj kategorii (np. buty nike, kurtka damska)..."
          className="w-full text-sm outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">✕</button>
        )}
      </div>

      {/* Selected category */}
      {value && (
        <div className="px-3 py-2 bg-emerald-50 border-b flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs text-emerald-800 font-medium truncate flex-1">
            {valuePath || `ID ${value}`}
          </span>
          <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-emerald-200 px-1">ID: {value}</Badge>
          <button onClick={() => onChange(null, null)} className="text-xs text-slate-400 hover:text-red-500 shrink-0">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> Wczytywanie drzewa kategorii...
        </div>
      ) : query.trim().length >= 2 ? (
        /* Search results */
        <div className="max-h-64 overflow-y-auto divide-y">
          {searchResults.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-400 text-center">Brak wyników</p>
          ) : (
            searchResults.map(r => (
              <button
                key={r.category_id}
                onClick={() => selectLeaf(r)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left"
              >
                <span className="text-slate-700 truncate">{r.full_path}</span>
                {EAN_BADGE[r.ean_status] && (
                  <Badge className={`text-[10px] h-4 shrink-0 border px-1 ${EAN_BADGE[r.ean_status].className}`}>
                    {EAN_BADGE[r.ean_status].label}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <div className="bg-slate-50 border-b px-3 py-2 flex items-center gap-1 flex-wrap text-xs">
            <button onClick={() => setPath([])} className="text-orange-600 hover:underline font-medium">
              {path.length === 0 ? "Allegro — wybierz dział" : "Wszystkie działy"}
            </button>
            {path.map((p, i) => (
              <span key={`${p}-${i}`} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <button onClick={() => setPath(path.slice(0, i + 1))} className="text-orange-600 hover:underline">
                  {p}
                </button>
              </span>
            ))}
          </div>

          {/* Level list */}
          <div className="max-h-64 overflow-y-auto divide-y">
            {children.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-400 text-center">Brak podkategorii</p>
            ) : (
              children.map(entry => {
                const isFolder = entry.folders > 0;
                return (
                  <button
                    key={entry.name}
                    onClick={() => (isFolder ? setPath([...path, entry.name]) : selectLeaf(entry.leaf))}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isFolder ? (
                        <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <Tag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      )}
                      <span className={isFolder ? "text-slate-600" : "text-slate-800"}>{entry.name}</span>
                    </span>
                    {isFolder ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <Badge className="text-[10px] h-4 bg-green-100 text-green-700 border-green-200 px-1 shrink-0">
                        Wybierz
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Dział quick-jump on root */}
          {path.length === 0 && (
            <div className="bg-slate-50 border-t px-3 py-2 text-[10px] text-slate-400">
              {dzialy.length} działów · {all.length.toLocaleString("pl-PL")} kategorii końcowych
            </div>
          )}
        </>
      )}
    </div>
  );
}