import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import ImageUploader from "@/components/add-product/ImageUploader";
import AiAnalysisStep from "@/components/add-product/AiAnalysisStep";
import ProductVerifyForm from "@/components/add-product/ProductVerifyForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const STEPS = {
  UPLOAD: "upload",
  ANALYZING: "analyzing",
  VERIFY: "verify",
  DONE: "done",
};

export default function AddProduct() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [aiData, setAiData] = useState(null);

  const handleImagesReady = (urls) => {
    setUploadedImages(urls);
  };

  const handleAnalyze = async () => {
    setStep(STEPS.ANALYZING);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `Jesteś ekspertem od analizy produktów second-hand i vintage. Przeanalizuj zdjęcia produktu i wypełnij wszystkie pola formularza.

Zwróć JSON z następującymi polami:
- product_name: pełna nazwa produktu (marka + typ + kolor/wzór jeśli widoczny)
- brand: marka (jeśli rozpoznawalna, inaczej null)
- category: jedna z: clothing, shoes, accessories, electronics, home, toys, sports, books, other
- gender: jedna z: men, women, unisex, kids, none
- condition: jedna z: new, like_new, used (oceń na podstawie wyglądu)
- size: rozmiar jeśli widoczny (np. M, L, 42, XL), inaczej null
- color: główny kolor lub kolory produktu
- suggested_sale_price: sugerowana cena sprzedaży w PLN (realistyczna cena rynkowa second-hand)
- notes: krótkie dodatkowe uwagi (np. widoczne wady, specjalne cechy)
- listing_title: gotowy tytuł ogłoszenia (max 60 znaków, atrakcyjny)
- listing_description: pełny opis ogłoszenia (3-5 zdań, w języku polskim, bez ceny)
- confidence: od 0 do 1 jak pewny jesteś swojej analizy

Bądź konkretny i realistyczny. Jeśli czegoś nie możesz określić ze zdjęcia, wstaw null.`,
        file_urls: uploadedImages,
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
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/Inventory")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Dodaj produkt</h1>
          <p className="text-sm text-muted-foreground">
            {step === STEPS.UPLOAD && "Krok 1: Wgraj zdjęcia produktu"}
            {step === STEPS.ANALYZING && "Krok 2: AI analizuje produkt..."}
            {step === STEPS.VERIFY && "Krok 3: Zweryfikuj dane i zapisz"}
            {step === STEPS.DONE && "Produkt zapisany!"}
          </p>
        </div>
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
          <h2 className="text-xl font-semibold">Produkt został zapisany!</h2>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setStep(STEPS.UPLOAD); setUploadedImages([]); setAiData(null); }}>
              Dodaj kolejny
            </Button>
            <Button variant="outline" onClick={() => navigate("/Inventory")}>
              Przejdź do inwentarza
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}