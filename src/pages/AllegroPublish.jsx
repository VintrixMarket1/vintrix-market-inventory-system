import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Upload, CheckCircle, AlertCircle, Sparkles, Package, CheckSquare, Square } from "lucide-react";
import AllegroDescriptionEditor from "@/components/listings/AllegroDescriptionEditor";

const SHIPPING_OPTIONS = [
  { id: "6e05d239-b12a-4941-ab01-5b59fa69256a", label: "Małe paczki (InPost, Poczta)" },
  { id: "d9dc3989-31ae-4bfa-ae2f-e3076521375b", label: "Duże paczki (Kurier, Paleta)" },
];

const CONDITION_OPTIONS = [
  { value: "new", label: "Nowy" },
  { value: "like_new", label: "Po zwrocie / Outlet" },
  { value: "used", label: "Używany" },
];

const CATEGORY_OPTIONS = [
  { value: "clothing", label: "Odzież" },
  { value: "shoes", label: "Obuwie" },
  { value: "accessories", label: "Akcesoria" },
  { value: "electronics", label: "Elektronika" },
  { value: "home", label: "Dom i ogród" },
  { value: "toys", label: "Zabawki" },
  { value: "sports", label: "Sport i turystyka" },
  { value: "books", label: "Książki" },
  { value: "other", label: "Inne" },
];

