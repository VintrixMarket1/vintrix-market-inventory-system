import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ListingAccountInput from "@/components/listings/ListingAccountInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import AiChatAssistant from "@/components/ai/AiChatAssistant";
import { Upload, X, Loader2, RefreshCw, Package, Sparkles, MessageSquare } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { descriptionRules } from "@/lib/descriptionPrompt";
import CategoryTreePicker from "@/components/categories/CategoryTreePicker";

const generateSKU = (category) => {
  const prefix = (category || "other").slice(0, 3).toUpperCase();
  const num = Math.floor(Math.random() * 99999999).toString().padStart(8, "0");
  return `${prefix}-${num}`;
};

export default function ProductForm({ open, onClose, product, onSaved }) {
  const isEdit = !!product;
  const { t, lang } = useLang();

  const conditions = [
    { value: "new", label: t("cond_new") },
    { value: "like_new", label: t("cond_like_new") },
    { value: "used", label: t("cond_used") },
  ];

  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list("-created_date"),
  });

  const [form, setForm] = useState(product || {
    product_name: "",
    category: "clothing",
    subcategory: "",
    condition: "like_new",
    purchase_price: "",
    suggested_sale_price: "",
    regular_price: "",
    promo_end_date: "",
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
    is_multi_item: false,
    stock_quantity: "",
  });
  const [saving, setSaving] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "category" && !isEdit) {
        updated.internal_code = generateSKU(value);
        updated.subcategory = "";
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
      try {
        const compressed = await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        urls.push(file_url);
        // Small delay between uploads to let GC reclaim memory on weak devices
        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        console.error("Image upload failed for file:", file.name, err);
      }
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

  const generateDescription = async () => {
    setGenerating(true);
    const isPolish = lang === "pl";

    const conditionLabel = isPolish
      ? { new: "nowy", like_new: "jak nowy / powystawowy", used: "używany" }[form.condition] || form.condition
      : { new: "new", like_new: "like new / display model", used: "used" }[form.condition] || form.condition;

    const isClothing = form.category?.startsWith("clothing_");

    const condMapClothing = { new: "Brand new with tags", like_new: "Like new, excellent condition", used: "Used, good condition" };

    const prompt = `You are an expert e-commerce copywriter for second-hand marketplace listings. Create a listing description following the EXACT format below.

=== PRODUCT DATA ===
- Name: ${form.product_name || "Product"}
- Brand: ${form.brand || "unknown"}
- Condition: ${condMapClothing[form.condition] || "Good condition"}
- Size: ${form.size || "not specified"}
- Color: ${form.color || "not specified"}
- Category: ${form.category}${form.subcategory ? ` / ${form.subcategory}` : ""}
- Notes: ${form.notes || "none"}

${descriptionRules(t("ai_lang_name"), form.internal_code)}
- Output ONLY the description, no preamble or explanation.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { description: { type: "string" } } },
      model: "claude_sonnet_4_6",
    });
    handleChange("listing_description", result.description);
    setGenerating(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
      suggested_sale_price: parseFloat(form.suggested_sale_price) || 0,
      regular_price: form.regular_price ? parseFloat(form.regular_price) : null,
      promo_end_date: form.promo_end_date || null,
      quantity: parseInt(form.quantity) || 1,
      internal_code: form.internal_code || generateSKU(form.category),
      is_multi_item: !!form.is_multi_item,
      stock_quantity: form.is_multi_item ? (parseInt(form.stock_quantity) || null) : null,
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
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 ${showChat ? "max-w-[90vw] w-[1100px]" : "max-w-2xl"}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? t("pf_edit") : t("pf_add")}</DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowChat(v => !v)} 
              className={`gap-2 ${showChat ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" : "text-emerald-600 border-emerald-200"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> {t("pf_chat_ai")}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex gap-4 mt-2 flex-1 min-h-0">
        <div className={`space-y-4 overflow-y-auto flex-1 min-h-0 ${showChat ? "pr-2" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_name")} *</Label>
              <Input value={form.product_name} onChange={e => handleChange("product_name", e.target.value)} placeholder="e.g. Nike Air Max 90" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_sku")}</Label>
              <div className="flex gap-1.5">
                <Input value={form.internal_code} onChange={e => handleChange("internal_code", e.target.value)} placeholder={t("pf_auto_generated")} className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" title="Regenerate SKU" onClick={() => handleChange("internal_code", generateSKU(form.category))}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("pf_category")} *</Label>
            <CategoryTreePicker
              value={form.category}
              subcategory={form.subcategory || ""}
              showSubcategories
              maxHeight="max-h-52"
              onChange={(c, s) => { handleChange("category", c); handleChange("subcategory", s || ""); }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_condition")} *</Label>
              <Select value={form.condition} onValueChange={v => handleChange("condition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_size")}</Label>
              <Input value={form.size} onChange={e => handleChange("size", e.target.value)} placeholder={t("pf_size_placeholder")} />
            </div>
          </div>

          {/* Multi-item */}
          <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!form.is_multi_item}
                onChange={e => {
                  handleChange("is_multi_item", e.target.checked);
                  if (!e.target.checked) handleChange("stock_quantity", "");
                }}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <Package className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">{t("pf_multi_item")}</span>
              <span className="text-xs text-slate-400">{t("pf_multi_item_desc")}</span>
            </label>
            {form.is_multi_item && (
              <div className="space-y-1.5 pl-6">
                <Label>{t("pf_stock_qty")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.stock_quantity}
                  onChange={e => handleChange("stock_quantity", e.target.value)}
                  placeholder="50"
                  className="max-w-[160px]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_purchase_price")} *</Label>
              <Input type="number" value={form.purchase_price} onChange={e => handleChange("purchase_price", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_sale_price")}</Label>
              <Input type="number" value={form.suggested_sale_price} onChange={e => handleChange("suggested_sale_price", e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_regular_price")}</Label>
              <Input type="number" value={form.regular_price || ""} onChange={e => handleChange("regular_price", e.target.value)} placeholder="0.00" />
              <p className="text-xs text-slate-400">{t("pf_regular_price_hint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_promo_end")}</Label>
              <Input type="date" value={form.promo_end_date || ""} onChange={e => handleChange("promo_end_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_warehouse_zone")}</Label>
              <Input value={form.warehouse_zone} onChange={e => handleChange("warehouse_zone", e.target.value)} placeholder="A" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_shelf")}</Label>
              <Input value={form.shelf} onChange={e => handleChange("shelf", e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_box_number")}</Label>
              <Input value={form.box_number} onChange={e => handleChange("box_number", e.target.value)} placeholder="12" />
            </div>
          </div>

          <ListingAccountInput value={form.listing_account} onChange={v => handleChange("listing_account", v)} />

          <div className="space-y-1.5">
            <Label>{t("pf_barcode")}</Label>
            <Input value={form.barcode} onChange={e => handleChange("barcode", e.target.value)} placeholder={t("pf_scan_barcode")} />
          </div>

          {pallets.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("pf_pallet")} <span className="text-slate-400 font-normal">({t("pf_internal_only")})</span></Label>
              <Select value={form.pallet_id || ""} onValueChange={v => handleChange("pallet_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common_select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>{t("pf_no_pallet")}</SelectItem>
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
            <Label>{t("pf_notes")}</Label>
            <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder={t("pf_notes_placeholder")} rows={2} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("pf_description")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateDescription}
                disabled={generating || !form.product_name}
                className="text-xs h-7 gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generating ? t("pf_generating") : t("pf_generate_ai")}
              </Button>
            </div>
            <Textarea
              value={form.listing_description || ""}
              onChange={e => handleChange("listing_description", e.target.value)}
              placeholder={t("pf_description_placeholder")}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("pf_images")}</Label>
            <div className="flex flex-wrap gap-2">
              {(form.images || []).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                    onClick={() => setZoomImage(url)}
                    title="Kliknij, aby powiększyć"
                  />
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
            <Button variant="outline" onClick={onClose}>{t("pf_cancel")}</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.product_name} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? t("pf_update") : t("pf_add_btn")}
            </Button>
          </div>
        </div>

        {showChat && (
          <div className="w-[400px] shrink-0 border-l border-slate-200 flex flex-col min-h-0 overflow-hidden rounded-r-lg">
            <AiChatAssistant 
              product={form}
              onClose={() => setShowChat(false)}
              onDataChanged={async () => {
                if (product?.id) {
                  try {
                    const updated = await base44.entities.Product.list();
                    const found = updated.find(p => p.id === product.id);
                    if (found) setForm(found);
                  } catch (e) {
                    console.error("onDataChanged error:", e);
                  }
                }
              }}
            />
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Powiększenie zdjęcia produktu */}
    <Dialog open={!!zoomImage} onOpenChange={(o) => { if (!o) setZoomImage(null); }}>
      <DialogContent className="max-w-3xl p-2">
        <DialogHeader className="p-4 pb-1">
          <DialogTitle className="text-sm font-medium text-slate-600">{form.product_name || "Zdjęcie produktu"}</DialogTitle>
        </DialogHeader>
        {zoomImage && (
          <img src={zoomImage} alt="Powiększone zdjęcie produktu" className="w-full max-h-[70vh] object-contain rounded-lg" />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}