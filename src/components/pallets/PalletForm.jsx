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
    additional_costs: pallet?.additional_costs || 0,
    invoice_number: pallet?.invoice_number || "",
    notes: pallet?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const cost = parseFloat(form.total_cost) || 0;
    const addCosts = parseFloat(form.additional_costs) || 0;
    const totalValue = cost + addCosts;
    const data = { ...form, total_cost: cost, additional_costs: addCosts, total_value: totalValue, status: pallet?.status || "accepted" };
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
          <DialogTitle>{pallet ? "Edytuj paletę" : "Nowa paleta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kod palety</Label>
              <Input placeholder="PAL-001" value={form.pallet_code} onChange={e => setForm(p => ({ ...p, pallet_code: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Inwestor / Dostawca</Label>
              <Input placeholder="np. Jan Kowalski" value={form.investor_name} onChange={e => setForm(p => ({ ...p, investor_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data zakupu</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Numer faktury</Label>
              <Input placeholder="FV/2026/001" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Wartość zakupowa (PLN)</Label>
              <Input type="number" placeholder="0" value={form.total_cost} onChange={e => setForm(p => ({ ...p, total_cost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Koszty dodatkowe (PLN)</Label>
              <Input type="number" placeholder="0" value={form.additional_costs} onChange={e => setForm(p => ({ ...p, additional_costs: e.target.value }))} />
            </div>
          </div>
          {(parseFloat(form.total_cost) || 0) + (parseFloat(form.additional_costs) || 0) > 0 && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-sm text-emerald-700">
              Łączna wartość do rozliczenia: <strong>{((parseFloat(form.total_cost) || 0) + (parseFloat(form.additional_costs) || 0)).toFixed(2)} PLN</strong>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notatki</Label>
            <Input placeholder="Opcjonalne notatki..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
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