export default function AllegroPublish() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get("listing_id");

  const [listing, setListing] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null); // { success, error, warning, allegro_listing_id }
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    condition: "like_new",
    category: "other",
    shipping_rate_id: SHIPPING_OPTIONS[0].id,
    description: "",
    quantity: 1,
    handling_time: "PT24H",
    location_city: "Zgierz",
    location_post_code: "95-100",
    invoice: "VAT",
    selected_images: [],
  });

  useEffect(() => {
    if (!listingId) { navigate("/Listings"); return; }
    loadData();
  }, [listingId]);

  const loadData = async () => {
    setLoading(true);
    const listings = await base44.entities.Listing.filter({ id: listingId });
    const lst = listings[0];
    if (!lst) { navigate("/Listings"); return; }
    setListing(lst);

    const products = await base44.entities.Product.filter({ id: lst.product_id });
    const prd = products[0];
    setProduct(prd);

    const heavyCategories = ["home", "electronics", "sports", "toys"];
    const autoShipping = heavyCategories.includes(prd?.category) ? SHIPPING_OPTIONS[1].id : SHIPPING_OPTIONS[0].id;

    setForm({
      name: lst.listing_title || prd?.product_name || "",
      price: lst.listing_price || prd?.suggested_sale_price || "",
      condition: prd?.condition || "like_new",
      category: prd?.category || "other",
      shipping_rate_id: autoShipping,
      description: lst.listing_description || "",
      quantity: prd?.stock_quantity || 1,
      handling_time: "PT24H",
      location_city: "Zgierz",
      location_post_code: "95-100",
      invoice: "VAT",
      selected_images: lst.selected_images || [],
    });
    setLoading(false);
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleImage = (url) => {
    setForm(prev => ({
      ...prev,
      selected_images: prev.selected_images.includes(url)
        ? prev.selected_images.filter(u => u !== url)
        : [...prev.selected_images, url],
    }));
  };

  const generateDescription = async () => {
    setGenerating(true);
    const conditionMap = { new: "Nowy", like_new: "Jak nowy / po zwrocie", used: "Używany" };
    const prompt = `Wygeneruj profesjonalny opis oferty na Allegro w formacie HTML dla produktu:
- Nazwa: ${form.name}
- Marka: ${product?.brand || "brak"}
- Kategoria: ${form.category}
- Stan: ${conditionMap[form.condition]}
- Rozmiar: ${product?.size || "brak"}
- Kolor: ${product?.color || "brak"}
- Cena: ${form.price} PLN

Wymagania:
- Używaj TYLKO tych tagów HTML: h1, h2, p, ul, ol, li, b
- Struktura: h1 z tytułem, h2 "Opis produktu" + p, h2 "Cechy" + ul/li, h2 "Dostawa" + p, h2 "Dlaczego warto?" + ul/li
- Pisz po polsku, stylem sprzedażowym
- NIE dodawaj żadnego CSS ani atrybutów w tagach`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { description: { type: "string" } } },
    });
    set("description", result.description);
    setGenerating(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);
    // Save updated listing data first
    await base44.entities.Listing.update(listingId, {
      listing_title: form.name,
      listing_price: parseFloat(form.price),
      listing_description: form.description,
      selected_images: form.selected_images,
    });

    const res = await base44.functions.invoke("publishToAllegro", {
      listing_id: listingId,
      shipping_rate_id: form.shipping_rate_id,
      condition: form.condition,
      category: form.category,
      quantity: parseInt(form.quantity) || 1,
      handling_time: form.handling_time,
      location_city: form.location_city,
      location_post_code: form.location_post_code,
      invoice: form.invoice,
      force_active: true,
    });
    const data = res.data ?? res;
    setResult(data);
    setPublishing(false);
  };

  const allImages = product?.images || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (result?.success || result?.warning) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4 mt-16">
        {result.success ? (
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
        ) : (
          <AlertCircle className="w-16 h-16 text-orange-400 mx-auto" />
        )}
        <h2 className="text-xl font-semibold text-slate-800">
          {result.success ? "Oferta wystawiona na Allegro!" : "Oferta zapisana jako szkic"}
        </h2>
        {result.warning && <p className="text-sm text-slate-600">{result.warning}</p>}
        {result.allegro_listing_id && (
          <a
            href={`https://allegro.pl/oferta/${result.allegro_listing_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-orange-600 hover:underline text-sm font-medium"
          >
            Otwórz ofertę na Allegro →
          </a>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate("/Listings")}>Wróć do Listings</Button>
          {result.allegro_listing_id && (
            <Button onClick={() => window.open(`https://allegro.pl/oferta/${result.allegro_listing_id}`, "_blank")} className="bg-orange-500 hover:bg-orange-600 text-white">
              Otwórz na Allegro
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/Listings")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-orange-500">Allegro</span> — Wystaw ofertę
          </h1>
          <p className="text-xs text-slate-500">{listing?.listing_title}</p>
        </div>
        {listing?.allegro_listing_id && (
          <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">Szkic: {listing.allegro_listing_id}</Badge>
        )}
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Basic info */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Podstawowe informacje</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Tytuł oferty *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Tytuł..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cena (PLN) *</Label>
                <Input type="number" value={form.price} onChange={e => set("price", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ilość sztuk</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Stan produktu *</Label>
                <Select value={form.condition} onValueChange={v => set("condition", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategoria *</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Delivery & settings */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Dostawa i ustawienia</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Cennik dostawy *</Label>
              <Select value={form.shipping_rate_id} onValueChange={v => set("shipping_rate_id", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIPPING_OPTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Czas obsługi</Label>
                <Select value={form.handling_time} onValueChange={v => set("handling_time", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT24H">1 dzień roboczy</SelectItem>
                    <SelectItem value="PT48H">2 dni robocze</SelectItem>
                    <SelectItem value="PT72H">3 dni robocze</SelectItem>
                    <SelectItem value="P7D">7 dni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Faktura</Label>
                <Select value={form.invoice} onValueChange={v => set("invoice", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="NO_INVOICE">Bez faktury</SelectItem>
                    <SelectItem value="VAT_MARGIN">VAT marża</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Miasto</Label>
                <Input value={form.location_city} onChange={e => set("location_city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kod pocztowy</Label>
                <Input value={form.location_post_code} onChange={e => set("location_post_code", e.target.value)} />
              </div>
            </div>

            {/* Fixed policies info */}
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 space-y-0.5">
              <p>✓ Polityka zwrotów: <span className="text-slate-700">Outlet - zwroty</span></p>
              <p>✓ Reklamacje: <span className="text-slate-700">Reklamacje – outlet / powystawowe</span></p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Images */}
          {allImages.length > 0 && (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Zdjęcia</h2>
                <span className="text-xs text-slate-400">{form.selected_images.length}/{allImages.length} zaznaczonych</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {allImages.map((url, i) => {
                  const selected = form.selected_images.includes(url);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleImage(url)}
                      className={`relative rounded-lg overflow-hidden border-2 aspect-square transition-all ${selected ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200 hover:border-slate-400"}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className={`absolute top-0.5 right-0.5 ${selected ? "text-orange-500" : "text-slate-300"}`}>
                        {selected ? <CheckSquare className="w-3.5 h-3.5 drop-shadow" /> : <Square className="w-3.5 h-3.5 drop-shadow" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setForm(prev => ({ ...prev, selected_images: allImages.slice(0, 8) }))}
              >
                Zaznacz wszystkie
              </Button>
            </div>
          )}

          {/* Description */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Opis oferty</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateDescription}
                disabled={generating}
                className="text-xs h-7 gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generuj AI
              </Button>
            </div>
            <AllegroDescriptionEditor
              value={form.description}
              onChange={v => set("description", v)}
            />
          </div>
        </div>
      </div>

      {/* Publish button */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={() => navigate("/Listings")}>Anuluj</Button>
        <Button
          onClick={handlePublish}
          disabled={publishing || !form.name || !form.price}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {publishing ? "Wystawianie..." : "Wystaw na Allegro"}
        </Button>
      </div>
    </div>
  );
}