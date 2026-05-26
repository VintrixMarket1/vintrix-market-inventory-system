import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import ImageUploader from "@/components/add-product/ImageUploader";
import AiAnalysisStep from "@/components/add-product/AiAnalysisStep";
import ProductVerifyForm from "@/components/add-product/ProductVerifyForm";
import AiChatAssistant from "@/components/ai/AiChatAssistant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useLang } from "@/lib/i18n";

const STEPS = {
  UPLOAD: "upload",
  ANALYZING: "analyzing",
  VERIFY: "verify",
  DONE: "done",
};

export default function AddProduct() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const handleImagesReady = (urls) => {
    setUploadedImages(urls);
  };

  const handleAnalyze = async () => {
    setStep(STEPS.ANALYZING);
    try {
      const isPolish = lang === "pl";
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gpt_5_5",
        file_urls: uploadedImages,
        prompt: isPolish ? `### MASTER PROMPT: SPECJALISTA ONLINE MARKETINGU I ANALIZY PRODUKTÓW E-COMMERCE ###

Jesteś światowej klasy specjalistą od marketingu online, sprzedaży w e-commerce i analizy produktów second-hand/vintage z 15-letnim doświadczeniem. Twoje zadania:

1. **ANALIZA WIZUALNA**: Dokładnie przeanalizuj przesłane zdjęcia produktu
2. **WYCENA RYNKOWA**: Określ realną cenę rynkową second-hand
3. **COPYWRITING**: Stwórz perswazyjny tytuł i opis sprzedażowy

=== ZAKRES ANALIZY ===

Przeanalizuj zdjęcia i określ:

**DANE PODSTAWOWE:**
- product_name: pełna nazwa (marka + typ + kolor/wzór)
- brand: marka (lub "produkt bez marki" jeśli nie rozpoznasz)
- category: clothing, shoes, accessories, electronics, home, toys, sports, books, other
- gender: men, women, unisex, kids, none
- condition: new, like_new, used (oceń na podstawie stanu wizualnego)
- size: rozmiar jeśli widoczny na zdjęciach
- color: główny kolor/kolory

**WYCENA:**
- suggested_sale_price: realistyczna cena rynkowa second-hand w PLN
  * Uwzględnij: stan produktu, markę, typ produktu, sezonowość
  * Cena powinna być atrakcyjna ale nie zaniżona

**OPIS SPRZEDAŻOWY:**
- listing_title (max 60 znaków): chwytliwy, zawierający markę i główną cechę
- listing_description: naturalny, ludzki opis w stylu Vinted — czysty tekst BEZ żadnego HTML. Pisz jak prawdziwa osoba sprzedająca rzecz: krótki opis i zastosowanie, stan (co sprawdzono, co widać na zdjęciach), ewentualnie co w zestawie, kluczowe parametry. Krótkie zdania, konkretnie, bez marketingowego bełkotu, bez emoji.

=== FORMAT WYJŚCIOWY ===
Zwróć JSON z polami: product_name, brand, category, gender, condition, size, color, suggested_sale_price, notes, listing_title, listing_description, confidence (0-1)

- Jeśli czegoś nie możesz określić, wstaw null
- Cena realistyczna dla rynku second-hand PL
- Opis ma sprzedawać, ale nie może być przesadzony` : `### MASTER PROMPT: E-COMMERCE PRODUCT ANALYSIS SPECIALIST ###

You are a world-class e-commerce marketing specialist with 15 years of experience analyzing second-hand/vintage products. Your tasks:

1. **VISUAL ANALYSIS**: Carefully analyze the uploaded product photos
2. **MARKET PRICING**: Determine a realistic second-hand market price
3. **COPYWRITING**: Create a persuasive title and sales description

=== ANALYSIS SCOPE ===

Analyze the photos and determine:

**BASIC DATA:**
- product_name: full name (brand + type + color/pattern)
- brand: brand name (or "unbranded" if not recognized)
- category: clothing, shoes, accessories, electronics, home, toys, sports, books, other
- gender: men, women, unisex, kids, none
- condition: new, like_new, used (assess based on visual condition)
- size: size if visible in photos
- color: main color(s)

**PRICING:**
- suggested_sale_price: realistic second-hand market price in PLN
  * Consider: product condition, brand, product type, seasonality
  * Price should be attractive but not undervalued

**SALES COPY:**
- listing_title (max 60 chars): catchy, including brand and key feature
- listing_description: natural, human description in Vinted style — plain text with NO HTML whatsoever. Write like a real person selling second-hand: short description and use case, condition (what was checked, what's visible in photos), what's included if applicable, key specs. Short sentences, factual, no marketing fluff, no emojis.

=== OUTPUT FORMAT ===
Return JSON with fields: product_name, brand, category, gender, condition, size, color, suggested_sale_price, notes, listing_title, listing_description, confidence (0-1)

- If you cannot determine something from the photos, use null
- Price should be realistic for the second-hand market
- Description should sell, but must not be exaggerated`,
        response_json_schema: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          brand: { type: "string" },
          category: { type: "string" },
          gender: { type: "string" },
          condition: { type: "string" },
          size: { type: "string" },
          color: { type: "string" },
          suggested_sale_price: { type: "number" },
          notes: { type: "string" },
          listing_title: { type: "string" },
          listing_description: { type: "string" },
          confidence: { type: "number" },
        },
      },
      });
      setAiData(result);
      setStep(STEPS.VERIFY);
    } catch (e) {
      setStep(STEPS.UPLOAD);
      alert("Błąd analizy AI: " + e.message);
    }
  };

  const handleSave = async (formData, palletId) => {
    const internalCode = `${(formData.category || "OTH").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}`;
    await base44.entities.Product.create({
      ...formData,
      internal_code: internalCode,
      images: uploadedImages,
      pallet_id: palletId || null,
      ai_analyzed: true,
      ai_verified: true,
      status: "in_stock",
    });
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
              {step === STEPS.UPLOAD && t("ap_step1")}
              {step === STEPS.ANALYZING && t("ap_step2")}
              {step === STEPS.VERIFY && t("ap_step3")}
              {step === STEPS.DONE && t("ap_done")}
            </p>
          </div>
        </div>
        {(step === STEPS.UPLOAD || step === STEPS.VERIFY) && (
          <Button 
            variant="outline" 
            onClick={() => setShowChat(true)} 
            className="gap-2 text-emerald-600 border-emerald-200"
          >
            <MessageSquare className="w-4 h-4" /> {t("pf_chat_ai")}
          </Button>
        )}
      </div>

      {step === STEPS.UPLOAD && (
        <ImageUploader
          onImagesReady={handleImagesReady}
          onAnalyze={handleAnalyze}
          uploadedImages={uploadedImages}
        />
      )}

      {step === STEPS.ANALYZING && <AiAnalysisStep />}

      {step === STEPS.VERIFY && (
        <ProductVerifyForm
          aiData={aiData}
          images={uploadedImages}
          onSave={handleSave}
          onBack={() => setStep(STEPS.UPLOAD)}
        />
      )}

      {step === STEPS.DONE && (
        <div className="text-center py-16 space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-xl font-semibold">{t("ap_saved")}</h2>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setStep(STEPS.UPLOAD); setUploadedImages([]); setAiData(null); }}>
              {t("ap_add_another")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/Inventory")}>
              {t("ap_go_inventory")}
            </Button>
          </div>
        </div>
      )}

      {showChat && step === STEPS.VERIFY && (
        <AiChatAssistant 
          product={aiData} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
}