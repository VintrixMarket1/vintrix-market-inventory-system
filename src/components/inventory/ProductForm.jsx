import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Upload, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const categories = ["clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];

const CATEGORY_PREFIXES = {
  clothing: "CLO",
  shoes: "SHO",
  accessories: "ACC",
  electronics: "ELC",
  home: "HOM",
  toys: "TOY",
  sports: "SPT",
  books: "BOK",
  other: "OTH",
};

const generateSKU = (category) => {
  const prefix = CATEGORY_PREFIXES[category] || "OTH";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}${rand}`;
};
const conditions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "used", label: "Used" },
];

export default function ProductForm({ open, onClose, product, onSaved }) {
  const isEdit = !!product;

  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list("-created_date"),
  });

  const [form, setForm] = useState(product || {
    product_name: "",
    category: "clothing",
    condition: "like_new",
    purchase_price: "",
    suggested_sale_price: "",
    quantity: 1,
    notes: "",
    images: [],
    barcode: "",
    warehouse_zone: "",
    shelf: "",
    box_number: "",
    size: "",
    internal_code: generateSKU("clothing"),
    pallet_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-regenerate SKU when category changes (only for new products)
      if (field === "category" && !isEdit) {
        updated.internal_code = generateSKU(value);
      }
      return updated;
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    setUploading(false);
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
      suggested_sale_price: parseFloat(form.suggested_sale_price) || 0,
      quantity: parseInt(form.quantity) || 1,
      internal_code: form.internal_code || generateSKU(form.category),
    };
    if (isEdit) {
      await base44.entities.Product.update(product.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input value={form.product_name} onChange={e => handleChange("product_name", e.target.value)} placeholder="e.g. Nike Air Max 90" />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Code</Label>
              <Input value={form.internal_code} onChange={e => handleChange("internal_code", e.target.value)} placeholder="Auto-generated if empty" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condition *</Label>
              <Select value={form.condition} onValueChange={v => handleChange("condition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Input value={form.size} onChange={e => handleChange("size", e.target.value)} placeholder="e.g. M, 42" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} min={1} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Purchase Price (PLN) *</Label>
              <Input type="number" value={form.purchase_price} onChange={e => handleChange("purchase_price", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Suggested Sale Price (PLN)</Label>
              <Input type="number" value={form.suggested_sale_price} onChange={e => handleChange("suggested_sale_price", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Warehouse Zone</Label>
              <Input value={form.warehouse_zone} onChange={e => handleChange("warehouse_zone", e.target.value)} placeholder="A" />
            </div>
            <div className="space-y-1.5">
              <Label>Shelf</Label>
              <Input value={form.shelf} onChange={e => handleChange("shelf", e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>Box Number</Label>
              <Input value={form.box_number} onChange={e => handleChange("box_number", e.target.value)} placeholder="12" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Barcode / Code</Label>
            <Input value={form.barcode} onChange={e => handleChange("barcode", e.target.value)} placeholder="Scan or enter barcode" />
          </div>

          {pallets.length > 0 && (
            <div className="space-y-1.5">
              <Label>Pallet <span className="text-slate-400 font-normal">(internal only)</span></Label>
              <Select value={form.pallet_id || ""} onValueChange={v => handleChange("pallet_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pallet..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No pallet</SelectItem>
                  {pallets.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.pallet_code} — {p.investor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Images</Label>
            <div className="flex flex-wrap gap-2">
              {(form.images || []).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Upload className="w-5 h-5 text-slate-400" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.product_name} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? "Update" : "Add Product"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}