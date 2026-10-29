import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

export default function OlxCategoryPicker({ productId, defaultQuery, onPick }) {
  const [q, setQ] = useState(defaultQuery || "");
  const [cats, setCats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    setLoading(true); setError("");
    const res = await base44.functions.invoke("publishToOlx", { mode: "search_categories", product_ids: [productId], q })
      .catch((e) => ({ error: e.response?.data?.error || e.message }));
    setLoading(false);
    if (res.error) return setError(res.error);
    setCats(res.data.categories);
  };

  const pick = async (c) => {
    setLoading(true); setError("");
    const res = await base44.functions.invoke("publishToOlx", { mode: "category_fields", product_ids: [productId], category_id: c.id })
      .catch((e) => ({ error: e.response?.data?.error || e.message }));
    setLoading(false);
    if (res.error) return setError(res.error);
    onPick({ category_id: c.id, category_path: c.path, fields: res.data.fields });
  };

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Szukaj kategorii OLX, np. lusterko boczne" className="h-8 text-sm" />
        <Button size="sm" variant="outline" onClick={search} disabled={loading || !q.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {cats && !cats.length && <p className="text-xs text-muted-foreground">Brak kategorii z Przesyłką OLX dla tej frazy.</p>}
      {cats?.map((c) => (
        <button key={c.id} onClick={() => pick(c)} disabled={loading} className="block w-full text-left text-xs rounded px-2 py-1.5 hover:bg-background">
          {c.path}
        </button>
      ))}
    </div>
  );
}