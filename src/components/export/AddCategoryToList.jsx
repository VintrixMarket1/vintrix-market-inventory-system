import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import CategoryTreePicker from "@/components/categories/CategoryTreePicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FolderPlus } from "lucide-react";
import { AVAILABLE_STATUSES } from "@/lib/allegroCsv";

export default function AddCategoryToList({ onAdd }) {
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("all");
  const [loading, setLoading] = useState(false);

  const add = async () => {
    setLoading(true);
    const statuses = availability === "all" ? AVAILABLE_STATUSES : [availability];
    const page = await base44.entities.Product.filter(
      { category, status: { $in: statuses } }, { limit: 2000 }
    ).finally(() => setLoading(false));
    onAdd((page.items || []).map(p => p.id));
  };

  return (
    <div className="space-y-3">
      <CategoryTreePicker value={category} onChange={setCategory} />
      <div className="flex gap-2">
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Na stanie + wystawione</SelectItem>
            <SelectItem value="in_stock">Tylko na stanie</SelectItem>
            <SelectItem value="listed">Tylko wystawione</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={!category || loading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Dodaj kategorię
        </Button>
      </div>
    </div>
  );
}