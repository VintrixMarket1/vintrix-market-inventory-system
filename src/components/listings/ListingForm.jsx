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
import ShopifyActions from "./ShopifyActions";
import AllegroActions from "./AllegroActions";
import AllegroDescriptionEditor from "./AllegroDescriptionEditor";

const platforms = [
  { value: "shopify", label: "Shopify" },
  { value: "vinted", label: "Vinted" },
  { value: "olx", label: "OLX" },
  { value: "allegro", label: "Allegro" },
  { value: "ebay", label: "eBay" },
];

export default function ListingForm({ open, onClose, product, listing, onSaved }) {
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

    let prompt;
    if (isAllegro) {
      prompt = `### MASTER PROMPT: SPECJALISTA SPRZEDAŻY ALLEGRO ###

Jesteś ekspertem Allegro z 10-letnim doświadczeniem. Tworzysz opisy, które:
- SPRZEDAJĄ poprzez język korzyści i emocji
- BUDUJĄ ZAUFANIE profesjonalnym wizerunkiem
- KONWERTUJĄ dzięki perswazyjnej strukturze

=== PRODUKT ===
- Nazwa: ${product?.product_name || form.listing_title}
- Marka: ${product?.brand || "produkt premium"}
- Kategoria: ${product?.category}
- Stan: ${conditionMap[product?.condition] || "bardzo dobry"}
- Rozmiar: ${product?.size || "dostępny"}
- Kolor: ${product?.color || "klasyczny"}
- Cena: ${form.listing_price || "atrakcyjna"} PLN

=== ZASADY ===
1. Używaj WYŁĄCZNIE tagów: h1, h2, p, ul, ol, li, b
2. ZERO atrybutów (brak class, style, id)
3. ZERO CSS, divów, table, img, br
4. Używaj tagów P zamiast BR - każdy akapit to oddzielny <p>
5. CZYSTY HTML - bez komentarzy

=== STRUKTURA ===
1. **H1** - Tytuł (max 75 znaków, marka + stan + korzyść)
2. **H2 "✨ DLACZEGO WARTO?"** - UL z 3-4 korzyściami
3. **H2 "📋 OPIS"** - 2-3 akapity P z perswazyjnym tekstem
4. **H2 "⭐ CECHY"** - UL z 5-6 zaletami (stan, rozmiar, kolor, marka)
5. **H2 "📦 DOSTAWA"** - P o wysyłce 1-2 dni + zwroty

=== TECHNIKI ===
- Język korzyści: nie "ma rozmiar M", tylko "idealnie dopasuje się"
- Społeczny dowód: "Wybierany przez tysiące klientów"
- Pilność: "Ostatnie sztuki w tej cenie"
- Odwrócenie ryzyka: "14 dni na zwrot, pełna gwarancja"

=== SŁOWA MOCY ===
ekskluzywny, premium, profesjonalny, sprawdzony, gwarantowany, wyjątkowy, oryginalny, limitowany

=== FORMATOWANIE ===
- Emoji w nagłówkach: ✨, 📋, ⭐, 📦, ❓
- Pogrubienia wewnątrz tekstu: użyj <b>tekst</b>
- Każdy akapit odrębnym tagiem <p>

Wygeneruj WYŁĄCZNIE gotowy HTML. Bez wstępów. Zacznij od h1. HTML musi być ściśle walidny.`;
    } else if (isClothing) {
      prompt = `You are an expert e-commerce copywriter for Vinted/OLX clothing listings. Create a listing description following this EXACT format and structure.

=== PRODUCT DATA ===
- Name: ${product?.product_name || form.listing_title}
- Brand: ${product?.brand || "unknown"}
- Condition: ${condMapClothing[product?.condition] || "Good condition"}
- Size: ${product?.size || "not specified"}
- Color: ${product?.color || "not specified"}
- Category: ${product?.category}
- Notes: ${product?.notes || "none"}

=== REQUIRED FORMAT (follow exactly, line by line) ===
Line 1 (always): "Please check measurements before purchasing!"
(blank line)
One descriptive paragraph: Mention brand, product type, colour, material/texture, style/design, and suitable occasions or seasons. 2-4 sentences.

Condition: [e.g. "Brand new with tags" or "Like new, excellent condition"]

Size on label: [size from data]
Actual fit: [estimated fit, e.g. "Approx. Men's M"]

Measurements:
Chest: [value] cm
Length: [value] cm
Sleeve: [value] cm

Material:
[material composition if known, otherwise "Not specified on label — please see photos"]

Features:
[5-6 bullet points, one per line, describing key features: pattern, fabric qualities, design details, fit, versatility]

=== RULES ===
- Plain text only, NO HTML, NO markdown, NO emojis
- If a measurement value is unknown, write "Not provided" but KEEP the line so the structure stays intact
- Keep exact section headers: "Condition:", "Size on label:", "Actual fit:", "Measurements:", "Material:", "Features:"
- Write naturally and persuasively, like a real seller
- Output ONLY the description, no preamble or explanation.`;
    } else {
      const conditionLabel = { new: "nowy", like_new: "jak nowy / powystawowy", used: "używany" }[product?.condition] || "dobry";
      prompt = `Jesteś sprzedawcą na platformach Vinted/OLX. Napisz naturalny, ludzki opis ogłoszenia sprzedażowego.

=== STYL ===
- Pisz jak prawdziwy człowiek sprzedający rzecz
- Krótkie zdania, konkretnie, bez marketingowego bełkotu
- Żadnych nagłówków, emoji ani ozdobników — tylko zwykły tekst
- NIE wspominaj o wysyłce, zwrotach, czasie dostawy
- Opis ma być praktyczny i rzeczowy

=== DANE PRODUKTU ===
- Nazwa: ${product?.product_name || form.listing_title}
- Stan: ${conditionLabel}
- Rozmiar: ${product?.size || ""}
- Kategoria: ${product?.category}
- Notatki: ${product?.notes || "brak"}

=== STRUKTURA ===
1. Jeden akapit — krótki opis produktu i jego zastosowania (2-3 zdania)
2. "W zestawie:" — lista punktowana z zawartością (jeśli dotyczy, inaczej pomiń)
3. Jeden akapit — opis stanu (co sprawdzono, co działa, co widoczne na zdjęciach)
4. "Parametry:" — lista punktowana z kluczowymi parametrami w formacie "nazwa: wartość"

Wygeneruj czysty tekst bez HTML. Tylko zwykły tekst z podziałami na akapity. Bez wstępów.`;
    }

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