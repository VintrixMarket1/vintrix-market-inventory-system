import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const platforms = [
  { value: "vinted", label: "Vinted" },
  { value: "olx", label: "OLX" },
  { value: "allegro", label: "Allegro" },
  { value: "ebay", label: "eBay" },
];

export default function SaleForm({ open, onClose, product, listing, onSaved }) {
  const [form, setForm] = useState({
    product_id: product?.id || "",
    listing_id: listing?.id || "",
    platform: listing?.platform || "vinted",
    sale_price: listing?.listing_price || product?.suggested_sale_price || "",
    final_sale_price: "",
    sale_date: format(new Date(), "yyyy-MM-dd"),
    purchase_price: product?.purchase_price || 0,
    product_name: product?.product_name || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    const finalPrice = parseFloat(form.final_sale_price) || parseFloat(form.sale_price) || 0;
    const data = {
      ...form,
      sale_price: finalPrice,
      purchase_price: parseFloat(form.purchase_price) || 0,
    };
    await base44.entities.Sale.create(data);
    if (product) {
      await base44.entities.Product.update(product.id, { status: "sold" });
    }
    if (listing) {
      await base44.entities.Listing.update(listing.id, { listing_status: "sold" });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-900">{product?.product_name || "Product"}</p>
            <p className="text-xs text-slate-500">Purchase price: {product?.purchase_price || 0} PLN</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={v => handleChange("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Listed Price (PLN)</Label>
              <Input type="number" value={form.sale_price} onChange={e => handleChange("sale_price", e.target.value)} placeholder="Cena wystawienia" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Final Sale Price (PLN) <span className="text-slate-400 font-normal text-xs">— kwota faktycznej sprzedaży</span></Label>
            <Input
              type="number"
              value={form.final_sale_price}
              onChange={e => handleChange("final_sale_price", e.target.value)}
              placeholder={form.sale_price ? `Domyślnie: ${form.sale_price} PLN` : "Wpisz kwotę sprzedaży"}
              className="border-emerald-300 focus-visible:ring-emerald-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sale Date</Label>
            <Input type="date" value={form.sale_date} onChange={e => handleChange("sale_date", e.target.value)} />
          </div>
          {(form.final_sale_price || form.sale_price) && product?.purchase_price ? (
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-600">Profit (na podstawie ceny finalnej)</p>
              <p className="text-lg font-bold text-emerald-700">
                {((parseFloat(form.final_sale_price) || parseFloat(form.sale_price)) - parseFloat(product.purchase_price)).toFixed(2)} PLN
              </p>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Sale
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}