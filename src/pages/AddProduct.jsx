import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import ImageUploader from "@/components/add-product/ImageUploader";
import AiAnalysisStep from "@/components/add-product/AiAnalysisStep";
import ProductVerifyForm from "@/components/add-product/ProductVerifyForm";
import AiChatAssistant from "@/components/ai/AiChatAssistant";
import CopyFromCatalog from "@/components/add-product/CopyFromCatalog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Sparkles, Copy } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { generateDocumentNumber } from "@/lib/documentNumber";
import { useAuth } from "@/lib/AuthContext";

const STEPS = {
  UPLOAD: "upload",
  ANALYZING: "analyzing",
  VERIFY: "verify",
  DONE: "done",
};

export default function AddProduct() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const { userDisplayName } = useAuth();
  const [mode, setMode] = useState("ai"); // "ai" | "copy"
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [savedProduct, setSavedProduct] = useState(null);

  const handleImagesReady = (urls) => {
    setUploadedImages(urls);
  };

  const handleAnalyze = async () => {
    setStep(STEPS.ANALYZING);
    try {
      // Limit to 3 images to reduce memory/processing on mobile (same as conversion)
      const imagesForAnalysis = uploadedImages.slice(0, 3);

      const categoriesList = "clothing_men, clothing_women, clothing_kids, clothing_sport, shoes_men, shoes_women, shoes_kids, shoes_sport, accessories_bags, accessories_belts, accessories_hats, accessories_scarves, accessories_jewelry, accessories_watches, accessories_sunglasses, accessories_wallets, electronics_phones, electronics_tablets, electronics_laptops, electronics_audio, electronics_tv, electronics_cameras, electronics_gaming, electronics_accessories, home_furniture, home_kitchen, home_agd_large, home_agd_cleaning, home_agd_personal, home_agd_laundry, home_bedding, home_decor, home_lighting, home_garden, home_tools, home_bathroom, toys_kids, toys_board_games, toys_outdoor, toys_educational, toys_lego, toys_dolls, sports_fitness, sports_cycling, sports_winter, sports_water, sports_team, sports_outdoor, books_fiction, books_nonfiction, books_kids, books_comics, books_textbooks, beauty_cosmetics, beauty_perfumes, beauty_haircare, beauty_skincare, automotive_parts, automotive_accessories, automotive_tools, pet_food, pet_accessories, pet_clothing, food_supplements, health_medical, music_instruments, music_vinyl, art_paintings, art_collectibles, other";

      const combinedPrompt = `Jesteś ekspertem od identyfikacji i wyceny produktów na rynku wtórnym (OLX, Vinted, Allegro).
Przeanalizuj zdjęcia i/lub opis operatora. Zidentyfikuj produkt, wycen go i wygeneruj opis ogłoszenia.

Uwagi od operatora: ${aiNotes || "(brak uwag)"}
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
- Czysty tekst, BEZ HTML, BEZ tagów, BEZ markdown, BEZ emoji
- Zacznij od najmocniejszej cechy produktu — tej, która przyciąga uwagę kupującego
- Używaj konkretnych, opisowych przymiotników zamiast ogólników
- Podkreśl wartość (co kupujący zyska) a nie tylko cechy
- Stan opisz szczerze ale pozytywnie. Pisz naturalnie, angażująco — jak do znajomego
- 3-5 zdań: co to jest i do czego służy, dlaczego warto (marka, jakość), szczery opis stanu, konkretne parametry (rozmiar, kolor)
- Dla odzieży/obuwia/akcesoriów zacznij od: "Proszę sprawdzić wymiary przed zakupem!" jeśli rozmiar jest istotny

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

      setAiData(result);
      setStep(STEPS.VERIFY);
    } catch (e) {
      setStep(STEPS.UPLOAD);
      alert("Błąd analizy AI: " + e.message);
    }
  };

  const handleSave = async (formData, palletId, generatePZ) => {
    const internalCode = formData.internal_code?.trim()
      || `${(formData.category || "OTH").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}`;
    let product = null;
    let pzNumber = null;
    try {
      product = await base44.entities.Product.create({
        ...formData,
        internal_code: internalCode,
        images: uploadedImages,
        pallet_id: palletId || null,
        ai_analyzed: true,
        ai_verified: true,
        status: "in_stock",
      });
    } catch (err) {
      console.error("Product create failed:", err);
      throw err;
    }
    // Post-create operations — failures here should NOT block the success screen
    try {
      if (palletId) {
        const pallets = await base44.entities.Pallet.filter({ id: palletId });
        const p = pallets?.[0];
        if (p && (p.status === "accepted" || p.status === "active")) {
          await base44.entities.Pallet.update(palletId, { status: "sorting" });
        }
      }
      if (generatePZ && !palletId && product?.id) {
        const today = new Date().toISOString().split("T")[0];
        pzNumber = await generateDocumentNumber("PZ");
        const qty = formData.is_multi_item && formData.stock_quantity > 0 ? formData.stock_quantity : 1;
        const unitPrice = formData.purchase_price || 0;
        await base44.entities.WarehouseDocument.create({
          document_number: pzNumber,
          document_type: "PZ",
          date: today,
          status: "confirmed",
          counterparty: formData.brand || "—",
          notes: `Przyjęcie produktu: ${formData.product_name}`,
          created_by_name: userDisplayName,
          items: [{
            product_id: product.id,
            product_name: formData.product_name,
            internal_code: internalCode,
            category: formData.category || "",
            condition: formData.condition || "",
            quantity: qty,
            unit_price: unitPrice,
            total_value: unitPrice * qty,
          }],
          total_value: unitPrice * qty,
        });
      }
    } catch (err) {
      console.error("Post-create operation failed (product was saved):", err);
    }
    setSavedProduct({ pzNumber });
    setStep(STEPS.DONE);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/Inventory")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("ap_title")}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "copy" ? "Kopiuj produkt z bazy danych" :
                step === STEPS.UPLOAD ? t("ap_step1") :
                step === STEPS.ANALYZING ? t("ap_step2") :
                step === STEPS.VERIFY ? t("ap_step3") :
                t("ap_done")}
            </p>
          </div>
        </div>
        {mode === "ai" && (step === STEPS.UPLOAD || step === STEPS.VERIFY) && (
          <Button 
            variant="outline" 
            onClick={() => setShowChat(true)} 
            className="gap-2 text-emerald-600 border-emerald-200"
          >
            <MessageSquare className="w-4 h-4" /> {t("pf_chat_ai")}
          </Button>
        )}
      </div>

      {/* Mode switcher — only on first step */}
      {(mode === "ai" && step === STEPS.UPLOAD) || mode === "copy" ? (
        <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setMode("ai")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "ai" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Sparkles className="w-4 h-4" /> Analiza AI ze zdjęć
          </button>
          <button
            onClick={() => setMode("copy")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "copy" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Copy className="w-4 h-4" /> Kopiuj z bazy
          </button>
        </div>
      ) : null}

      {mode === "copy" && (
        <CopyFromCatalog
          onSaved={() => {}}
          onCancel={() => navigate("/Inventory")}
        />
      )}

      {mode === "ai" && step === STEPS.UPLOAD && (
        <ImageUploader
          onImagesReady={handleImagesReady}
          onAnalyze={handleAnalyze}
          uploadedImages={uploadedImages}
          aiNotes={aiNotes}
          onAiNotesChange={setAiNotes}
        />
      )}

      {mode === "ai" && step === STEPS.ANALYZING && <AiAnalysisStep />}

      {mode === "ai" && step === STEPS.VERIFY && (
        <ProductVerifyForm
          aiData={aiData}
          images={uploadedImages}
          onSave={handleSave}
          onBack={() => setStep(STEPS.UPLOAD)}
        />
      )}

      {mode === "ai" && step === STEPS.DONE && (() => {
        const palletId = new URLSearchParams(window.location.search).get("pallet_id");
        return (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-xl font-semibold">{t("ap_saved")}</h2>
            {savedProduct?.pzNumber && (
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
                <span>📄</span>
                <span>Wygenerowano PZ: <strong className="font-mono">{savedProduct.pzNumber}</strong></span>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => { setStep(STEPS.UPLOAD); setUploadedImages([]); setAiData(null); setSavedProduct(null); }}>
                {t("ap_add_another")}
              </Button>
              {palletId && (
                <Button variant="outline" onClick={() => navigate(`/PalletDetail?id=${palletId}`)}>
                  ← Wróć do palety
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/Inventory")}>
                {t("ap_go_inventory")}
              </Button>
            </div>
          </div>
        );
      })()}

      {mode === "ai" && showChat && step === STEPS.VERIFY && (
        <AiChatAssistant 
          product={aiData} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
}