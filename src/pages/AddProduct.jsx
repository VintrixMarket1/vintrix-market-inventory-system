import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import ImageUploader from "@/components/add-product/ImageUploader";
import AiAnalysisStep from "@/components/add-product/AiAnalysisStep";
import ProductVerifyForm from "@/components/add-product/ProductVerifyForm";
import AiChatAssistant from "@/components/ai/AiChatAssistant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";

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
  const [showChat, setShowChat] = useState(false);

  const handleImagesReady = (urls) => {
    setUploadedImages(urls);
  };

  const handleAnalyze = async () => {
    setStep(STEPS.ANALYZING);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gpt_5_5",
        file_urls: uploadedImages,
        prompt: `### MASTER PROMPT: SPECJALISTA ONLINE MARKETINGU I ANALIZY PRODUKTÓW E-COMMERCE ###

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
  * Porównaj do podobnych ofert na Vinted/OLX/Allegro
  * Cena powinna być atrakcyjna ale nie zaniżona

**OPIS SPRZEDAŻOWY - TWOJA SPECJALNOŚĆ:**

Stwórz perswazyjne materiały sprzedażowe stosując techniki online marketingu:

**listing_title** (max 60 znaków):
- Ma być CHWYTLIWY i zawierać główną korzyść
- Uwzględnij markę, typ produktu, kluczową cechę
- Przykłady: "Stylowa Kurtka Nike - Oryginał, Stan Idealny"
- Unikaj: tanich chwytów, przesadnych twierdzeń

**listing_description** (3-5 zdań, język polski):
- **Zasada AIDA**: Attention → Interest → Desire → Action
- **Attention**: Zacznij od mocnego otwarcia (np. "Wyjątkowa okazja!")
- **Interest**: Podkreśl cechy produktu i jego zastosowanie
- **Desire**: Użyj języka korzyści - co klient zyskuje?
- **Action**: Delikatne wezwanie do działania

**TECHNIKI PERSWAZJI DO WYKORZYSTANIA:**
1. **Język korzyści**: Nie "ma rozmiar M", ale "idealnie dopasuje się do sylwetki"
2. **Społeczny dowód**: "Bestseller", "Tysiące zadowolonych klientów"
3. **Pilność**: "Ostatnia sztuka", "Okazja limited"
4. **Autorytet**: "Oryginalny produkt", "Spełnia normy UE"
5. **Odwrócenie ryzyka**: "Gwarancja satysfakcji", "14 dni na zwrot"

**SŁOWA MOCY:**
- ekskluzywny, premium, profesjonalny, sprawdzony, wyjątkowy
- styl, elegancja, komfort, wygoda, jakość, trwałość
- okazja, promocja, limitowany, unikalny, oryginalny

**STYL KOMUNIKACJI:**
- Profesjonalny ale przyjazny ton
- Zwracaj się do klienta ("Ty", "Twój")
- Pisz konkretnie, bez lania wody
- Buduj zaufanie poprzez szczerość (np. wspomnij o drobnych wadach)

=== FORMAT WYJŚCIOWY ===

Zwróć JSON z następującymi polami:
- product_name: string (pełna nazwa)
- brand: string | null
- category: string (jedna z dozwolonych)
- gender: string (jedna z dozwolonych)
- condition: string (jedna z: new, like_new, used)
- size: string | null
- color: string
- suggested_sale_price: number (realistyczna cena w PLN)
- notes: string (krótkie uwagi o stanie, wadach, cechach specjalnych)
- listing_title: string (max 60 znaków, perswazyjny)
- listing_description: string (3-5 zdań, język korzyści, AIDA)
- confidence: number (0-1, pewność analizy)

=== PRZYKŁAD DOBREJ ANALIZY ===

Produkt: Kurtka Nike
- product_name: "Kurtka Nike Windrunner Męska Czarna"
- brand: "Nike"
- category: "clothing"
- gender: "men"
- condition: "like_new"
- size: "L"
- color: "czarny"
- suggested_sale_price: 180
- notes: "Stan idealny, bez widocznych śladów użytkowania. Oryginalne zamki błyskawiczne YKK."
- listing_title: "Kurtka Nike Windrunner - Oryginalna, Stan Idealny, Szybka Wysyłka"
- listing_description: "Wyjątkowa okazja dla miłośników marki Nike! Ta stylowa kurtka Windrunner w kolorze czarnym to idealne połączenie sportowego stylu i codziennej wygody. Wykonana z wysokiej jakości materiałów, zapewnia komfort noszenia przez cały dzień. Stan jak nowy - bez żadnych widocznych śladów użytkowania. Doskonała zarówno na co dzień, jak i podczas aktywności sportowych. Szybka wysyłka w 24h, gwarancja oryginalności produktu. Nie przegap tej okazji!"
- confidence: 0.95

=== WAŻNE ===
- Jeśli czegoś nie możesz określić ze zdjęć, wstaw null
- Bądź szczery co do stanu produktu - zauważaj ewentualne wady
- Cena powinna być realistyczna dla rynku second-hand
- Opis ma SPRZEDAWAĆ, ale nie może być przesadzony

Stwórz analizę, która pomoże SZYBKO SPRZEDAĆ produkt!`,
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
            <h1 className="text-2xl font-bold">Dodaj produkt</h1>
            <p className="text-sm text-muted-foreground">
              {step === STEPS.UPLOAD && "Krok 1: Wgraj zdjęcia produktu"}
              {step === STEPS.ANALYZING && "Krok 2: AI analizuje produkt..."}
              {step === STEPS.VERIFY && "Krok 3: Zweryfikuj dane i zapisz"}
              {step === STEPS.DONE && "Produkt zapisany!"}
            </p>
          </div>
        </div>
        {(step === STEPS.UPLOAD || step === STEPS.VERIFY) && (
          <Button 
            variant="outline" 
            onClick={() => setShowChat(true)} 
            className="gap-2 text-emerald-600 border-emerald-200"
          >
            <MessageSquare className="w-4 h-4" /> Chat AI
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

      {showChat && step === STEPS.VERIFY && (
        <AiChatAssistant 
          product={aiData} 
          onClose={() => setShowChat(false)} 
        />
      )}
    </div>
  );
}