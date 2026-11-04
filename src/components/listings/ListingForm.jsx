import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, CheckSquare, Square, Download } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/i18n";
import { descriptionRules } from "@/lib/descriptionPrompt";
import ShopifyActions from "./ShopifyActions";
import AllegroActions from "./AllegroActions";
import AllegroDescriptionEditor from "./AllegroDescriptionEditor";
import ListingAccountInput from "./ListingAccountInput";

const platforms = [
  { value: "shopify", label: "Shopify" },
  { value: "vinted", label: "Vinted" },
  { value: "olx", label: "OLX" },
  { value: "allegro", label: "Allegro" },
  { value: "ebay", label: "eBay" },
];

export default function ListingForm({ open, onClose, product, listing, onSaved }) {
  const { t } = useLang();
  const [savedListing, setSavedListing] = useState(listing || null);
  const isEdit = !!listing;
  const [form, setForm] = useState(listing || {
    product_id: product?.id || "",
    listing_title: product?.listing_title || product?.product_name || "",
    listing_description: product?.listing_description || "",
    platform: "shopify",
    listing_price: product?.suggested_sale_price || "",
    listing_status: "draft",
  });
  const [account, setAccount] = useState(product?.listing_account || "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedImages, setSelectedImages] = useState(listing?.selected_images || []);
  const [downloadingImages, setDownloadingImages] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const productImages = product?.images || [];

  const downloadImage = async (url, index) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    const ext = blob.type.split("/")[1] || "jpg";
    const productName = (product?.product_name || "produkt").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    a.download = `${productName}_${index + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadImages = async () => {
    const toDownload = selectedImages.length > 0 ? selectedImages : productImages;
    if (toDownload.length === 0) return;
    setDownloadingImages(true);
    for (let i = 0; i < toDownload.length; i++) {
      try {
        await downloadImage(toDownload[i], i);
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error("Download failed:", err);
      }
    }
    setDownloadingImages(false);
  };

  const toggleImage = (url) => {
    setSelectedImages(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const isAllegro = form.platform === "allegro";

  const generateDescription = async () => {
    setGenerating(true);
    const conditionMap = { new: "Nowy", like_new: "Jak nowy, stan bardzo dobry", used: "Używany, stan dobry" };
    const condMapClothing = { new: "Brand new with tags", like_new: "Like new, excellent condition", used: "Used, good condition" };
    const isClothing = product?.category?.startsWith("clothing_");

    const prompt = `You are an expert e-commerce copywriter for second-hand marketplace listings (${form.platform}). Create a listing description following the EXACT format below.

=== PRODUCT DATA ===
- Name: ${product?.product_name || form.listing_title}
- Brand: ${product?.brand || "unknown"}
- Condition: ${condMapClothing[product?.condition] || "Good condition"}
- Size: ${product?.size || "not specified"}
- Color: ${product?.color || "not specified"}
- Category: ${product?.category}
- Notes: ${product?.notes || "none"}

${descriptionRules(t("ai_lang_name"), product?.internal_code)}
- Output ONLY the description, no preamble or explanation.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: { description: { type: "string" } },
      },
      model: "gpt_5_5",
    });
    handleChange("listing_description", result.description);
    setGenerating(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data = { ...form, listing_price: parseFloat(form.listing_price) || 0, selected_images: selectedImages };
    if (product && account !== (product.listing_account || "")) {
      await base44.entities.Product.update(product.id, { listing_account: account });
    }
    if (isEdit || savedListing) {
      const id = savedListing?.id || listing?.id;
      await base44.entities.Listing.update(id, data);
      setSaving(false);
      onSaved();
      onClose();
    } else {
      const created = await base44.entities.Listing.create(data);
      if (product && product.status === "in_stock") {
        await base44.entities.Product.update(product.id, { status: "listed" });
      }
      setSaving(false);
      onSaved();
      setSavedListing(created);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Listing" : "Create Listing"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Listing Title *</Label>
            <Input value={form.listing_title} onChange={e => handleChange("listing_title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Platform *</Label>
              <Select value={form.platform} onValueChange={v => handleChange("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price (PLN) *</Label>
              <Input type="number" value={form.listing_price} onChange={e => handleChange("listing_price", e.target.value)} />
            </div>
          </div>
          {product && <ListingAccountInput value={account} onChange={setAccount} />}
          <div className="space-y-1.5">
            {!isAllegro && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Opis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateDescription}
                    disabled={generating}
                    className="text-xs h-7 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generuj opis
                  </Button>
                </div>
                <Textarea value={form.listing_description} onChange={e => handleChange("listing_description", e.target.value)} rows={6} placeholder="Napisz lub wygeneruj opis..." />
              </>
            )}
            {isAllegro && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Opis Allegro</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateDescription}
                    disabled={generating}
                    className="text-xs h-7 gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generuj opis Allegro (AI)
                  </Button>
                </div>
                <AllegroDescriptionEditor
                  value={form.listing_description}
                  onChange={(v) => handleChange("listing_description", v)}
                />
              </div>
            )}
          </div>
          {productImages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Zdjęcia do listingu</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedImages.length} / {productImages.length} zaznaczonych</span>
                  <button
                    type="button"
                    onClick={() => setSelectedImages(selectedImages.length === productImages.length ? [] : [...productImages])}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                  >
                    {selectedImages.length === productImages.length ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                  </button>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadImages}
                      disabled={downloadingImages}
                      className="text-xs h-7 gap-1.5 ml-auto"
                    >
                      {downloadingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {downloadingImages ? "Pobieranie..." : `Pobierz zdjęcia${selectedImages.length > 0 ? ` (${selectedImages.length})` : ` (${productImages.length})`}`}
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((url, i) => {
                  const selected = selectedImages.includes(url);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleImage(url)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${selected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-400"}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className={`absolute top-1 right-1 ${selected ? "text-emerald-500" : "text-slate-300"}`}>
                        {selected ? <CheckSquare className="w-4 h-4 drop-shadow" /> : <Square className="w-4 h-4 drop-shadow" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.listing_status} onValueChange={v => handleChange("listing_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(isEdit || savedListing) && form.platform === "shopify" && (
            <ShopifyActions listing={savedListing || listing} product={product} onRefresh={onSaved} />
          )}
          {(isEdit || savedListing) && form.platform === "allegro" && (
            <AllegroActions listing={savedListing || listing} product={product} onRefresh={onSaved} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.listing_title} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit || savedListing ? "Update" : "Create Listing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}