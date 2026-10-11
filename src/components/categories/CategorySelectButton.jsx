import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, FolderTree } from "lucide-react";
import CategoryTreePicker from "@/components/categories/CategoryTreePicker";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { useLang } from "@/lib/i18n";

export default function CategorySelectButton({ value, subcategory, onChange, showSubcategories = false, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();

  const label = value
    ? (subcategory ? `${getCategoryLabel(value, lang)} › ${subcategory}` : getCategoryLabel(value, lang))
    : (placeholder || (lang === "pl" ? "Wybierz kategorię..." : "Select category..."));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-white text-sm shadow-sm hover:bg-slate-50 transition-colors ${className}`}
        >
          <FolderTree className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`truncate flex-1 text-left ${value ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-80 p-0">
        <CategoryTreePicker
          value={value}
          subcategory={subcategory}
          showSubcategories={showSubcategories}
          onChange={(c, s) => {
            onChange(c, s);
            if (!showSubcategories || !c) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}