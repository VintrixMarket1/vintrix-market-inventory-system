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
  const [aiNotes, setAiNotes] = useState("");

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
        prompt: isPolish ? `### EKSPERT E-COMMERCE: ANALIZA PRODUKTU I COPYWRITING SPRZEDAŻOWY ###

Jesteś ekspertem od e-commerce i copywritingu sprzedażowego z 15-letnim doświadczeniem w sprzedaży second-hand. Przeanalizuj zdjęcia i stwórz materiały sprzedażowe które NAPRAWDĘ sprzedają.
${aiNotes ? `\n=== UWAGI OD SPRZEDAWCY (traktuj jako pewne informacje) ===\n${aiNotes}\n` : ""}
=== ANALIZA WIZUALNA ===
Przeanalizuj dokładnie zdjęcia i określ:
- product_name: pełna nazwa (marka + model/typ + główna cecha, np. "Nike Air Max 90 białe sneakersy")
- brand: dokładna marka (lub null jeśli nierozpoznawalna)
- category: clothing, shoes, accessories, electronics, home, toys, sports, books, other
- gender: men, women, unisex, kids, none
- condition: new (metki, nieużywany), like_new (minimalne ślady), used (widoczne użytkowanie)
- size: rozmiar jeśli widoczny na zdjęciach lub metkach
- color: dokładny kolor/kolory (opisowo, np. "głęboka czerń z białymi akcentami")
- notes: obiektywne obserwacje o stanie — widoczne wady, uszkodzenia, ślady użytkowania (null jeśli brak)

=== WYCENA RYNKOWA ===
- suggested_sale_price: realistyczna cena second-hand w PLN
  * Znane marki (Nike, Adidas, Apple, Samsung itp.): cena wyższa, 30-60% ceny nowej
  * Stan "jak nowy": cena bliżej górnej granicy
  * Stan "używany": cena 20-40% ceny nowej
  * Uwzględnij sezonowość i aktualny popyt

=== COPYWRITING SPRZEDAŻOWY ===
listing_title (MAX 60 znaków!):
- Format: [Marka] [Typ] [Kluczowa cecha] [Stan/Rozmiar]
- Przykłady: "Nike Air Force 1 białe r.42 jak nowe", "Płaszcz wełniany H&M oversize szary M"
- Zawsze konkretny, bez "super", "piękny", "polecam"

listing_description (czysty tekst, BEZ HTML, BEZ emoji):
- Zacznij od najmocniejszej cechy — tej która przyciągnie uwagę kupującego
- 3-5 zdań: co to jest i do czego służy, dlaczego warto (marka, jakość, popularność modelu), szczery opis stanu
- Zakończ konkretnymi parametrami (rozmiar, materiał, wymiary jeśli ważne)
- Pisz jak osoba polecająca produkt znajomemu — naturalnie, rzeczowo, bez bełkotu

=== FORMAT WYJŚCIOWY ===
JSON z polami: product_name, brand, category, gender, condition, size, color, suggested_sale_price, notes, listing_title, listing_description, confidence (0-1)
Jeśli nie możesz czegoś określić ze zdjęć — wstaw null.` : `### E-COMMERCE EXPERT: PRODUCT ANALYSIS & SALES COPYWRITING ###

You are an e-commerce and sales copywriting expert with 15 years of second-hand experience. Analyze the photos and create marketing materials that ACTUALLY sell.
${aiNotes ? `\n=== SELLER NOTES (treat as reliable facts) ===\n${aiNotes}\n` : ""}
=== VISUAL ANALYSIS ===
Carefully analyze the photos and determine:
- product_name: full name (brand + model/type + main feature, e.g. "Nike Air Max 90 White Sneakers")
- brand: exact brand name (or null if unrecognizable)
- category: clothing, shoes, accessories, electronics, home, toys, sports, books, other
- gender: men, women, unisex, kids, none
- condition: new (tags on, unused), like_new (minimal signs), used (visible wear)
- size: size if visible in photos or labels
- color: precise color description (e.g. "deep black with white accents")
- notes: objective condition observations — visible flaws, damage, wear (null if none)

=== MARKET PRICING ===
- suggested_sale_price: realistic second-hand price in PLN
  * Known brands (Nike, Adidas, Apple, Samsung etc.): higher price, 30-60% of retail
  * "Like new" condition: price toward upper end
  * "Used" condition: 20-40% of retail price
  * Consider seasonality and current demand

=== SALES COPYWRITING ===
listing_title (MAX 60 characters!):
- Format: [Brand] [Type] [Key feature] [Condition/Size]
- Examples: "Nike Air Force 1 white sz.42 like new", "H&M wool oversize coat grey M"
- Always specific, no "super", "beautiful", "highly recommend"

listing_description (plain text, NO HTML, NO emojis):
- Open with the strongest feature — the one that grabs the buyer's attention
- 3-5 sentences: what it is and its purpose, why it's worth buying (brand, quality, model popularity), honest condition description
- End with specific parameters (size, material, dimensions if relevant)
- Write like recommending a product to a friend — naturally, factually, without fluff

=== OUTPUT FORMAT ===
JSON with fields: product_name, brand, category, gender, condition, size, color, suggested_sale_price, notes, listing_title, listing_description, confidence (0-1)
If you cannot determine something from photos — use null.`,
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
    const internalCode = formData.internal_code?.trim()
      || `${(formData.category || "OTH").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-8)}`;
    await base44.entities.Product.create({
      ...formData,
      internal_code: internalCode,
      images: uploadedImages,
      pallet_id: palletId || null,
      ai_analyzed: true,
      ai_verified: true,
      status: "in_stock",
    });
    // Auto-update pallet status to sorting if still accepted
    if (palletId) {
      const pallets = await base44.entities.Pallet.filter({ id: palletId });
      const p = pallets?.[0];
      if (p && (p.status === "accepted" || p.status === "active")) {
        await base44.entities.Pallet.update(palletId, { status: "sorting" });
      }
    }
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
          aiNotes={aiNotes}
          onAiNotesChange={setAiNotes}
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