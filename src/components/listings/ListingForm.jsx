import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, CheckSquare, Square } from "lucide-react";
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

  const productImages = product?.images || [];

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
    } else {
      prompt = `### MASTER PROMPT: SPECJALISTA VINTED/OLX ###

Jesteś ekspertem marketplace'ów Vinted/OLX. Tworzysz opisy, które:
- PRZECIĄGAJĄ wzrok w pierwszych 3 sekundach
- BUDUJĄ ZAUFANIE autentycznością
- SPRZEDAJĄ poprzez jasne korzyści

=== PRODUKT ===
- Nazwa: ${product?.product_name || form.listing_title}
- Kategoria: ${product?.category}
- Stan: ${conditionMap[product?.condition] || "bardzo dobry"}
- Rozmiar: ${product?.size || "uniwersalny"}
- Kod: ${product?.internal_code || "N/A"}

=== ZASADY ===
1. Pisz po polsku, stylem LUZ ale PROFESJONALNYM
2. Krótko i konkretnie (max 150 słów)
3. Używaj emoji strategicznie: ✨, 📦, ✅, 🏷️
4. Formatowanie: myślniki, krótkie akapity

=== STRUKTURA ===
1. **STAN** - 1 zdanie o stanie (np. "Stan bardzo dobry, bez wad")
2. **ROZMIAR** - jeśli odzież/buty (np. "Rozmiar M, tabela na zdjęciu")
3. **OPIS** - 2-3 zdania z językiem korzyści
4. **WYSYŁKA** - "Wysyłka 1-2 dni robocze 📦"
5. **KOD** - "Kod: ${product?.internal_code || "N/A"}"

=== TECHNIKI ===
- Autentyczność: "Zapraszam do kontaktu"
- Pilność: "Szybka wysyłka"
- Zaufanie: "Możliwy odbiór osobisty"

Wygeneruj opis. Bez wstępów.`;
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
                <span className="text-xs text-muted-foreground">{selectedImages.length} / {productImages.length} zaznaczonych</span>
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