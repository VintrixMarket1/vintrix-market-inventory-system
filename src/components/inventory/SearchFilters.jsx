import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getCategoryLabel, getCategoryGroupLabel, CATEGORY_GROUPS, SUBCATEGORIES_BY_CATEGORY } from "@/lib/categoryConfig";

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

  // Legacy category values for the top-level filter
  const legacyCategories = [
    { value: "clothing", group: "Odzież" },
    { value: "shoes", group: "Obuwie" },
    { value: "accessories", group: "Akcesoria" },
    { value: "electronics", group: "Elektronika" },
    { value: "home", group: "Dom i ogród" },
    { value: "toys", group: "Zabawki" },
    { value: "sports", group: "Sport" },
    { value: "books", group: "Książki" },
    { value: "other", group: "Inne" },
  ];

  const subcategories = filters.category && filters.category !== "all"
    ? SUBCATEGORIES_BY_CATEGORY[filters.category] || []
    : [];

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
      <Select value={filters.category} onValueChange={v => { onChange({ ...filters, category: v, subcategory: "all" }); }}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t("pf_category")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("inv_all_categories")}</SelectItem>
          {legacyCategories.map(c => (
            <SelectItem key={c.value} value={c.value}>{getCategoryLabel(c.value, lang)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {subcategories.length > 0 && (
        <Select value={filters.subcategory || "all"} onValueChange={v => update("subcategory", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("pf_subcategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inv_all_subcategories")}</SelectItem>
            {subcategories.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {pallets.length > 0 && (
        <Select value={filters.pallet_id || "all"} onValueChange={v => update("pallet_id", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("pf_pallet")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inv_all_pallets")}</SelectItem>
            {pallets.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.pallet_code} — {p.investor_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={filters.status} onValueChange={v => update("status", v)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder={t("inv_status")} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([val, label]) => (
            <SelectItem key={val} value={val}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}