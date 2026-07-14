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
- category: jedna z wartości: clothing_men, clothing_women, clothing_kids, clothing_sport, shoes_men, shoes_women, shoes_kids, shoes_sport, accessories_bags, accessories_belts, accessories_hats, accessories_scarves, accessories_jewelry, accessories_watches, accessories_sunglasses, accessories_wallets, electronics_phones, electronics_tablets, electronics_laptops, electronics_audio, electronics_tv, electronics_cameras, electronics_gaming, electronics_accessories, home_furniture, home_kitchen, home_agd_large, home_agd_cleaning, home_agd_personal, home_agd_laundry, home_bedding, home_decor, home_lighting, home_garden, home_tools, home_bathroom, toys_kids, toys_board_games, toys_outdoor, toys_educational, toys_lego, toys_dolls, sports_fitness, sports_cycling, sports_winter, sports_water, sports_team, sports_outdoor, books_fiction, books_nonfiction, books_kids, books_comics, books_textbooks, beauty_cosmetics, beauty_perfumes, beauty_haircare, beauty_skincare, automotive_parts, automotive_accessories, automotive_tools, pet_food, pet_accessories, pet_clothing, food_supplements, health_medical, music_instruments, music_vinyl, art_paintings, art_collectibles, other
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
- category: one of: clothing_men, clothing_women, clothing_kids, clothing_sport, shoes_men, shoes_women, shoes_kids, shoes_sport, accessories_bags, accessories_belts, accessories_hats, accessories_scarves, accessories_jewelry, accessories_watches, accessories_sunglasses, accessories_wallets, electronics_phones, electronics_tablets, electronics_laptops, electronics_audio, electronics_tv, electronics_cameras, electronics_gaming, electronics_accessories, home_furniture, home_kitchen, home_agd_large, home_agd_cleaning, home_agd_personal, home_agd_laundry, home_bedding, home_decor, home_lighting, home_garden, home_tools, home_bathroom, toys_kids, toys_board_games, toys_outdoor, toys_educational, toys_lego, toys_dolls, sports_fitness, sports_cycling, sports_winter, sports_water, sports_team, sports_outdoor, books_fiction, books_nonfiction, books_kids, books_comics, books_textbooks, beauty_cosmetics, beauty_perfumes, beauty_haircare, beauty_skincare, automotive_parts, automotive_accessories, automotive_tools, pet_food, pet_accessories, pet_clothing, food_supplements, health_medical, music_instruments, music_vinyl, art_paintings, art_collectibles, other
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