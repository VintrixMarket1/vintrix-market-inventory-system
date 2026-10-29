import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import OlxAttributeField from "@/components/inventory/OlxAttributeField";
import OlxCategoryPicker from "@/components/inventory/OlxCategoryPicker";

const VEHICLE = /^(donor_|compatibility|part_number)/;

const initValues = (fields) => Object.fromEntries(fields.map((f) => [f.code, f.value]));

export default function OlxPublishDialog({ open, items: initialItems, skipped, onClose, onSubmit, submitting }) {
  const [values, setValues] = useState({});
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    setItems(initialItems);
    setEditing(null);
    setValues(Object.fromEntries(initialItems.map((it) => [it.id, initValues(it.fields)])));
  }, [initialItems]);

  const changeCategory = (id, cat) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...cat } : it)));
    setValues((s) => ({ ...s, [id]: initValues(cat.fields) }));
    setEditing(null);
  };

  const set = (id, code, v) => setValues((s) => ({ ...s, [id]: { ...s[id], [code]: v } }));
  const incomplete = items.some((it) => it.fields.some((f) => f.required && !String(values[it.id]?.[f.code] || "").trim()));

  const submit = () => onSubmit(Object.fromEntries(items.map((it) => [it.id, { category_id: it.category_id, attributes: values[it.id] }])));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Wystaw na OLX</DialogTitle></DialogHeader>
        {skipped.length > 0 && (
          <div className="text-xs text-destructive space-y-0.5">
            {skipped.map((s) => <p key={s.id}>✗ {s.name}: {s.error}</p>)}
          </div>
        )}
        <div className="space-y-5">
          {items.map((it) => {
            const vehicle = it.fields.filter((f) => VEHICLE.test(f.code));
            const other = it.fields.filter((f) => !VEHICLE.test(f.code));
            return (
              <div key={it.id} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.category_path}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0" onClick={() => setEditing(editing === it.id ? null : it.id)}>
                    {editing === it.id ? "Anuluj" : "Zmień kategorię"}
                  </Button>
                </div>
                {editing === it.id && (
                  <OlxCategoryPicker productId={it.id} defaultQuery={it.name} onPick={(cat) => changeCategory(it.id, cat)} />
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {other.map((f) => <OlxAttributeField key={f.code} field={f} value={values[it.id]?.[f.code]} onChange={(v) => set(it.id, f.code, v)} />)}
                </div>
                {vehicle.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold uppercase tracking-wide">Pasuje do pojazdu</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {vehicle.map((f) => <OlxAttributeField key={f.code} field={f} value={values[it.id]?.[f.code]} onChange={(v) => set(it.id, f.code, v)} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={submit} disabled={!items.length || incomplete || submitting} className="bg-teal-600 hover:bg-teal-700 text-white">
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Wystaw {items.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}