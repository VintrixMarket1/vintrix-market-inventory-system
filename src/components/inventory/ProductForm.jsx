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
import { compressImage } from "@/lib/compressImage";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { CATEGORY_GROUPS, SUBCATEGORIES_BY_CATEGORY, CATEGORY_LABELS } from "@/lib/categoryConfig";

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
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
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

    const conditionLabel = isPolish
      ? { new: "nowy", like_new: "jak nowy / powystawowy", used: "używany" }[form.condition] || form.condition
      : { new: "new", like_new: "like new / display model", used: "used" }[form.condition] || form.condition;

    const isClothing = form.category?.startsWith("clothing") || form.category?.startsWith("shoes") || form.category?.startsWith("accessories");

    const prompt = isPolish
      ? `Jesteś ekspertem copywritingu e-commerce specjalizującym się w sprzedaży second-hand na OLX/Vinted/Allegro. Twój opis ma SPRZEDAĆ produkt — szybko i skutecznie.

=== DANE PRODUKTU ===
- Nazwa: ${form.product_name || "Produkt"}
- Marka: ${form.brand || "nieznana"}
- Stan: ${conditionLabel}
- Rozmiar: ${form.size || "nie podano"}
- Kolor: ${form.color || "nie podano"}
- Kategoria: ${form.category}${form.subcategory ? ` / ${form.subcategory}` : ""}
- Notatki sprzedawcy: ${form.notes || "brak"}

=== ZASADY COPYWRITINGU ===
- Zacznij od najmocniejszej cechy produktu — tej, która przyciąga uwagę kupującego
- Używaj konkretnych, opisowych przymiotników zamiast ogólników
- Podkreśl wartość (co kupujący zyska) a nie tylko cechy
- Stan opisz szczerze ale pozytywnie
- Używaj emoji tam gdzie pasują — ✨ 🚀 📦 itp.
- Pisz naturalnie, angażująco — jak do znajomego

=== WYMAGANIA TECHNICZNE ===
- Dozwolone tagi: p, ul, li, b, br
- BRAK atrybutów w tagach (żadnych class, style, id)
- BRAK h1, h2, h3, div, span, CSS, img
- Czysty HTML — bez komentarzy, bez wstępów${isClothing ? `

=== FORMAT DLA ODZIEŻY/OBUWIA (OBOWIĄZKOWY) ===
Wzoruj się DOKŁADNIE na tym formacie:

<p>Proszę sprawdzić wymiary przed zakupem!</p>
<p>[Chwytliwy, emocjonalny opis produktu — co to jest, dlaczego wyróżnia się z tłumu, na jakie okazje idealny (festiwale, imprezy, koncerty, itp.) ✨]</p>
<p><b>Rozmiar na metce:</b> [rozmiar]<br><b>Rzeczywisty krój:</b> [np. ok. M/L, w zależności od pożądanego dopasowania]</p>
<p><b>Wymiary:</b></p>
<ul>
<li>Talia/Klatka/Ramiona: [X] cm na płasko</li>
<li>Długość: [X] cm</li>
<li>[inne wymiary pasujące do produktu]</li>
</ul>
<p><b>Cechy:</b></p>
<ul>
<li>[cecha 1 — konkretna i atrakcyjna]</li>
<li>[cecha 2]</li>
<li>[cecha 3]</li>
<li>[cecha 4]</li>
<li>[cecha 5 — opcjonalnie: okazje/stylizacje]</li>
</ul>
<p>[Zdanie zamykające — zachęcające, opisujące kiedy warto kupić, z emoji] ✨</p>
<p>Szybka wysyłka 🚀📦</p>

WAŻNE: Jeśli nie znasz wymiarów (brak w notatkach), pomiń sekcję wymiarów, ale zachowaj resztę struktury.` : `

=== STRUKTURA ===
1. <p> — 2-3 zdania haczyka: co to jest + dlaczego warto kupić
2. <p> — szczery opis stanu: co sprawdzono, co jest jak nowe
3. <ul> "Parametry:" — kluczowe dane w formacie <b>parametr:</b> wartość`}

Wygeneruj WYŁĄCZNIE gotowy HTML. Zacznij od <p>.`
      : `You are an e-commerce copywriting expert specializing in second-hand sales on OLX/Vinted/eBay. Your description must SELL the product — quickly and effectively.

=== PRODUCT DATA ===
- Name: ${form.product_name || "Product"}
- Brand: ${form.brand || "unknown"}
- Condition: ${conditionLabel}
- Size: ${form.size || "not specified"}
- Color: ${form.color || "not specified"}
- Category: ${form.category}${form.subcategory ? ` / ${form.subcategory}` : ""}
- Seller notes: ${form.notes || "none"}

=== COPYWRITING RULES ===
- Open with the strongest feature — the one that grabs the buyer's attention
- Use specific, descriptive adjectives instead of generics
- Highlight value (what the buyer gains) not just features
- Describe condition honestly but positively
- Use emojis where fitting — ✨ 🚀 📦 etc.
- Write naturally and engagingly — like to a friend${isClothing ? `

=== FORMAT FOR CLOTHING/SHOES (MANDATORY) ===
Follow this format EXACTLY:

<p>Please check measurements before purchasing!</p>
<p>[Catchy, emotional product description — what it is, why it stands out, what occasions it's perfect for (festivals, parties, concerts, etc.) ✨]</p>
<p><b>Label size:</b> [size]<br><b>Actual fit:</b> [e.g. approx. M/L depending on desired fit]</p>
<p><b>Measurements:</b></p>
<ul>
<li>Waist/Chest/Shoulders: [X] cm flat</li>
<li>Length: [X] cm</li>
<li>[other measurements relevant to the item]</li>
</ul>
<p><b>Features:</b></p>
<ul>
<li>[feature 1 — specific and appealing]</li>
<li>[feature 2]</li>
<li>[feature 3]</li>
<li>[feature 4]</li>
<li>[feature 5 — optional: occasions/styling tips]</li>
</ul>
<p>[Closing sentence — encouraging, describing when to buy, with emoji] ✨</p>
<p>Fast shipping 🚀📦</p>

IMPORTANT: If you don't know the measurements (not in notes), skip the measurements section but keep the rest of the structure.` : `

=== STRUCTURE ===
1. <p> — 2-3 hook sentences: what it is + why it's worth buying
2. <p> — honest condition description: what was checked, what's like new
3. <ul> "Specs:" — key data in format <b>spec:</b> value`}

=== TECHNICAL REQUIREMENTS ===
- Allowed tags: p, ul, li, b, br
- NO attributes in tags (no class, style, id)
- NO h1, h2, h3, div, span, CSS, img
- Clean HTML — no comments, no preamble

Generate ONLY the ready HTML. Start with <p>.`;

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>{t("pf_category")} *</Label>
              <select
                value={form.category}
                onChange={e => handleChange("category", e.target.value)}
                className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORY_GROUPS.map(group => (
                  <optgroup key={group.group} label={`${group.icon} ${group.group}`}>
                    {group.items.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("pf_subcategory")}</Label>
              <Select value={form.subcategory || ""} onValueChange={v => handleChange("subcategory", v)}>
                <SelectTrigger><SelectValue placeholder={t("common_select")} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {(SUBCATEGORIES_BY_CATEGORY[form.category] || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
    </>
  );
}