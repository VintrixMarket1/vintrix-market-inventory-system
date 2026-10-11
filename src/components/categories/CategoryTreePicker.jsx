import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Check } from "lucide-react";
import { CATEGORY_GROUPS, SUBCATEGORIES_BY_CATEGORY, getCategoryLabel, getCategoryGroupLabel } from "@/lib/categoryConfig";
import { useLang } from "@/lib/i18n";

export default function CategoryTreePicker({ value, subcategory, onChange, showSubcategories = false, maxHeight = "max-h-72", className = "" }) {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const groupOfValue = CATEGORY_GROUPS.find(g => g.items.some(i => i.value === value));
  const [openGroup, setOpenGroup] = useState(groupOfValue?.group || null);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const visibleGroups = useMemo(() => {
    if (!searching) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS
      .map(g => ({
        ...g,
        items: g.items.filter(i =>
          getCategoryLabel(i.value, lang).toLowerCase().includes(q) ||
          i.label.toLowerCase().includes(q) ||
          (SUBCATEGORIES_BY_CATEGORY[i.value] || []).some(s => s.toLowerCase().includes(q))
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [q, searching, lang]);

  const renderItem = (item, withGroup = false) => {
    const selected = value === item.value;
    return (
      <div key={item.value}>
        <button
          type="button"
          onClick={() => onChange(item.value, "")}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${selected ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600 hover:bg-slate-50"}`}
        >
          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
            {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </span>
          <span className="truncate">{getCategoryLabel(item.value, lang)}</span>
          {withGroup && <span className="text-[10px] text-slate-400 shrink-0">{getCategoryGroupLabel(item.group, lang)}</span>}
        </button>
        {selected && showSubcategories && (SUBCATEGORIES_BY_CATEGORY[item.value] || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-8 pr-2 pb-2 pt-0.5">
            {(SUBCATEGORIES_BY_CATEGORY[item.value] || []).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(item.value, subcategory === s ? "" : s)}
                className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${subcategory === s ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`border border-input rounded-lg overflow-hidden bg-white ${className}`}>
      <div className="relative p-2 border-b border-slate-100">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={lang === "pl" ? "Szukaj kategorii..." : "Search categories..."}
          className="h-8 pl-8 text-sm"
        />
      </div>
      <div className={`overflow-y-auto p-1.5 ${maxHeight}`}>
        {visibleGroups.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {lang === "pl" ? "Brak wyników" : "No results"}
          </p>
        ) : searching ? (
          <div className="space-y-0.5">
            {visibleGroups.flatMap(g => g.items.map(item => renderItem(item, true)))}
          </div>
        ) : (
          visibleGroups.map(g => (
            <div key={g.group} className="mb-0.5">
              <button
                type="button"
                onClick={() => setOpenGroup(openGroup === g.group ? null : g.group)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left"
              >
                {openGroup === g.group
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className="text-base leading-none">{g.icon}</span>
                <span className="text-sm font-medium text-slate-700 flex-1">{getCategoryGroupLabel(g.group, lang)}</span>
                <span className="text-[10px] text-slate-400">{g.items.length}</span>
              </button>
              {openGroup === g.group && (
                <div className="ml-4 border-l border-slate-100 pl-1">
                  {g.items.map(item => renderItem(item))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}