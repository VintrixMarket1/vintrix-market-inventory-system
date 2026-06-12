import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { generateDocumentNumber } from "@/lib/documentNumber";
import { format } from "date-fns";

export default function PalletForm({ open, onClose, pallet, onSaved }) {
  const [form, setForm] = useState({
    pallet_code: pallet?.pallet_code || "",
    investor_name: pallet?.investor_name || "",
    purchase_date: pallet?.purchase_date || "",
    total_cost: pallet?.total_cost || "",
    notes: pallet?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const cost = parseFloat(form.total_cost) || 0;
    const data = { ...form, total_cost: cost };
    if (pallet) {
      await base44.entities.Pallet.update(pallet.id, data);
    } else {
      const created = await base44.entities.Pallet.create(data);
      // Auto-generate PZ document for new pallet
      const pzNumber = await generateDocumentNumber("PZ");
      await base44.entities.WarehouseDocument.create({
        document_number: pzNumber,
        document_type: "PZ",
        date: form.purchase_date || format(new Date(), "yyyy-MM-dd"),
        status: "confirmed",
        counterparty: form.investor_name || "Dostawca",
        pallet_id: created?.id || "",
        reference_number: form.pallet_code,
        items: [{
          product_id: "",
          product_name: `Paleta ${form.pallet_code} — przyjęcie zbiorcze`,
          internal_code: form.pallet_code,
          quantity: 1,
          unit_price: cost,
          total_value: cost,
        }],
        total_value: cost,
        notes: form.notes || "",
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pallet ? "Edit Pallet" : "New Pallet"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pallet Code</Label>
              <Input placeholder="PAL-001" value={form.pallet_code} onChange={e => setForm(p => ({ ...p, pallet_code: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Investor Name</Label>
              <Input placeholder="e.g. Jan Kowalski" value={form.investor_name} onChange={e => setForm(p => ({ ...p, investor_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Cost (PLN)</Label>
              <Input type="number" placeholder="0" value={form.total_cost} onChange={e => setForm(p => ({ ...p, total_cost: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.pallet_code || !form.investor_name} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : pallet ? "Save" : "Create Pallet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}