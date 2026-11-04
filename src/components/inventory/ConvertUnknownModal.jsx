import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X, Upload, Sparkles, Loader2, CheckCircle, AlertTriangle,
  ChevronRight, RotateCcw, FileText, Camera, Info, BookCopy, Search
} from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { generateDocumentNumber } from "@/lib/documentNumber";
import { exportDptPdf } from "@/lib/dptPdfExport";
import { CATEGORY_LABELS } from "@/lib/categoryConfig";
import CategorySelectButton from "@/components/categories/CategorySelectButton";
import ModalErrorBoundary from "@/components/inventory/ModalErrorBoundary";
import { useLang } from "@/lib/i18n";
import { descriptionRules } from "@/lib/descriptionPrompt";

const CONDITION_OPTIONS = [
  { value: "new", label: "Nowy" },
  { value: "like_new", label: "Jak nowy" },
  { value: "used", label: "Używany" },
];

function generateSku(palletCode, productCount) {
  const palletPart = palletCode
    ? palletCode.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6)
    : "WH";
  const num = String((productCount || 0) + 1).padStart(2, "0");
  return `${palletPart}-${num}`;
}

function FieldRow({ label, children, required }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function ConvertUnknownModal({ product, pallet, palletProductCount = 0, user, onClose, onConverted }) {
  const queryClient = useQueryClient();
  const { t } = useLang();

  // Validation
  const validationError = (() => {
    if (!product) return null;
    if (product.status === "sold") return "Nie można konwertować sprzedanego produktu.";
    if (product.status === "reclassified") return "Ten produkt został już wcześniej przeklasyfikowany.";
    if (product.is_multi_item && (product.stock_quantity ?? 0) <= 0) return "Produkt ma stan magazynowy 0.";
    return null;
  })();

  // Step: "upload" → "analyzing" → "form" → "confirm" → "done"
  const [step, setStep] = useState("upload");
  // Mode for upload step: "ai" | "catalog"
  const [uploadMode, setUploadMode] = useState("ai");
  // Catalog search
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);
  const catalogSearchTimeout = useRef(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [form, setForm] = useState({
    product_name: "",
    brand: "",
    internal_code: generateSku(pallet?.pallet_code, palletProductCount),
    category: "other",
    subcategory: "",
    condition: "like_new",
    size: "",
    color: "",
    notes: "",
    suggested_sale_price: "",
    purchase_price: String(product?.purchase_price ?? ""),
    stock_quantity: "1",
    listing_title: "",
    listing_description: "",
    warehouse_zone: product?.warehouse_zone || "",
    shelf: product?.shelf || "",
    box_number: product?.box_number || "",
  });

  const [saving, setSaving] = useState(false);
  const [savedDpt, setSavedDpt] = useState(null);
  const [newProductSaved, setNewProductSaved] = useState(null);
  const [valueDiffWarning, setValueDiffWarning] = useState(false);
  const [valueDiffConfirmed, setValueDiffConfirmed] = useState(false);

  const fileRef = useRef();

  // Catalog search with debounce — fetch only when user types 2+ chars
  useEffect(() => {
    if (uploadMode !== "catalog") return;
    clearTimeout(catalogSearchTimeout.current);
    catalogSearchTimeout.current = setTimeout(async () => {
      const query = catalogSearch.trim();
      setCatalogLoading(true);
      try {
        // Server-side search: all non-sold products, excluding reclassified and unknown
        const searchQuery = {
          product_name: { $ne: "Nieznany produkt" },
          status: { $ne: "reclassified" },
        };
        if (query.length >= 2) {
          searchQuery.$or = [
            { product_name: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } },
            { internal_code: { $regex: query, $options: "i" } },
          ];
        }
        const page = await base44.entities.Product.filter(searchQuery, { sort: "-created_date", limit: 50 });
        setCatalogProducts(page.items || []);
      } catch (err) {
        console.error("Catalog search error:", err);
      }
      setCatalogLoading(false);
    }, 400);
  }, [catalogSearch, uploadMode]);

  const applyCatalogProduct = (p) => {
    setSelectedCatalogProduct(p);
    setForm(prev => ({
      ...prev,
      product_name: p.product_name || prev.product_name,
      brand: p.brand || prev.brand,
      category: p.category || prev.category,
      subcategory: p.subcategory || prev.subcategory,
      condition: p.condition || prev.condition,
      size: p.size || prev.size,
      color: p.color || prev.color,
      listing_title: p.listing_title || prev.listing_title,
      listing_description: p.listing_description || prev.listing_description,
      suggested_sale_price: p.suggested_sale_price ? String(p.suggested_sale_price) : prev.suggested_sale_price,
    }));
    if (p.images?.length) setImages(p.images);
    setStep("form");
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      // Step 1: Compress images sequentially to avoid OOM on mobile
      const compressed = [];
      for (const file of files) {
        try {
          const c = await compressImage(file);
          compressed.push(c);
        } catch (err) {
          console.error("Compression failed for:", file.name, err);
        }
      }
      // Step 2: Upload in parallel (network-bound, not memory-bound)
      const results = await Promise.allSettled(
        compressed.map(c => base44.integrations.Core.UploadFile({ file: c }))
      );
      const uploaded = results
        .filter(r => r.status === "fulfilled" && r.value?.file_url)
        .map(r => r.value.file_url);
      if (uploaded.length > 0) {
        setImages(prev => [...prev, ...uploaded]);
      }
    } catch (err) {
      console.error("Image upload error:", err);
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const runAiAnalysis = async () => {
    if (images.length === 0 && !analysisNotes.trim()) return;
    setAnalyzing(true);
    setAiError(null);

    try {
      // Limit to 3 images to reduce memory/processing on mobile
      const imagesForAnalysis = images.slice(0, 3);

      // Single combined LLM call — identification + listing copy in one response
      const categoriesList = "clothing_men, clothing_women, clothing_kids, clothing_sport, shoes_men, shoes_women, shoes_kids, shoes_sport, accessories_bags, accessories_belts, accessories_hats, accessories_scarves, accessories_jewelry, accessories_watches, accessories_sunglasses, accessories_wallets, electronics_phones, electronics_tablets, electronics_laptops, electronics_audio, electronics_tv, electronics_cameras, electronics_gaming, electronics_accessories, home_furniture, home_kitchen, home_agd_large, home_agd_cleaning, home_agd_personal, home_agd_laundry, home_bedding, home_decor, home_lighting, home_garden, home_tools, home_bathroom, toys_kids, toys_board_games, toys_outdoor, toys_educational, toys_lego, toys_dolls, sports_fitness, sports_cycling, sports_winter, sports_water, sports_team, sports_outdoor, books_fiction, books_nonfiction, books_kids, books_comics, books_textbooks, beauty_cosmetics, beauty_perfumes, beauty_haircare, beauty_skincare, automotive_parts, automotive_accessories, automotive_tools, pet_food, pet_accessories, pet_clothing, food_supplements, health_medical, music_instruments, music_vinyl, art_paintings, art_collectibles, other";

      const combinedPrompt = `Jesteś ekspertem od identyfikacji i wyceny produktów na rynku wtórnym (OLX, Vinted, Allegro).
Przeanalizuj zdjęcia i/lub opis operatora. Zidentyfikuj produkt, wycen go i wygeneruj opis ogłoszenia.

Uwagi od operatora: ${analysisNotes || "(brak uwag)"}
${imagesForAnalysis.length === 0 ? "Brak zdjęć — opieraj się wyłącznie na uwagach operatora." : "Przeanalizuj załączone zdjęcia produktu."}

Zwróć obiekt JSON z WSZYSTKIMI polami wymienionymi poniżej — żadne pole nie może być pominięte:
- "product_name" (string): Pełna nazwa produktu z marką jeśli ją znasz, np. "Ekspres do kawy Philips Senseo HD7866"
- "brand" (string): Marka producenta, np. "Philips". Jeśli nie można ustalić, wpisz "Nieznana"
- "model" (string): Model lub seria, jeśli widoczny na zdjęciu/znany. Jeśli nie, wpisz pusty string
- "category" (string): DOKŁADNIE jedna wartość z listy kategorii poniżej
- "subcategory" (string): Podkategoria jeśli dotyczy, inaczej pusty string
- "condition" (string): "new", "like_new", lub "used" — na podstawie wyglądu produktu
- "color" (string): Główny kolor produktu, np. "Czarny"
- "size" (string): Rozmiar jeśli dotyczy (ubrania/obuwie), inaczej pusty string
- "suggested_sale_price" (number): Sugerowana cena w PLN jako liczba, np. 49.99
- "visible_damage" (string): Opis widocznych uszkodzeń, lub "Brak"
- "missing_parts" (string): Brakujące elementy, lub "Brak"
- "warnings" (string): Ważne uwagi/ostrzeżenia dla kupującego, lub pusty string
- "ai_summary" (string): Krótkie podsumowanie identyfikacji (1-2 zdania)
- "listing_title" (string): Tytuł ogłoszenia max 75 znaków
- "listing_description" (string): Opis ogłoszenia według zasad poniżej

Kategorie do wyboru (użyj DOKŁADNIE jednej): ${categoriesList}

Zasady opisu listing_description:
${descriptionRules(t("ai_lang_name"), form.internal_code)}

WAŻNE: Musisz wypełnić WSZYSTKIE pola. Jeśli nie możesz ustalić wartości, wpisz "Nieznana" lub pusty string — nigdy nie pomijaj pola.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: combinedPrompt,
        file_urls: imagesForAnalysis.length > 0 ? imagesForAnalysis : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string", description: "Pełna nazwa produktu z marką" },
            brand: { type: "string", description: "Marka producenta" },
            model: { type: "string", description: "Model lub seria" },
            category: { type: "string", description: "Jedna z kategorii z listy" },
            subcategory: { type: "string", description: "Podkategoria" },
            condition: { type: "string", description: "new, like_new lub used" },
            color: { type: "string", description: "Główny kolor" },
            size: { type: "string", description: "Rozmiar" },
            suggested_sale_price: { type: "number", description: "Sugerowana cena w PLN" },
            visible_damage: { type: "string", description: "Widoczne uszkodzenia lub Brak" },
            missing_parts: { type: "string", description: "Brakujące elementy lub Brak" },
            warnings: { type: "string", description: "Ostrzeżenia" },
            ai_summary: { type: "string", description: "Krótkie podsumowanie" },
            listing_title: { type: "string", description: "Tytuł ogłoszenia max 75 znaków" },
            listing_description: { type: "string", description: "Opis ogłoszenia" },
          },
          required: ["product_name", "brand", "category", "condition", "ai_summary", "listing_title", "listing_description"]
        }
      });

      if (!result || typeof result !== "object") {
        throw new Error("AI nie zwrócił prawidłowego wyniku");
      }

      if (!result.product_name || !result.product_name.trim()) {
        throw new Error("AI nie zidentyfikował produktu. Spróbuj dodać więcej zdjęć lub doprecyzuj uwagi.");
      }

      setAiResult(result);
      setForm(prev => ({
        ...prev,
        product_name: result.product_name || prev.product_name,
        brand: result.brand || prev.brand,
        category: result.category || prev.category,
        subcategory: result.subcategory || prev.subcategory,
        condition: result.condition || prev.condition,
        color: result.color || prev.color,
        size: result.size || prev.size,
        listing_title: result.listing_title || prev.listing_title,
        listing_description: result.listing_description || prev.listing_description,
        suggested_sale_price: result.suggested_sale_price ? String(result.suggested_sale_price) : prev.suggested_sale_price,
      }));
      setAnalyzing(false);
      setStep("form");
    } catch (err) {
      console.error("AI analysis error:", err);
      setAiError(err?.message || "Wystąpił błąd podczas analizy AI. Spróbuj ponownie lub wypełnij formularz ręcznie.");
      setAnalyzing(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const checkAndConfirm = () => {
    const oldVal = product?.purchase_price ?? 0;
    const newVal = parseFloat(form.purchase_price) || 0;
    if (Math.abs(oldVal - newVal) > 0.01) {
      setValueDiffWarning(true);
    } else {
      setStep("confirm");
    }
  };

  const handleConvert = async () => {
    setSaving(true);

    // 1. Generate DPT number
    const dptNumber = await generateDocumentNumber("DPT");
    const today = new Date().toISOString().slice(0, 10);

    // 2. Create new product
    const newProductData = {
      product_name: form.product_name,
      brand: form.brand || undefined,
      internal_code: form.internal_code,
      category: form.category,
      subcategory: form.subcategory || undefined,
      condition: form.condition,
      size: form.size || undefined,
      color: form.color || undefined,
      notes: form.notes || undefined,
      suggested_sale_price: parseFloat(form.suggested_sale_price) || undefined,
      purchase_price: parseFloat(form.purchase_price) || product?.purchase_price || 0,
      stock_quantity: parseInt(form.stock_quantity) || 1,
      is_multi_item: parseInt(form.stock_quantity) > 1,
      listing_title: form.listing_title || undefined,
      listing_description: form.listing_description || undefined,
      images: images.length > 0 ? images : undefined,
      pallet_id: product?.pallet_id || undefined,
      warehouse_zone: form.warehouse_zone || undefined,
      shelf: form.shelf || undefined,
      box_number: form.box_number || undefined,
      status: "in_stock",
      ai_analyzed: !!aiResult,
      ai_verified: true,
      ai_analysis_result: aiResult ? JSON.stringify(aiResult) : undefined,
      reclassified_from_id: product?.id,
      dpt_document_number: dptNumber,
    };

    const newProduct = await base44.entities.Product.create(newProductData);

    // 3. Mark source product as reclassified
    await base44.entities.Product.update(product.id, {
      status: "reclassified",
      reclassified_to_id: newProduct.id,
      dpt_document_number: dptNumber,
    });

    // 4. Create DPT warehouse document
    const aiSummary = aiResult
      ? [
          aiResult.ai_summary,
          aiResult.visible_damage ? `Uszkodzenia: ${aiResult.visible_damage}` : null,
          aiResult.missing_parts ? `Braki: ${aiResult.missing_parts}` : null,
          aiResult.warnings ? `⚠️ ${aiResult.warnings}` : null,
        ].filter(Boolean).join(" | ")
      : null;

    const dptDoc = await base44.entities.WarehouseDocument.create({
      document_number: dptNumber,
      document_type: "DPT",
      date: today,
      status: "confirmed",
      pallet_id: product?.pallet_id || undefined,
      related_dpt_source_id: product?.id,
      related_dpt_target_id: newProduct.id,
      dpt_ai_summary: aiSummary || undefined,
      notes: form.notes || undefined,
      created_by_name: user?.display_name || user?.full_name || user?.email || "Nieznany",
      items: [
        {
          product_id: product?.id,
          product_name: product?.product_name,
          internal_code: product?.internal_code || "—",
          category: product?.category,
          condition: product?.condition,
          quantity: 1,
          unit_price: product?.purchase_price || 0,
          total_value: product?.purchase_price || 0,
        },
        {
          product_id: newProduct.id,
          product_name: newProduct.product_name,
          internal_code: newProduct.internal_code || "—",
          category: newProduct.category,
          condition: newProduct.condition,
          quantity: parseInt(form.stock_quantity) || 1,
          unit_price: newProduct.purchase_price || 0,
          total_value: (newProduct.purchase_price || 0) * (parseInt(form.stock_quantity) || 1),
        }
      ],
      total_value: (newProduct.purchase_price || 0) * (parseInt(form.stock_quantity) || 1),
    });

    // 5. Update new product with DPT doc id
    await base44.entities.Product.update(newProduct.id, {
      dpt_document_id: dptDoc.id,
      reclassified_from_id: product?.id,
    });

    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse_documents"] });

    setSavedDpt({ ...dptDoc, document_number: dptNumber });
    setNewProductSaved({ ...newProduct, internal_code: form.internal_code });
    setStep("done");
    setSaving(false);
  };

  if (!product) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[600]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-3 z-[601] pointer-events-none">
        <div
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-base">Konwersja nieznanego przedmiotu</h2>
              <p className="text-slate-300 text-xs mt-0.5 truncate max-w-xs">{product.product_name} · {product.internal_code || "brak SKU"}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          {!validationError && (
            <div className="flex border-b border-slate-100 shrink-0">
              {["upload", "form", "confirm", "done"].map((s, i) => {
                const labels = ["Zdjęcia i AI", "Formularz", "Potwierdzenie", "Gotowe"];
                const active = ["upload", "form", "confirm", "done"].indexOf(step);
                return (
                  <div key={s} className={`flex-1 py-2 text-center text-xs font-medium border-b-2 transition-all ${i <= active ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-400"}`}>
                    {labels[i]}
                  </div>
                );
              })}
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {/* Validation error */}
            {validationError && (
              <div className="p-6 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-base">Konwersja niemożliwa</p>
                  <p className="text-sm text-red-600 mt-1">{validationError}</p>
                </div>
                <Button variant="outline" onClick={onClose}>Zamknij</Button>
              </div>
            )}

            {/* STEP: upload + AI */}
             {!validationError && step === "upload" && (
               <div className="p-6 space-y-5">
                 {/* Source product info */}
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                   <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                   <div className="text-sm text-amber-800">
                     <p className="font-semibold">Oryginalny produkt zostanie oznaczony jako „Przeklasyfikowany".</p>
                     <p className="text-xs mt-0.5">Wartość magazynowa: <strong>{product.purchase_price} PLN</strong> · Paleta: <strong>{pallet?.pallet_code || "brak"}</strong></p>
                   </div>
                 </div>

                 {/* Mode switcher */}
                 <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                   <button
                     onClick={() => setUploadMode("ai")}
                     className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${uploadMode === "ai" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                   >
                     <Sparkles className="w-4 h-4" /> Analiza AI
                   </button>
                   <button
                     onClick={() => setUploadMode("catalog")}
                     className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${uploadMode === "catalog" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                   >
                     <BookCopy className="w-4 h-4" /> Z biblioteki
                   </button>
                 </div>

                 {/* CATALOG MODE */}
                 {uploadMode === "catalog" && (
                   <div className="space-y-3">
                     <div className="relative">
                       <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                       <Input
                         className="pl-9 text-sm"
                         placeholder="Szukaj po nazwie, marce lub SKU…"
                         value={catalogSearch}
                         onChange={e => setCatalogSearch(e.target.value)}
                         autoFocus
                       />
                     </div>
                     {catalogLoading && (
                       <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                         <Loader2 className="w-4 h-4 animate-spin" /> Szukam…
                       </div>
                     )}
                     {!catalogLoading && catalogProducts.length === 0 && (
                       <p className="text-sm text-slate-400 py-2 text-center">{catalogSearch.trim() ? "Brak wyników" : "Brak produktów w magazynie"}</p>
                     )}
                     <div className="space-y-2 max-h-64 overflow-y-auto">
                       {catalogProducts.map(p => (
                         <button
                           key={p.id}
                           onClick={() => applyCatalogProduct(p)}
                           className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                         >
                           {p.images?.[0] ? (
                             <img src={p.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                           ) : (
                             <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                               <Camera className="w-5 h-5 text-slate-300" />
                             </div>
                           )}
                           <div className="min-w-0">
                             <p className="text-sm font-medium text-slate-800 truncate">{p.product_name}{p.status === "sold" && <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Sprzedany</span>}</p>
                             <p className="text-xs text-slate-500">{p.brand || "—"} · {p.internal_code || "brak SKU"}</p>
                             <p className="text-xs text-emerald-700 font-mono">{p.suggested_sale_price ? `${p.suggested_sale_price} PLN` : ""}</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 ml-auto shrink-0" />
                         </button>
                       ))}
                     </div>
                     <Button variant="outline" className="w-full gap-1.5" onClick={() => setStep("form")}>
                       Pomiń, wypełnię ręcznie <ChevronRight className="w-4 h-4" />
                     </Button>
                   </div>
                 )}

                 {/* AI MODE */}
                 {uploadMode === "ai" && (<>
                 {/* Image upload */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
                    <Camera className="w-4 h-4" /> Zdjęcia produktu
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition shrink-0"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <span className="text-[10px] mt-1">{uploading ? "Wgrywam…" : "Dodaj"}</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </div>
                  <p className="text-[11px] text-slate-400">Zalecane: min. 3–5 zdjęć z różnych stron. AI przeanalizuje je i automatycznie uzupełni formularz.</p>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Uwagi do analizy (opcjonalnie)</Label>
                  <Textarea
                    rows={3}
                    placeholder="np. urządzenie do gotowania, brak pokrywki, marka niewidoczna na zdjęciach…"
                    value={analysisNotes}
                    onChange={e => setAnalysisNotes(e.target.value)}
                    className="text-sm resize-none"
                  />
                </div>

                {aiError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</p>}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("form")}
                  >
                    Pomiń AI, wypełnię ręcznie
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={runAiAnalysis}
                    disabled={analyzing || (images.length === 0 && !analysisNotes.trim())}
                  >
                    {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizuję…</> : <><Sparkles className="w-4 h-4" /> Analizuj AI</>}
                  </Button>
                </div>
                {analyzing && (
                   <div className="bg-slate-50 rounded-xl p-4 text-center">
                     <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                     <p className="text-sm text-slate-600 font-medium">AI analizuje produkt…</p>
                     <p className="text-xs text-slate-400 mt-1">Identyfikacja, wycena i generowanie opisu. Chwilę to zajmie.</p>
                   </div>
                 )}
                 </>)}
                </div>
                )}

                {/* STEP: form */}
            {!validationError && step === "form" && (
              <div className="p-6 space-y-5">
                {/* Catalog copy info */}
                {selectedCatalogProduct && !aiResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <BookCopy className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-sm text-blue-800">
                      <span className="font-semibold">Skopiowano z biblioteki:</span> {selectedCatalogProduct.product_name}
                      {selectedCatalogProduct.brand && ` · ${selectedCatalogProduct.brand}`}
                    </div>
                  </div>
                )}

                {/* AI result summary */}
                {aiResult && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-emerald-800 text-sm">Wynik analizy AI</span>
                    </div>
                    <p className="text-xs text-emerald-700">{aiResult.ai_summary}</p>
                    {aiResult.warnings && (
                      <div className="flex items-start gap-1.5 mt-2 text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="text-xs">{aiResult.warnings}</span>
                      </div>
                    )}
                    {(aiResult.visible_damage || aiResult.missing_parts) && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {aiResult.visible_damage && <div><span className="font-medium">Uszkodzenia:</span> {aiResult.visible_damage}</div>}
                        {aiResult.missing_parts && <div><span className="font-medium">Braki:</span> {aiResult.missing_parts}</div>}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Nowa nazwa produktu" required>
                    <Input value={form.product_name} onChange={e => handleFormChange("product_name", e.target.value)} placeholder="np. Ekspres do kawy Philips Senseo" className="text-sm" />
                  </FieldRow>
                  <FieldRow label="SKU / Kod wewnętrzny" required>
                    <Input value={form.internal_code} onChange={e => handleFormChange("internal_code", e.target.value)} placeholder="np. PAL001-01" className="text-sm font-mono" />
                  </FieldRow>
                  <FieldRow label="Marka">
                    <Input value={form.brand} onChange={e => handleFormChange("brand", e.target.value)} placeholder="np. Philips" className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Kategoria" required>
                    <CategorySelectButton
                      value={form.category}
                      onChange={(c) => handleFormChange("category", c)}
                      placeholder="Wybierz kategorię..."
                      className="w-full"
                    />
                  </FieldRow>
                  <FieldRow label="Stan" required>
                    <select
                      value={form.condition}
                      onChange={e => handleFormChange("condition", e.target.value)}
                      className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CONDITION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Ilość (sztuk)">
                    <Input type="number" min={1} value={form.stock_quantity} onChange={e => handleFormChange("stock_quantity", e.target.value)} className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Kolor">
                    <Input value={form.color} onChange={e => handleFormChange("color", e.target.value)} placeholder="np. Czarny" className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Rozmiar">
                    <Input value={form.size} onChange={e => handleFormChange("size", e.target.value)} placeholder="np. L / 42 / 15 cali" className="text-sm" />
                  </FieldRow>
                  <FieldRow label="Wartość magazynowa / Koszt własny (PLN)" required>
                    <Input type="number" min={0} step={0.01} value={form.purchase_price} onChange={e => handleFormChange("purchase_price", e.target.value)} className="text-sm font-mono" />
                  </FieldRow>
                  <FieldRow label="Sugerowana cena sprzedaży (PLN)">
                    <Input type="number" min={0} step={0.01} value={form.suggested_sale_price} onChange={e => handleFormChange("suggested_sale_price", e.target.value)} className="text-sm font-mono" />
                  </FieldRow>
                  <FieldRow label="Strefa magazynowa">
                    <Input value={form.warehouse_zone} onChange={e => handleFormChange("warehouse_zone", e.target.value)} placeholder="np. A" className="text-sm font-mono" />
                  </FieldRow>
                  <FieldRow label="Regał / Półka">
                    <Input value={form.shelf} onChange={e => handleFormChange("shelf", e.target.value)} placeholder="np. A-03" className="text-sm font-mono" />
                  </FieldRow>
                  <FieldRow label="Numer pudełka">
                    <Input value={form.box_number} onChange={e => handleFormChange("box_number", e.target.value)} placeholder="np. BOX-12" className="text-sm font-mono" />
                  </FieldRow>
                </div>

                <FieldRow label="Tytuł ogłoszenia">
                  <Input value={form.listing_title} onChange={e => handleFormChange("listing_title", e.target.value)} placeholder="Gotowy tytuł dla Allegro / OLX" className="text-sm" />
                </FieldRow>
                <FieldRow label="Opis produktu">
                  <Textarea rows={4} value={form.listing_description} onChange={e => handleFormChange("listing_description", e.target.value)} placeholder="Opis produktu…" className="text-sm resize-none" />
                </FieldRow>
                <FieldRow label="Uwagi">
                  <Textarea rows={2} value={form.notes} onChange={e => handleFormChange("notes", e.target.value)} placeholder="Dodatkowe uwagi…" className="text-sm resize-none" />
                </FieldRow>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={() => setStep("upload")}>
                    <RotateCcw className="w-4 h-4" /> Wróć
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={!form.product_name.trim() || !form.category || !form.condition || !form.purchase_price}
                    onClick={checkAndConfirm}
                  >
                    Dalej — Podgląd dokumentu
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Value diff warning */}
                {valueDiffWarning && !valueDiffConfirmed && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mt-3">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-800 text-sm">Różnica wartości magazynowej</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Wartość przed: <strong>{product.purchase_price} PLN</strong> → Po konwersji: <strong>{form.purchase_price} PLN</strong>
                          {" "}(różnica: {(parseFloat(form.purchase_price) - (product.purchase_price || 0)).toFixed(2)} PLN).
                          Czy na pewno chcesz zatwierdzić tę różnicę?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setValueDiffWarning(false)}>
                        Wróć i popraw
                      </Button>
                      <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => { setValueDiffConfirmed(true); setValueDiffWarning(false); setStep("confirm"); }}>
                        Potwierdzam różnicę
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: confirm */}
            {!validationError && step === "confirm" && (
              <div className="p-6 space-y-5">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Podgląd dokumentu DPT
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="text-slate-500">Produkt przed</div>
                    <div className="font-medium text-slate-800">{product.product_name}</div>
                    <div className="text-slate-500">Stare SKU</div>
                    <div className="font-mono text-slate-600 text-xs">{product.internal_code || "—"}</div>
                    <div className="text-slate-500">Produkt po</div>
                    <div className="font-semibold text-emerald-700">{form.product_name}</div>
                    <div className="text-slate-500">Nowe SKU</div>
                    <div className="font-mono text-slate-600 text-xs">{form.internal_code}</div>
                    <div className="text-slate-500">Kategoria</div>
                    <div>{CATEGORY_LABELS[form.category] || form.category}</div>
                    <div className="text-slate-500">Stan</div>
                    <div>{CONDITION_OPTIONS.find(c => c.value === form.condition)?.label}</div>
                    <div className="text-slate-500">Ilość</div>
                    <div>{form.stock_quantity} szt.</div>
                    <div className="text-slate-500">Wartość przed</div>
                    <div className="font-mono">{product.purchase_price} PLN</div>
                    <div className="text-slate-500">Wartość po</div>
                    <div className="font-mono font-semibold">{form.purchase_price} PLN</div>
                    {parseFloat(form.suggested_sale_price) > 0 && <>
                      <div className="text-slate-500">Cena sprzedaży</div>
                      <div className="font-mono text-emerald-700">{form.suggested_sale_price} PLN</div>
                    </>}
                    {pallet && <>
                      <div className="text-slate-500">Paleta</div>
                      <div>{pallet.pallet_code}</div>
                    </>}
                    {(form.warehouse_zone || form.shelf || form.box_number) && <>
                      <div className="text-slate-500">Lokalizacja</div>
                      <div className="font-mono text-xs">{[form.warehouse_zone, form.shelf, form.box_number].filter(Boolean).join(" · ") || "—"}</div>
                    </>}
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
                    Powód: Identyfikacja nieznanego przedmiotu i przeklasyfikowanie na właściwy produkt
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                  <strong>Co się stanie po zatwierdzeniu:</strong>
                  <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                    <li>Stary produkt otrzyma status „Przeklasyfikowany"</li>
                    <li>Nowy produkt zostanie dodany do magazynu</li>
                    <li>Zostanie wygenerowany dokument DPT</li>
                    <li>Powiązanie z paletą zostanie zachowane</li>
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                    Wróć i popraw
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={handleConvert}
                    disabled={saving}
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Przetwarzam…</> : "Zatwierdź konwersję"}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP: done */}
            {!validationError && step === "done" && (
              <div className="p-6 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">Konwersja zakończona!</p>
                  <p className="text-sm text-slate-500 mt-1">Produkt <strong>{newProductSaved?.product_name}</strong> (SKU: {newProductSaved?.internal_code}) jest teraz na stanie magazynowym.</p>
                  <p className="text-xs text-slate-400 mt-1">Dokument DPT: <span className="font-mono font-semibold">{savedDpt?.document_number}</span></p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => exportDptPdf({
                      dptDoc: savedDpt,
                      sourceProduct: product,
                      newProduct: { ...newProductSaved, images },
                      pallet,
                      user,
                    })}
                  >
                    <FileText className="w-4 h-4" /> Pobierz PDF (DPT)
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { onConverted && onConverted(); onClose(); }}>
                    Zamknij
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}