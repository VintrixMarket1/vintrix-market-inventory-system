import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, ClipboardList, ChevronRight, PackageCheck } from "lucide-react";
import InventorySetDetail from "@/components/inventory/InventorySetDetail";

function NewSetModal({ onClose }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await base44.entities.InventorySet.create({
        name: name.trim(),
        status: "open",
        items: [],
        notes: notes.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ["inventory_sets"] });
      onClose(created);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nowa inwentaryzacja</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nazwa zestawu</Label>
            <Input
              autoFocus
              placeholder="np. Inwentaryzacja 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Uwagi (opcjonalnie)</Label>
            <Input placeholder="np. regały A1–A5" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onClose()}>Anuluj</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || creating} className="bg-emerald-600 hover:bg-emerald-700">
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Utwórz
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InventorySets() {
  const [selectedSet, setSelectedSet] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ["inventory_sets"],
    queryFn: () => base44.entities.InventorySet.list("-created_date"),
  });

  if (selectedSet) {
    return <InventorySetDetail set={selectedSet} onBack={() => setSelectedSet(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inwentaryzacja</h1>
          <p className="text-sm text-slate-500 mt-1">Zbieraj produkty w zestawy, poprawiaj ilości i lokalizacje, a potem zapisz zmiany w magazynie</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nowa inwentaryzacja
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : sets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200/60">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Brak zestawów inwentaryzacyjnych</p>
          <p className="text-xs text-slate-400 mt-1">Utwórz pierwszy zestaw przyciskiem „Nowa inwentaryzacja”</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSet(s)}
              className="w-full bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-4 text-left hover:border-slate-300 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{s.name}</h3>
                  {s.status === "open" ? (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700">W trakcie</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-slate-100 text-slate-500 gap-1">
                      <PackageCheck className="w-2.5 h-2.5" /> Zamknięty
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {s.items?.length || 0} pozycji · utworzono {new Date(s.created_date).toLocaleDateString("pl-PL")}
                  {s.notes ? ` · ${s.notes}` : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showNew && <NewSetModal onClose={(created) => { setShowNew(false); if (created?.id) setSelectedSet(created); }} />}
    </div>
  );
}