import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PackageSearch } from "lucide-react";

export default function AddUnknownItemsModal({ open, onClose, pallet, onSaved }) {
  const [count, setCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!count || count < 1) return;
    setSaving(true);
    const items = Array.from({ length: count }, (_, i) => ({
      product_name: "Nieznany produkt",
      category: "other",
      condition: "used",
      purchase_price: 0,
      status: "in_stock",
      pallet_id: pallet.id,
      notes: "Produkt tymczasowy — do zastąpienia lub usunięcia",
      internal_code: `UNK-${pallet.pallet_code}-${Date.now()}-${i}`,
    }));
    for (const item of items) {
      await base44.entities.Product.create(item);
    }
    // Auto-update pallet status to sorting if still accepted
    if (pallet.status === "accepted" || pallet.status === "active") {
      await base44.entities.Pallet.update(pallet.id, { status: "sorting" });
    }
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-amber-500" />
            Dodaj nieznane produkty
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Dodaj tymczasowe pozycje do palety <strong>{pallet?.pallet_code}</strong>. Możesz je później zastąpić właściwymi produktami lub usunąć.
        </p>
        <div className="space-y-3 pt-2">
          <div>
            <Label htmlFor="count">Liczba nieznanych produktów</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Anuluj
            </Button>
            <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Dodaj {count} szt.
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}