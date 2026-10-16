import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Search, Plus, Trash2, Save, Loader2, Lock, CheckCircle2, AlertTriangle, PackageSearch, ArrowLeft } from "lucide-react";

const emptyItem = (p) => ({
  product_id: p.id,
  product_name: p.product_name,
  image: (p.images && p.images[0]) || null,
  internal_code: p.internal_code || "",
  is_multi_item: !!p.is_multi_item,
  system_quantity: p.is_multi_item ? (p.stock_quantity || 0) : 1,
  actual_quantity: p.is_multi_item ? (p.stock_quantity || 0) : 1,
  warehouse_zone: p.warehouse_zone || "",
  shelf: p.shelf || "",
  box_number: p.box_number || "",
});

export default function InventorySetDetail({ set, onBack }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOpen = set.status === "open";

  const [items, setItems] = useState(() =>
    (set.items || []).map((i) => ({ ...i, actual_quantity: i.actual_quantity ?? i.system_quantity }))
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Miniaturki dla starszych pozycji bez zapisanego zdjęcia — jedno zapytanie o obrazy
  const { data: itemImages = {} } = useQuery({
    queryKey: ["inventory_set_item_images", set.id],
    queryFn: async () => {
      const ids = (set.items || []).map((i) => i.product_id).filter(Boolean);
      if (ids.length === 0) return {};
      const page = await base44.entities.Product.filter(
        { id: { $in: ids } },
        { limit: 500, fields: ["images"] }
      );
      const map = {};
      page.items.forEach((p) => {
        if (p.images && p.images.length > 0) map[p.id] = p.images[0];
      });
      return map;
    },
  });
  const imgFor = (item) => item.image || itemImages[item.product_id] || null;

  const term = search.trim();
  const { data: candidates = [], isFetching: isSearching } = useQuery({
    queryKey: ["inventory_set_candidates", term],
    enabled: isOpen && term.length >= 2,
    queryFn: async () => {
      const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const page = await base44.entities.Product.filter(
        {
          status: { $in: ["in_stock", "listed"] },
          product_name: { $ne: "Nieznany produkt" },
          $or: [
            { product_name: { $regex: esc, $options: "i" } },
            { internal_code: { $regex: esc, $options: "i" } },
          ],
        },
        { limit: 50, fields: ["product_name", "internal_code", "warehouse_zone", "shelf", "box_number", "is_multi_item", "stock_quantity", "images"] }
      );
      return page.items;
    },
  });

  const addItem = (p) => {
    if (items.some((i) => i.product_id === p.id)) {
      toast({ title: "Produkt jest już w zestawie", variant: "destructive" });
      return;
    }
    setItems((prev) => [...prev, emptyItem(p)]);
    setSearch("");
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const applyToWarehouse = async () => {
    setSaving(true);
    try {
      if (items.length > 0) {
        const updates = items.map((i) => {
          const data = {
            warehouse_zone: i.warehouse_zone,
            shelf: i.shelf,
            box_number: i.box_number,
          };
          if (i.is_multi_item) data.stock_quantity = Number(i.actual_quantity);
          return { id: i.product_id, ...data };
        });
        await base44.entities.Product.bulkUpdate(updates);
        await base44.entities.InventorySet.update(set.id, {
          items: items.map((i) => ({
            ...i,
            system_quantity: Number(i.system_quantity),
            actual_quantity: Number(i.actual_quantity),
          })),
        });
      }
      const missing = items.filter((i) => !i.is_multi_item && Number(i.actual_quantity) === 0);
      toast({
        title: "Zapisano zmiany w magazynie",
        description:
          missing.length > 0
            ? `Uwaga: ${missing.length} egzemplarz(y) z liczbą 0 (${missing.map((m) => m.internal_code || m.product_name).join(", ")}) — zaktualizowano lokalizacje, ale brakujące egzemplarze obsłuż ręcznie w magazynie.`
            : `Zaktualizowano ${items.length} pozycji.`,
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory_sets"] });
    } catch (err) {
      toast({ title: "Błąd zapisu", description: err?.message || "Nieznany błąd", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const closeSet = async () => {
    setSaving(true);
    try {
      if (items.length > 0) {
        const updates = items.map((i) => {
          const data = { warehouse_zone: i.warehouse_zone, shelf: i.shelf, box_number: i.box_number };
          if (i.is_multi_item) data.stock_quantity = Number(i.actual_quantity);
          return { id: i.product_id, ...data };
        });
        await base44.entities.Product.bulkUpdate(updates);
      }
      await base44.entities.InventorySet.update(set.id, {
        items: items.map((i) => ({
          ...i,
          system_quantity: Number(i.system_quantity),
          actual_quantity: Number(i.actual_quantity),
        })),
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: user?.email || "",
      });
      toast({ title: "Zestaw zamknięty", description: "Zmiany ilości i lokalizacji zostały zapisane w magazynie." });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory_sets"] });
      onBack();
    } catch (err) {
      toast({ title: "Błąd zapisu", description: err?.message || "Nieznany błąd", variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{set.name}</h1>
            <p className="text-sm text-slate-500">
              {items.length} pozycji · {isOpen ? "W trakcie" : `Zamknięty${set.closed_at ? ` ${new Date(set.closed_at).toLocaleString("pl-PL")}` : ""}`}
            </p>
          </div>
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={applyToWarehouse} disabled={saving || items.length === 0} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Zapisz zmiany
            </Button>
            <Button onClick={closeSet} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Zamknij zestaw
            </Button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Dodaj produkt z magazynu — szukaj po nazwie lub kodzie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
          </div>
          {term.length >= 2 && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {candidates.length === 0 && !isSearching ? (
                <p className="text-sm text-slate-400 px-1 py-2">Brak produktów w magazynie dla „{term}”</p>
              ) : (
                candidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt="" className="w-9 h-9 rounded-md object-cover border border-slate-100 shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-sm shrink-0">📦</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.product_name}</p>
                        <p className="text-xs text-slate-400">
                          {p.internal_code || "—"}
                          {p.is_multi_item ? ` · ${p.stock_quantity || 0} szt.` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 gap-1 shrink-0">
                      <Plus className="w-3 h-3" /> Dodaj
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200/60">
          <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Brak produktów w zestawie</p>
          <p className="text-xs text-slate-400 mt-1">{isOpen ? "Wyszukaj i dodaj produkty z magazynu powyżej" : "Zestaw został zamknięty bez pozycji"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const diff = Number(item.actual_quantity) - Number(item.system_quantity);
            const thumb = imgFor(item);
            return (
              <div key={item.product_id} className="bg-white rounded-xl border border-slate-200/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {thumb ? (
                      <img src={thumb} alt={item.product_name} className="w-16 h-16 rounded-lg object-cover border border-slate-100 shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-2xl shrink-0">📦</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.internal_code && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{item.internal_code}</span>
                        )}
                        {item.is_multi_item && <Badge className="text-[10px] bg-sky-100 text-sky-700">Wielosztuka</Badge>}
                        {diff === 0 ? (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Zgodna liczba</Badge>
                        ) : diff > 0 ? (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700">+{diff} nadwyżka</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-red-100 text-red-700">{diff} brak</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 shrink-0" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Stan w systemie</label>
                    <Input value={item.system_quantity} disabled className="h-9 text-sm bg-slate-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Stan faktyczny (szt.)</label>
                    <Input
                      type="number"
                      min="0"
                      value={item.actual_quantity}
                      disabled={!isOpen}
                      onChange={(e) => updateItem(idx, "actual_quantity", e.target.value)}
                      className={`h-9 text-sm ${Number(item.actual_quantity) !== Number(item.system_quantity) ? "border-amber-300 focus-visible:ring-amber-400" : ""}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Strefa</label>
                    <Input value={item.warehouse_zone || ""} disabled={!isOpen} onChange={(e) => updateItem(idx, "warehouse_zone", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Regał / pudełko</label>
                    <div className="flex gap-2">
                      <Input placeholder="Regał" value={item.shelf || ""} disabled={!isOpen} onChange={(e) => updateItem(idx, "shelf", e.target.value)} className="h-9 text-sm" />
                      <Input placeholder="Pudło" value={item.box_number || ""} disabled={!isOpen} onChange={(e) => updateItem(idx, "box_number", e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
                {!item.is_multi_item && Number(item.actual_quantity) === 0 && isOpen && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">Egzemplarz pojedynczy z liczbą 0 — zapis zaktualizuje lokalizację, ale status egzemplarza obsłuż ręcznie w magazynie.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isOpen && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Lock className="w-4 h-4" /> Zestaw jest zamknięty — podgląd bez możliwości edycji.
        </div>
      )}
    </div>
  );
}