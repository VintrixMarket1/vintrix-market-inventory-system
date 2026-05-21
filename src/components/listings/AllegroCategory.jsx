import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Loader2, FolderOpen, Tag } from "lucide-react";

export default function AllegroCategory({ value, onChange }) {
  const [path, setPath] = useState([]); // [{id, name}] breadcrumb
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load root categories on mount
  useEffect(() => {
    loadCategories(null);
  }, []);

  const loadCategories = async (parentId) => {
    setLoading(true);
    const res = await base44.functions.invoke("getAllegroLeafCategories", { parent_id: parentId });
    setCategories(res.data?.categories || []);
    setLoading(false);
  };

  const handleSelect = async (cat) => {
    if (cat.leaf) {
      onChange(cat.id, cat.name, [...path, cat]);
    } else {
      setPath(prev => [...prev, { id: cat.id, name: cat.name }]);
      await loadCategories(cat.id);
    }
  };

  const handleBreadcrumb = async (index) => {
    const newPath = path.slice(0, index + 1);
    const parentId = index >= 0 ? path[index].id : null;
    setPath(newPath);
    await loadCategories(parentId);
  };

  const handleRoot = async () => {
    setPath([]);
    await loadCategories(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b px-3 py-2 flex items-center gap-1 flex-wrap text-xs">
        <button onClick={handleRoot} className="text-orange-600 hover:underline font-medium">Allegro</button>
        {path.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <button onClick={() => handleBreadcrumb(i)} className="text-orange-600 hover:underline">{p.name}</button>
          </span>
        ))}
      </div>

      {/* Selected category badge */}
      {value && (
        <div className="px-3 py-2 bg-orange-50 border-b flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs text-orange-700 font-medium">Wybrano: ID {value}</span>
          <button onClick={() => onChange(null, null, [])} className="ml-auto text-xs text-slate-400 hover:text-red-500">✕ Zmień</button>
        </div>
      )}

      {/* Category list */}
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          </div>
        ) : (
          <ul className="divide-y">
            {categories.map(cat => (
              <li key={cat.id}>
                <button
                  onClick={() => handleSelect(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${cat.leaf ? "text-slate-800" : "text-slate-600"}`}
                >
                  <span className="flex items-center gap-2">
                    {cat.leaf ? (
                      <Tag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    {cat.name}
                  </span>
                  {cat.leaf ? (
                    <Badge className="text-[10px] h-4 bg-green-100 text-green-700 border-green-200 px-1">Wybierz</Badge>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-400">Brak podkategorii</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}