import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Check, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const categories = ["clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];
const conditions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "used", label: "Used" },
];

export default function QuickAdd() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    category: "clothing",
    condition: "like_new",
    purchase_price: "",
    suggested_sale_price: "",
    product_name: "",
    images: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const generateCode = () => {
    const prefix = form.category.substring(0, 3).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${rand}`;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (saved) setSaved(false);
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
    setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const code = generateCode();
    const name = form.product_name || `${form.category} item`;
    await base44.entities.Product.create({
      product_name: name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price) || 0,
      suggested_sale_price: parseFloat(form.suggested_sale_price) || 0,
      quantity: 1,
      internal_code: code,
      images: form.images,
      status: "in_stock",
    });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setForm({
        category: "clothing",
        condition: "like_new",
        purchase_price: "",
        suggested_sale_price: "",
        product_name: "",
        images: [],
      });
      setSaved(false);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Zap className="w-6 h-6 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Quick Add</h1>
        <p className="text-sm text-slate-500 mt-1">Add products in seconds</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-5">
        {/* Photo */}
        <div>
          <label className="block w-full aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
            {form.images.length > 0 ? (
              <div className="relative w-full h-full">
                <img src={form.images[0]} alt="" className="w-full h-full object-cover rounded-xl" />
                {form.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    +{form.images.length - 1}
                  </span>
                )}
              </div>
            ) : uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Tap to add photo</p>
              </div>
            )}
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Product Name</Label>
          <Input value={form.product_name} onChange={e => handleChange("product_name", e.target.value)} placeholder="e.g. Nike hoodie black" />
        </div>

        {/* Category + Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => handleChange("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Condition</Label>
            <Select value={form.condition} onValueChange={v => handleChange("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Buy Price (PLN)</Label>
            <Input type="number" value={form.purchase_price} onChange={e => handleChange("purchase_price", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sell Price (PLN)</Label>
            <Input type="number" value={form.suggested_sale_price} onChange={e => handleChange("suggested_sale_price", e.target.value)} placeholder="0" />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || !form.product_name}
          className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
            saved
              ? "bg-emerald-500 hover:bg-emerald-500"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <><Check className="w-5 h-5 mr-2" /> Added!</>
          ) : (
            <><Zap className="w-5 h-5 mr-2" /> Quick Add</>
          )}
        </Button>
      </div>
    </div>
  );
}