import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Upload, CheckCircle, AlertCircle, Sparkles, CheckSquare, Square, ChevronDown, ChevronUp, BookTemplate, LayoutTemplate, AlertTriangle } from "lucide-react";
import AllegroDescriptionEditor from "@/components/listings/AllegroDescriptionEditor";
import AllegroCategory from "@/components/listings/AllegroCategory";
import AllegroProductSearch from "@/components/listings/AllegroProductSearch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SHIPPING_OPTIONS = [
  { id: "6e05d239-b12a-4941-ab01-5b59fa69256a", label: "Małe paczki (InPost, Poczta)" },
  { id: "d9dc3989-31ae-4bfa-ae2f-e3076521375b", label: "Duże paczki (Kurier, Paleta)" },
];
const CONDITION_OPTIONS = [
  { value: "new", label: "Nowy" },
  { value: "like_new", label: "Po zwrocie / Outlet" },
  { value: "used", label: "Używany" },
];

export default function AllegroPublish() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get("listing_id");
  const queryClient = useQueryClient();

  const [listing, setListing] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    condition: "like_new",
    conditionId: null, // Allegro condition ID
    shipping_rate_id: SHIPPING_OPTIONS[0].id,
    description: "",
    quantity: 1,
    handling_time: "PT24H",
    location_city: "Zgierz",
    location_post_code: "95-100",
    invoice: "VAT",
    selected_images: [],
    allegro_category_id: null,
    allegro_category_name: null,
    allegro_product: null,
    ean: "",
    producer_name: "",
    producer_street: "ul. Przykładowa 1",
    producer_city: "Zgierz",
    producer_zip: "95-100",
    safety_type: "ROLE_FULFILLED_BY_MARKETPLACE",
    safety_url: "",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["allegro_templates"],
    queryFn: () => base44.entities.AllegroTemplate.list("-created_date"),
  });

  const [allegroConditions, setAllegroConditions] = useState([]);
  const [loadingConditions, setLoadingConditions] = useState(false);

  useEffect(() => {
    if (!form.allegro_category_id) {
      setAllegroConditions([]);
      return;
    }

    const loadConditions = async () => {
      setLoadingConditions(true);
      try {
        const res = await base44.functions.invoke("getAllegroConditions", { category_id: form.allegro_category_id });
        console.log("Loaded conditions:", res.data);
        setAllegroConditions(res.data?.conditions || []);
      } catch (err) {
        console.error("Failed to load conditions:", err);
        setAllegroConditions([]);
      } finally {
        setLoadingConditions(false);
      }
    };

    loadConditions();
  }, [form.allegro_category_id]);

  useEffect(() => {
    if (!listingId) { navigate("/Listings"); return; }
    loadData();
  }, [listingId]);

  // When category changes, reset condition and fetch available conditions
  useEffect(() => {
    if (form.allegro_category_id) {
      queryClient.invalidateQueries({ queryKey: ["allegro_conditions"] });
      // Reset condition when category changes
      set("conditionId", null);
    }
  }, [form.allegro_category_id]);

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

    setForm(prev => ({
      ...prev,
      name: lst.listing_title || prd?.product_name || "",
      price: lst.listing_price || prd?.suggested_sale_price || "",
      condition: prd?.condition || "like_new",
      // Don't set conditionId yet - wait for user to select category and fetch conditions
      shipping_rate_id: autoShipping,
      description: lst.listing_description || "",
      quantity: prd?.stock_quantity || 1,
      selected_images: lst.selected_images || [],
      producer_name: prd?.brand || "",
      producer_street: "ul. Przykładowa 1",
      producer_city: "Zgierz",
      producer_zip: "95-100",
      safety_type: "ROLE_FULFILLED_BY_MARKETPLACE",
      safety_url: "",
    }));
    setLoading(false);
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const applyTemplate = (t) => {
    setForm(prev => ({
      ...prev,
      producer_name: t.producer_name || prev.producer_name,
      producer_street: t.producer_street || prev.producer_street,
      producer_city: t.producer_city || prev.producer_city,
      producer_zip: t.producer_zip || prev.producer_zip,
      invoice: t.invoice || prev.invoice,
      handling_time: t.handling_time || prev.handling_time,
      safety_type: t.safety_type || "ROLE_FULFILLED_BY_MARKETPLACE",
      safety_url: t.safety_url || "",
    }));
    setShowTemplatePicker(false);
  };

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
    const conditionMap = { new: "Nowy", like_new: "Jak nowy / po zwrocie (stan outletowy)", used: "Używany" };
    const prompt = `### MASTER PROMPT: SPECJALISTA ONLINE MARKETINGU I SPRZEDAŻY E-COMMERCE ###

Jesteś światowej klasy specjalistą od marketingu online i sprzedaży w e-commerce z 15-letnim doświadczeniem. Specjalizujesz się w tworzeniu opisów produktów na Allegro, które:
- PRZEKONUJĄ do zakupu poprzez język korzyści
- BUDUJĄ ZAUFANIE i profesjonalny wizerunek sprzedawcy
- SĄ OPTYMALIZOWANE pod kątem konwersji (CRO)
- WYRÓŻNIAJĄ SIĘ wizualnie dzięki formatowaniu HTML

TWOJE ZADANIE: Stwórz kompletną ofertę sprzedażową dla produktu, łącząc perswazyjny copywriting z czytelnym formatowaniem HTML.

=== DANE PRODUKTU ===
- Nazwa: ${form.name}
- Marka: ${product?.brand || "produkt premium bez marki"}
- Stan: ${conditionMap[form.condition]}
- Rozmiar: ${product?.size || "rozmiar uniwersalny"}
- Kolor: ${product?.color || "kolor widoczny na załączonych zdjęciach"}
- Cena: ${form.price} PLN

=== WYMAGANIA TECHNICZNE - BEZWZGLĘDNE ===
1. Używaj WYŁĄCZNIE tych tagów HTML: h1, h2, h3, p, ul, ol, li, b, br
2. NIE dodawaj ŻADNYCH atrybutów w tagach (brak class, style, id, align itp.)
3. NIE używaj CSS, divów, spanów, table, img ani innych tagów
4. Wygeneruj CZYSTY HTML - bez komentarzy, wstępów, wyjaśnień

=== STRUKTURA OFERTY SPRZEDAŻOWEJ ===

1. **H1 - GŁÓWNY TYTUŁ OFERTY** (max 75 znaków)
   - Ma być chwytliwy, zawierać główną korzyść lub USP
   - Przykład: "Stylowa Kurtka Nike - Oryginalny Produkt, Szybka Wysyłka 24h"

2. **H2 "✨ DLACZEGO WARTO WYBRAĆ TĘ OFERTĘ?"**
   - Sekcja z listą UL z 4-5 punktami LI
   - Każdy punkt zaczyna się od **b**pogrubionego zwrotu**b** podkreślającego korzyść
   - Przykład: "li bGwarancja jakości:/b oryginalny produkt w 100%"

3. **H2 "📋 OPIS PRODUKTU"**
   - 2-3 akapity P z łącznie 4-6 zdaniami
   - Pierwszy akapit: emocjonalny hook - dlaczego ten produkt zmieni życie klienta
   - Drugi akapit: konkretne cechy i zastosowania
   - Używaj słów mocy: "gwarantuje", "sprawdzony", "profesjonalny", "wyjątkowy"

4. **H2 "⭐ NAJWAŻNIEJSZE CECHY"**
   - Lista UL z 5-7 punktami LI
   - Konkretne, mierzalne zalety produktu
   - Format: "b[Cecha]:/b [korzyść dla klienta]"
   - Przykład: "li bMateriał:/b wysokiej jakości mieszanka zapewniająca komfort przez cały dzień"

5. **H2 "📦 DOSTAWA I GWARANCJA"**
   - 1 akapit P z informacjami:
     - Wysyłka w 24h robocze
     - Możliwe formy dostawy (InPost, Poczta Polska, kurier)
     - 14 dni na zwrot (zgodnie z prawem)
     - Gwarancja satysfakcji

6. **H2 "❓ CZĘSTE PYTANIA"** (opcjonalnie)
   - 2-3 pytania w formacie OL z krótkimi odpowiedziami
   - Np. "Czy produkt jest oryginalny?", "Jak szybko wysyłacie?"

=== TECHNIKI PERSWAZJI, KTÓRYCH MASZ UŻYWAĆ ===

1. **Język korzyści**: Nie pisz "ma rozmiar M", pisz "idealnie dopasuje się do Twojej sylwetki"
2. **Społeczny dowód słuszności**: "Tysiące zadowolonych klientów", "Bestseller naszej oferty"
3. **Pilność**: "Ostatnie sztuki w tej cenie", "Promocja ograniczona czasowo"
4. **Autorytet**: "Produkt spełnia wszystkie normy jakościowe UE"
5. **Odwrócenie ryzyka**: "Gwarancja zwrotu pieniędzy", "14 dni na przetestowanie"

=== SŁOWA MOCY DO WYKORZYSTANIA ===
- ekskluzywny, premium, profesjonalny, sprawdzony, gwarantowany
- natychmiastowy, błyskawiczny, wygodny, praktyczny, uniwersalny
- wyjątkowy, unikalny, limitowany, oryginalny, certyfikowany
- oszczędność czasu, wygoda, komfort, styl, elegancja

=== PRZYKŁADOWE ZWROTY SPRZEDAŻOWE ===
- "To nie jest zwykły [produkt] - to inwestycja w Twój komfort"
- "Dołącz do grona zadowolonych klientów, którzy już przekonali się o jakości"
- "Zamów dziś, a już za 2 dni możesz cieszyć się zakupem"
- "Idealne połączenie ceny i jakości - nie znajdziesz lepszej oferty"
- "Sprawdzi się zarówno [sytuacja 1], jak i [sytuacja 2]"

=== FORMATOWANIE WIZUALNE ===
- Używaj emoji w nagłówkach H2 dla lepszej widoczności: ✨, 📋, ⭐, 📦, ❓, ✓, ➤
- Pogrubiaj (**b**tekst**b**) najważniejsze zwroty w listach
- Dziel tekst na krótkie akapity (max 3-4 zdania każdy)
- Używaj list punktowanych dla lepszej czytelności

=== STYL KOMUNIKACJI ===
- Profesjonalny, ale przyjazny ton
- Zwracaj się bezpośrednio do klienta ("Ty", "Twój")
- Unikaj przesady ("najlepszy", "najtańszy") - bądź wiarygodny
- Buduj zaufanie poprzez konkretne informacje
- Pisz w języku polskim, bez błędów ortograficznych

=== PRZYKŁAD POPRAWNEJ STRUKTURY (SZABLON) ===

h1 [Chwytliwy tytuł z główną korzyścią] h2
h2 ✨ DLACZEGO WARTO WYBRAĆ TĘ OFERTĘ? h2
ul
li bGwarancja jakości:/b [opis] li
li bSzybka wysyłka:/b [opis] li
li bNajlepsza cena:/b [opis] li
ul
h2 📋 OPIS PRODUKTU h2
p [Perswazyjny wstęp - 2-3 zdania] p
p [Konkretne informacje - 2-3 zdania] p
h2 ⭐ NAJWAŻNIEJSZE CECHY h2
ul
li bCecha 1:/b korzyść dla klienta li
li bCecha 2:/b korzyść dla klienta li
ul
h2 📦 DOSTAWA I GWARANCJA h2
p [Informacje o wysyłce i zwrotach] p

=== KOŃCOWA INSTRUKCJA ===
Wygeneruj WYŁĄCZNIE gotowy HTML do skopiowania. Bez wstępów, komentarzy, czy wyjaśnień. Zacznij od h1 i zakończ na ostatnim tagu zamykającym.

Stwórz ofertę, która SPRZEDAJE!`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: "object", properties: { description: { type: "string" } } },
      model: "gpt_5_5",
    });
    set("description", result.description);
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!form.allegro_category_id) {
      alert("Wybierz kategorię z drzewa Allegro przed wystawieniem.");
      return;
    }
    if (!form.conditionId && !form.condition) {
      alert("Wybierz stan produktu przed wystawieniem.");
      return;
    }
    setPublishing(true);
    setResult(null);

    try {
      await base44.entities.Listing.update(listingId, {
        listing_title: form.name,
        listing_price: parseFloat(form.price),
        listing_description: form.description,
        selected_images: form.selected_images,
      });

      const res = await base44.functions.invoke("publishToAllegro", {
        listing_id: listingId,
        allegro_category_id: form.allegro_category_id,
        allegro_product_id: form.allegro_product?.id || null,
        shipping_rate_id: form.shipping_rate_id,
        condition: form.condition,
        condition_id: form.conditionId,
        quantity: parseInt(form.quantity) || 1,
        handling_time: form.handling_time,
        location_city: form.location_city,
        location_post_code: form.location_post_code,
        invoice: form.invoice,
        force_active: true,
        ean: form.ean || undefined,
        producer_name: form.producer_name || undefined,
        producer_street: form.producer_street || undefined,
        producer_city: form.producer_city || undefined,
        producer_zip: form.producer_zip || undefined,
        safety_type: form.safety_type || "ROLE_FULFILLED_BY_MARKETPLACE",
        safety_url: form.safety_url || undefined,
      });
      const data = res.data ?? res;
      // If error mentions product catalog requirement, append a hint
      if (data?.error?.includes("bez powi")) {
        setResult({ error: data.error + "\n\n→ Wróć do kroku 2 i wyszukaj produkt w katalogu Allegro." });
      } else {
        setResult(data);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Nieznany błąd";
      setResult({ error: msg });
    } finally {
      setPublishing(false);
    }
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
          <a href={`https://allegro.pl/oferta/${result.allegro_listing_id}`} target="_blank" rel="noreferrer"
            className="inline-block text-orange-600 hover:underline text-sm font-medium">
            Otwórz ofertę na Allegro →
          </a>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate("/Listings")}>Wróć do Listings</Button>
          {result.allegro_listing_id && (
            <Button onClick={() => window.open(`https://allegro.pl/oferta/${result.allegro_listing_id}`, "_blank")}
              className="bg-orange-500 hover:bg-orange-600 text-white">
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
          <span className="whitespace-pre-wrap">{result.error}</span>
        </div>
      )}

      {/* Step 1: Category Selection */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">1</span>
              Kategoria Allegro
              {!form.allegro_category_id && <span className="text-xs text-red-500 font-normal">(wymagana)</span>}
            </h2>
            <p className="text-xs text-slate-400 ml-7 mt-0.5">Przejdź przez drzewo kategorii do kategorii najniższego rzędu (leaf)</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCategoryPicker(!showCategoryPicker)} className="text-xs gap-1">
            {showCategoryPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showCategoryPicker ? "Zwiń" : "Rozwiń"}
          </Button>
        </div>

        {form.allegro_category_id && !showCategoryPicker && (
          <div className="flex items-center gap-2 px-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-sm text-slate-700 font-medium">{form.allegro_category_name || form.allegro_category_id}</span>
            <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">ID: {form.allegro_category_id}</Badge>
          </div>
        )}

        {showCategoryPicker && (
          <AllegroCategory
            value={form.allegro_category_id}
            onChange={(id, name) => {
              set("allegro_category_id", id);
              set("allegro_category_name", name);
              if (id) setShowCategoryPicker(false);
            }}
          />
        )}
      </div>

      {/* Step 2: Catalog Product */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">2</span>
            Produkt z katalogu Allegro
            <span className="text-xs text-slate-400 font-normal">(opcjonalny — zalecany dla lepszej widoczności)</span>
          </h2>
          <p className="text-xs text-slate-400 ml-7 mt-0.5">
            Wyszukaj produkt w katalogu Allegro. Jeśli nie znajdziesz swojego produktu, możesz wystawić ofertę bez niego — uzupełnij wtedy EAN i producenta ręcznie w ustawieniach zaawansowanych.
          </p>
        </div>
        <AllegroProductSearch
          categoryId={form.allegro_category_id}
          onSelect={(p) => {
            set("allegro_product", p);
            // Auto-set category to product's category
            if (p && p.category?.id) {
              set("allegro_category_id", p.category.id);
              set("allegro_category_name", p.category.path?.[p.category.path.length - 1]?.name || "");
            }
            if (p && !form.producer_name) {
              set("producer_name", product?.brand || "");
            }
          }}
          selectedProduct={form.allegro_product}
        />
        {!form.allegro_product && (
          <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">
              <b>Nie wybrano produktu z katalogu.</b> Możesz wystawić ofertę bez produktu - w takim przypadku uzupełnij EAN i producenta w ustawieniach zaawansowanych.
            </span>
            <button
              type="button"
              className="text-xs font-medium underline hover:text-blue-800 whitespace-nowrap"
              onClick={() => {
                setShowAdvanced(true);
                // Scroll to advanced settings
                const advancedSection = document.getElementById('advanced-settings');
                if (advancedSection) advancedSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              Przejdź do ustawień →
            </button>
          </div>
        )}
        {form.allegro_product && (
          <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Wybrano produkt: <b>{form.allegro_product.name}</b>. Jeśli oferta zostanie odrzucona z błędem produktu, wróć tutaj i wyszukaj inny produkt lub wystaw bez produktu z katalogu.</span>
          </div>
        )}
      </div>

      {/* Step 2b: Responsible Producer — only when catalog product selected */}
      {form.allegro_product && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-400 text-white text-xs flex items-center justify-center font-bold">2b</span>
                Producent odpowiedzialny
                <span className="text-xs text-red-500 font-normal">(wymagany przez Allegro)</span>
              </h2>
              <p className="text-xs text-slate-400 ml-7 mt-0.5">
                Dane producenta/importera odpowiedzialnego za produkt zgodnie z wymogami UE.
              </p>
            </div>
            <div className="relative shrink-0">
              <Button
                variant="outline" size="sm"
                className="text-xs gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => setShowTemplatePicker(v => !v)}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Szablon
              </Button>
              {showTemplatePicker && (
                <div className="absolute right-0 top-9 z-50 bg-white border rounded-xl shadow-lg p-2 w-64 space-y-1">
                  {templates.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-3">
                      Brak szablonów.{" "}
                      <button className="text-orange-500 underline" onClick={() => navigate("/AllegroTemplates")}>Utwórz</button>
                    </div>
                  ) : templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left rounded-lg px-3 py-2 hover:bg-orange-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-700">{t.name}</p>
                      <p className="text-[11px] text-slate-400">{t.producer_name}</p>
                    </button>
                  ))}
                  <div className="border-t pt-1 mt-1">
                    <button
                      className="w-full text-left px-3 py-1.5 text-[11px] text-orange-500 hover:text-orange-600"
                      onClick={() => navigate("/AllegroTemplates")}
                    >
                      + Zarządzaj szablonami →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Nazwa producenta *</Label>
              <Input
                value={form.producer_name}
                onChange={e => set("producer_name", e.target.value)}
                placeholder="np. Nike Inc., Adidas AG..."
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Ulica i numer</Label>
              <Input
                value={form.producer_street}
                onChange={e => set("producer_street", e.target.value)}
                placeholder="ul. Przykładowa 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Miasto</Label>
              <Input
                value={form.producer_city}
                onChange={e => set("producer_city", e.target.value)}
                placeholder="Warszawa"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kod pocztowy</Label>
              <Input
                value={form.producer_zip}
                onChange={e => set("producer_zip", e.target.value)}
                placeholder="00-000"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Informacje o bezpieczeństwie</Label>
              <Select value={form.safety_type} onValueChange={v => set("safety_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROLE_FULFILLED_BY_MARKETPLACE">Allegro odpowiada za bezpieczeństwo</SelectItem>
                  <SelectItem value="NOT_APPLICABLE">Nie dotyczy</SelectItem>
                  <SelectItem value="DOCUMENT_URL">Link do dokumentu bezpieczeństwa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.safety_type === "DOCUMENT_URL" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">URL dokumentu bezpieczeństwa</Label>
                <Input
                  value={form.safety_url}
                  onChange={e => set("safety_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Basic info */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">3</span>
              Podstawowe informacje
            </h2>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Stan produktu *</Label>
              {!form.allegro_category_id ? (
                <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                  ⚠️ Najpierw wybierz kategorię Allegro, aby zobaczyć dostępne stany produktu
                </div>
              ) : loadingConditions ? (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Ładowanie dostępnych stanów...
                </div>
              ) : allegroConditions.length > 0 ? (
                <div>
                  <select
                    value={form.conditionId || ""}
                    onChange={(e) => {
                      set("conditionId", e.target.value);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-white text-foreground px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Wybierz stan</option>
                    {allegroConditions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  Nie udało się załadować stanów produktu. Spróbuj ponownie.
                </div>
              )}
              {allegroConditions.length > 0 && (
                <p className="text-[10px] text-slate-400">Wybierz stan zgodny z wymaganiami kategorii Allegro</p>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Dostawa</h2>
            <div className="space-y-1.5">
              <Label className="text-xs">Cennik dostawy *</Label>
              <Select value={form.shipping_rate_id} onValueChange={v => set("shipping_rate_id", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIPPING_OPTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced settings */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? "Ukryj ustawienia zaawansowane" : "Pokaż ustawienia zaawansowane (EAN, producent, czas wysyłki)"}
            </Button>

            {showAdvanced && (
              <div id="advanced-settings" className="space-y-3 pt-3 border-t mt-2">
                <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-800">
                  <p className="font-semibold mb-1">💡 Wystawiasz bez produktu z katalogu?</p>
                  <p>Uzupełnij <b>EAN</b> i <b>producenta</b> - Allegro wymaga tych danych gdy nie wybierzesz produktu z katalogu.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">EAN (GTIN) *</Label>
                    <Input 
                      value={form.ean || ""} 
                      onChange={e => set("ean", e.target.value)} 
                      placeholder="np. 5901234567890"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Producent *</Label>
                    <Input 
                      value={form.producer_name || ""} 
                      onChange={e => set("producer_name", e.target.value)} 
                      placeholder="np. Nike Inc."
                    />
                  </div>
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
              </div>
            )}

            <div className="text-xs text-slate-400 bg-slate-50 rounded p-2 space-y-0.5">
              <p>✓ Polityka zwrotów: <span className="text-slate-600">Outlet - zwroty</span></p>
              <p>✓ Reklamacje: <span className="text-slate-600">Reklamacje – outlet / powystawowe</span></p>
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
                <span className="text-xs text-slate-400">{form.selected_images.length}/{allImages.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {allImages.map((url, i) => {
                  const selected = form.selected_images.includes(url);
                  return (
                    <button key={i} type="button" onClick={() => toggleImage(url)}
                      className={`relative rounded-lg overflow-hidden border-2 aspect-square transition-all ${selected ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200 hover:border-slate-400"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className={`absolute top-0.5 right-0.5 ${selected ? "text-orange-500" : "text-slate-300"}`}>
                        {selected ? <CheckSquare className="w-3.5 h-3.5 drop-shadow" /> : <Square className="w-3.5 h-3.5 drop-shadow" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full text-xs"
                onClick={() => setForm(prev => ({ ...prev, selected_images: allImages.slice(0, 8) }))}>
                Zaznacz wszystkie
              </Button>
            </div>
          )}

          {/* Description */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Opis oferty</h2>
              <Button type="button" variant="outline" size="sm" onClick={generateDescription} disabled={generating}
                className="text-xs h-7 gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50">
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generuj AI
              </Button>
            </div>
            <AllegroDescriptionEditor value={form.description} onChange={v => set("description", v)} />
          </div>
        </div>
      </div>

      {/* Publish button */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button variant="outline" onClick={() => navigate("/Listings")}>Anuluj</Button>
        <Button
          onClick={handlePublish}
          disabled={publishing || !form.name || !form.price || !form.allegro_category_id}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {publishing ? "Wystawianie..." : "Wystaw na Allegro"}
        </Button>
      </div>
    </div>
  );
}