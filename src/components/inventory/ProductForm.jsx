import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import AiChatAssistant from "@/components/ai/AiChatAssistant";
import { Upload, X, Loader2, RefreshCw, Package, Sparkles, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SUBCATEGORIES } from "@/lib/subcategories";
import { useLang } from "@/lib/i18n";

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

  const generateDescription = async () => {
    setGenerating(true);
    const isPolish = lang === "pl";

    const prompt = isPolish
      ? `Jesteś ekspertem e-commerce tworzącym opisy produktów zgodne z zasadami Allegro.

=== KRYTYCZNE ZASADY ALLEGRO ===
1. ZAKAZ wzmianki o zwrotach, wysyłce, czasie dostawy, polityce zwrotów — to jest w innych zakładkach Allegro.
2. ZAKAZ pisania o stanie produktu (nowy/używany) — stan jest parametrem oferty, NIE treścią opisu.
3. NIE pisz: "14 dni na zwrot", "wysyłka 24h", "InPost", "kurier", "zwrot towaru", "gwarancja zwrotu", "szybka wysyłka".
4. Opis musi WYŁĄCZNIE opisywać cechy i właściwości produktu.

=== DANE PRODUKTU ===
- Nazwa: ${form.product_name || "Produkt premium"}
- Rozmiar: ${form.size || ""}
- Kategoria: ${form.category}
- Cena: ${form.suggested_sale_price || form.purchase_price || "do negocjacji"} PLN

=== WYMAGANIA TECHNICZNE ===
1. Tylko tagi: h1, h2, h3, p, ul, ol, li, b, br
2. BRAK atrybutów w tagach (żadnych class, style, id)
3. BRAK CSS, div, span, table, img
4. Czysty HTML — bez komentarzy, wstępów

=== STRUKTURA ===
1. H1 — chwytliwy tytuł produktu (max 75 znaków), BEZ wzmianki o wysyłce/stanie
2. H2 "✨ Dlaczego warto?" — lista UL z 4 korzyściami (cechy produktu, nie wysyłka)
3. H2 "📋 Opis produktu" — 2 akapity P o cechach i zastosowaniu (BEZ zwrotów/dostawy)
4. H2 "⭐ Najważniejsze cechy" — lista UL z 5-6 cechami (<b>Cecha:</b> opis)
5. H2 "❓ Informacje" — krótki akapit o produkcie/marce (NIE o wysyłce)

Wygeneruj WYŁĄCZNIE gotowy HTML. Zacznij od <h1>.`
      : `You are an e-commerce expert creating marketplace-compliant product descriptions.

=== CRITICAL RULES ===
1. DO NOT mention returns, shipping, delivery times, or return policies — these are in other sections.
2. DO NOT write about product condition (new/used) — condition is a listing parameter, NOT description content.
3. DO NOT write: "free returns", "fast shipping", "next day delivery", "money back guarantee".
4. Description must ONLY describe product features and properties.

=== PRODUCT DATA ===
- Name: ${form.product_name || "Premium Product"}
- Size: ${form.size || ""}
- Category: ${form.category}
- Price: ${form.suggested_sale_price || form.purchase_price || "negotiable"} PLN

=== TECHNICAL REQUIREMENTS ===
1. Only tags: h1, h2, h3, p, ul, ol, li, b, br
2. NO attributes in tags (no class, style, id)
3. NO CSS, div, span, table, img
4. Clean HTML — no comments, no preamble

=== STRUCTURE ===
1. H1 — compelling product title (max 75 chars), NO mention of shipping/condition
2. H2 "✨ Why choose this?" — UL list with 4 benefits (product features, not shipping)
3. H2 "📋 Product Description" — 2 P paragraphs about features and use (NO returns/delivery)
4. H2 "⭐ Key Features" — UL list with 5-6 features (<b>Feature:</b> description)
5. H2 "❓ Information" — short paragraph about product/brand (NOT about shipping)

Generate ONLY the ready HTML. Start with <h1>.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { description: { type: "string" } } },
      model: "gpt_5_5",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? t("pf_edit") : t("pf_add")}</DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowChat(true)} 
              className="gap-2 text-emerald-600 border-emerald-200"
            >
              <MessageSquare className="w-3.5 h-3.5" /> {t("pf_chat_ai")}
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_category")} *</Label>
              <Select value={form.category} onValueChange={v => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_subcategory")}</Label>
              <Select value={form.subcategory || ""} onValueChange={v => handleChange("subcategory", v)}>
                <SelectTrigger><SelectValue placeholder={t("common_select")} /></SelectTrigger>
                <SelectContent>
                  {(SUBCATEGORIES[form.category] || []).map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button variant="outline" onClick={onClose}>{t("pf_cancel")}</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.product_name} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? t("pf_update") : t("pf_add_btn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {showChat && (
      <div style={{ zIndex: 9999 }} onClick={e => e.stopPropagation()}>
        <AiChatAssistant 
          product={form}
          onClose={() => setShowChat(false)}
          onDataChanged={() => {}}
        />
      </div>
    )}
    </>
  );
}