import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { SUBCATEGORIES } from "@/lib/subcategories";

const categories = ["all", "clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];
const statuses = ["all", "in_stock", "listed", "sold", "unknown"];

export default function SearchFilters({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  const subcategories = filters.category && filters.category !== "all"
    ? SUBCATEGORIES[filters.category] || []
    : [];

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search products..."
          value={filters.search}
          onChange={e => update("search", e.target.value)}
        />
      </div>
      <Select value={filters.category} onValueChange={v => { onChange({ ...filters, category: v, subcategory: "all" }); }}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map(c => (
            <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {subcategories.length > 0 && (
        <Select value={filters.subcategory || "all"} onValueChange={v => update("subcategory", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcategories</SelectItem>
            {subcategories.map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={filters.status} onValueChange={v => update("status", v)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map(s => {
            const labels = { all: "Wszystkie", in_stock: "Na stanie", listed: "Wystawione", sold: "Sprzedane", unknown: "Nieznane" };
            return <SelectItem key={s} value={s}>{labels[s] || s}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );
}