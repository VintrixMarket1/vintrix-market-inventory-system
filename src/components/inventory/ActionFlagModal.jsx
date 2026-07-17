import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Flag, X, AlertTriangle, Wrench, MapPin, Camera, HelpCircle, CheckCircle } from "lucide-react";

export const ACTION_TYPES = [
  { value: "check", label: "Sprawdzenie", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "repair", label: "Drobna naprawa", icon: Wrench, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "relocation", label: "Relokacja", icon: MapPin, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "more_photos", label: "Potrzebne więcej zdjęć", icon: Camera, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { value: "other", label: "Inne", icon: HelpCircle, color: "text-slate-600 bg-slate-50 border-slate-200" },
];

export function getActionTypeInfo(type) {
  return ACTION_TYPES.find(a => a.value === type) || ACTION_TYPES[4];
}

export default function ActionFlagModal({ product, onClose, onSaved }) {
  const { user } = useAuth();
  const [actionType, setActionType] = useState(product?.action_type || "check");
  const [note, setNote] = useState(product?.action_note || "");
  const [saving, setSaving] = useState(false);
  const isFlagged = product?.action_flag;

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Product.update(product.id, {
        action_flag: true,
        action_type: actionType,
        action_note: note.trim() || undefined,
        action_set_by: user?.display_name || user?.full_name || user?.email || "Nieznany",
        action_set_date: new Date().toISOString(),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Action flag save error:", err);
    }
    setSaving(false);
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await base44.entities.Product.update(product.id, {
        action_flag: false,
        action_type: null,
        action_note: null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Action flag clear error:", err);
    }
    setSaving(false);
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-500" />
            Oznacz produkt do działania
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-800">{product?.product_name}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{product?.internal_code}</p>
          </div>

          <div className="space-y-2">
            <Label>Typ działania</Label>
            <div className="grid grid-cols-1 gap-2">
              {ACTION_TYPES.map(opt => {
                const Icon = opt.icon;
                const selected = actionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setActionType(opt.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selected ? `${opt.color} ring-1 ring-offset-0` : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notatka (opcjonalnie)</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="np. Sprawdzić czy działa przycisk zasilania, brak 2 zdjęć z tyłu..."
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isFlagged && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={saving}
              className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle className="w-4 h-4" />
              Oznacz jako wykonane
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="w-4 h-4" /> Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5 bg-amber-500 hover:bg-amber-600">
            {saving ? "Zapisywanie..." : "Oznacz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}