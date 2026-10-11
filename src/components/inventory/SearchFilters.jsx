import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useLang } from "@/lib/i18n";
import CategorySelectButton from "@/components/categories/CategorySelectButton";

export default function SearchFilters({ filters, onChange, pallets = [] }) {
  const { t, lang } = useLang();
  const update = (key, value) => onChange({ ...filters, [key]: value });

  const statusLabels = {
    all: t("status_all"),
    in_stock: t("status_in_stock"),
    listed: t("status_listed"),
    sold: t("status_sold"),
    unknown: t("status_unknown"),
  };

  const selectClass = "h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder={t("inv_search_placeholder")}
          value={filters.search}
          onChange={e => update("search", e.target.value)}
        />
      </div>
      <CategorySelectButton
        value={filters.category !== "all" ? filters.category : ""}
        subcategory={filters.subcategory && filters.subcategory !== "all" ? filters.subcategory : ""}
        showSubcategories
        placeholder={t("inv_all_categories")}
        onChange={(c, s) => onChange({ ...filters, category: c || "all", subcategory: s || "all" })}
        className="w-full sm:w-56"
      />
      {pallets.length > 0 && (
        <select
          value={filters.pallet_id || "all"}
          onChange={e => update("pallet_id", e.target.value)}
          className={`${selectClass} w-full sm:w-44`}
        >
          <option value="all">{t("inv_all_pallets")}</option>
          {pallets.map(p => (
            <option key={p.id} value={p.id}>{p.pallet_code} — {p.investor_name}</option>
          ))}
        </select>
      )}
      <select
        value={filters.status}
        onChange={e => update("status", e.target.value)}
        className={`${selectClass} w-full sm:w-36`}
      >
        {Object.entries(statusLabels).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
      <select
        value={filters.sortBy || "newest"}
        onChange={e => update("sortBy", e.target.value)}
        className={`${selectClass} w-full sm:w-40`}
      >
        <option value="newest">{t("sort_newest")}</option>
        <option value="pallet">{t("sort_pallet")}</option>
        <option value="name">{t("sort_name")}</option>
        <option value="price_asc">{t("sort_price_asc")}</option>
        <option value="price_desc">{t("sort_price_desc")}</option>
      </select>
    </div>
  );
}