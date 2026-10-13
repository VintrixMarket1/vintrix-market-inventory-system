import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ClipboardList, Loader2, Plus } from "lucide-react";

export default function AddToSetModal({ products, onClose }) {
  const [setId, setSetId] = useState("");
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ["inventory_sets"],
    queryFn: () => base44.entities.InventorySet.list("-created_date"),
  });
  const openSets = sets.filter((s) => s.status === "open");

  const handleAdd = async () => {
    const target = openSets.find((s) => s.id === setId);
    if (!target) return;
    setAdding(true);
    try {
      const existingIds = new Set((target.items || []).map((i) => i.product_id));
      const newItems = products
        .filter((p) => !existingIds.has(p.id))
        .map((p) => ({
          product_id: p.id,
          product_name: p.product_name,
          internal_code: p.internal_code || "",
          is_multi_item: !!p.is_multi_item,
          system_quantity: p.is_multi_item ? (p.stock_quantity || 0) : 1,
          actual_quantity: p.is_multi_item ? (p.stock_quantity || 0) : 1,
          warehouse_zone: p.warehouse_zone || "",
          shelf: p.shelf || "",
          box_number: p.box_number || "",
        }));
      if (newItems.length === 0) {
        toast({ title: "Produkty już są w tym zestawie", variant: "destructive" });
        onClose();
        return;
      }
      await base44.entities.InventorySet.update(target.id, {
        items: [...(target.items || []), ...newItems],
      });
      qc.invalidateQueries({ queryKey: ["inventory_sets"] });
      toast({ title: "Dodano do zestawu", description: `${newItems.length} produktów dodano do „${target.name}”.` });
      onClose();
    } catch (err) {
      toast({ title: "Błąd zapisu", description: err?.message || "Nieznany błąd", variant: "destructive" });
      setAdding(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Dodaj do inwentaryzacji</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : openSets.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Brak otwartych zestawów — utwórz najpierw zestaw w zakładce „Inwentaryzacja”.</p>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-500">{products.length} zaznaczonych produktów</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {openSets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSetId(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${setId === s.id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <ClipboardList className={`w-4 h-4 shrink-0 ${setId === s.id ? "text-emerald-600" : "text-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.items?.length || 0} pozycji</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Anuluj</Button>
              <Button onClick={handleAdd} disabled={!setId || adding} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Dodaj
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}