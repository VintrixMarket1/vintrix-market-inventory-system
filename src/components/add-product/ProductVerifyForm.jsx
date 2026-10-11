import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle, ArrowLeft, Package, Tag } from "lucide-react";
import AiConfidenceBadge from "./AiConfidenceBadge";
import { useLang } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import CategoryTreePicker from "@/components/categories/CategoryTreePicker";
import AllegroCategoryPicker from "@/components/listings/AllegroCategoryPicker";

const CONDITIONS = ["new", "like_new", "used"];
const GENDERS = ["men", "women", "unisex", "kids", "none"];

export default function ProductVerifyForm({ aiData, images, onSave, onBack }) {
  const { t, lang } = useLang();
  const isPolish = lang === "pl";

  const CONDITION_LABELS = {
    new: isPolish ? "Nowy" : "New",
    like_new: isPolish ? "Jak nowy" : "Like new",
    used: isPolish ? "Używany" : "Used",
  };
  const GENDER_LABELS = {
    men: isPolish ? "Mężczyzna" : "Men",
    women: isPolish ? "Kobieta" : "Women",
    unisex: "Unisex",
    kids: isPolish ? "Dzieci" : "Kids",
    none: isPolish ? "Brak" : "None",
  };

  const [form, setForm] = useState({
    product_name: "",
    brand: "",
    category: "other",
    subcategory: "",
    gender: "none",
    condition: "like_new",
    size: "",
    color: "",
    suggested_sale_price: "",
    notes: "",
    listing_title: "",
    listing_description: "",
    purchase_price: "",
    internal_code: "",
    warehouse_zone: "",
    shelf: "",
    box_number: "",
    is_multi_item: false,
    stock_quantity: "",
    allegro_category_id: "",
    allegro_category_path: "",
  });
  const [showAllegroPicker, setShowAllegroPicker] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatePZ, setGeneratePZ] = useState(false);

  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list(),
  });

  useEffect(() => {
    if (aiData) {
      setForm(prev => ({
        ...prev,
        product_name: aiData.product_name || "",
        brand: aiData.brand || "",
        category: aiData.category || "other",
        subcategory: aiData.subcategory || "",
        gender: aiData.gender || "none",
        condition: aiData.condition || "like_new",
        size: aiData.size || "",
        color: aiData.color || "",
        suggested_sale_price: aiData.suggested_sale_price || "",
        notes: aiData.notes || "",
        listing_title: aiData.listing_title || "",
        listing_description: aiData.listing_description || "",
        purchase_price: "",
        is_multi_item: aiData.is_multi_item || false,
        stock_quantity: aiData.stock_quantity || "",
      }));
    }
  }, [aiData]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          ...form,
          warehouse_zone: form.warehouse_zone || "",
          shelf: form.shelf || "",
          box_number: form.box_number || "",
          internal_code: form.internal_code || "",
          suggested_sale_price: parseFloat(form.suggested_sale_price) || 0,
          purchase_price: parseFloat(form.purchase_price) || 0,
          is_multi_item: !!form.is_multi_item,
          stock_quantity: form.is_multi_item ? (parseInt(form.stock_quantity) || 1) : null,
        },
        selectedPallet || null,
        generatePZ
      );
    } catch (err) {
      console.error("Save failed:", err);
      alert(isPolish ? "Błąd zapisu produktu: " + (err?.message || err) : "Save error: " + (err?.message || err));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* AI confidence banner */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-800">
            {isPolish ? "AI wypełniło formularz automatycznie" : "AI has filled the form automatically"}
          </p>
          <p className="text-xs text-emerald-600">
            {isPolish
              ? "Sprawdź dane i popraw jeśli coś jest nieprawidłowe, następnie zapisz."
              : "Review the data and correct anything that looks wrong, then save."}
          </p>
        </div>
        {aiData?.confidence != null && <AiConfidenceBadge confidence={aiData.confidence} />}
      </div>

      {/* Images preview */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((url, i) => (
          <img key={i} src={url} className="h-20 w-20 object-cover rounded-lg border shrink-0" alt="" />
        ))}
      </div>

      {/* Main fields */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>{isPolish ? "Nazwa produktu *" : "Product Name *"}</Label>
          <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isPolish ? "Marka" : "Brand"}</Label>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder={isPolish ? "np. Nike, H&M" : "e.g. Nike, H&M"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Kolor" : "Color"}</Label>
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder={isPolish ? "np. czarny, granatowy" : "e.g. black, navy"} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{isPolish ? "Kategoria *" : "Category *"}</Label>
          <CategoryTreePicker
            value={form.category}
            subcategory={form.subcategory || ""}
            showSubcategories
            maxHeight="max-h-52"
            onChange={(c, s) => { set("category", c); set("subcategory", s || ""); }}
          />
        </div>

        {/* Allegro category */}
        <div className="space-y-1.5">
          <Label>{isPolish ? "Kategoria Allegro (dla wystawiania ofert)" : "Allegro Category"}</Label>
          {form.allegro_category_id && !showAllegroPicker ? (
            <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-800 font-medium truncate flex-1">{form.allegro_category_path}</span>
              <button
                onClick={() => setShowAllegroPicker(true)}
                className="text-xs text-emerald-600 hover:text-emerald-800 underline shrink-0"
              >
                Zmień
              </button>
            </div>
          ) : (
            <AllegroCategoryPicker
              value={form.allegro_category_id || null}
              valuePath={form.allegro_category_path}
              onChange={(id, fullPath) => {
                set("allegro_category_id", id || "");
                set("allegro_category_path", fullPath || "");
                if (id) setShowAllegroPicker(false);
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {isPolish
              ? "Zapisz kategorię, aby przy wystawianiu na Allegro nie wybierać jej ponownie."
              : "Save the category so you don't have to pick it again when publishing to Allegro."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isPolish ? "Przeznaczenie" : "Gender"}</Label>
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Stan *" : "Condition *"}</Label>
            <select
              value={form.condition}
              onChange={(e) => set("condition", e.target.value)}
              className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>{isPolish ? "Rozmiar" : "Size"}</Label>
            <Input value={form.size} onChange={(e) => set("size", e.target.value)} placeholder={isPolish ? "np. M, 42, XL" : "e.g. M, 42, XL"} />
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Suger. cena sprzedaży (PLN)" : "Suggested Sale Price (PLN)"}</Label>
            <Input type="number" value={form.suggested_sale_price} onChange={(e) => set("suggested_sale_price", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Cena zakupu (PLN)" : "Purchase Price (PLN)"}</Label>
            <Input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} placeholder={isPolish ? "lub oblicz z palety" : "or calc from pallet"} />
          </div>
        </div>

        {/* Multi-item */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_multi_item}
              onChange={e => {
                set("is_multi_item", e.target.checked);
                if (!e.target.checked) set("stock_quantity", "");
              }}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            <Package className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{isPolish ? "Wielosztuka" : "Multi-item"}</span>
            <span className="text-xs text-slate-400">{isPolish ? "ten sam produkt w wielu sztukach" : "same product in multiple quantities"}</span>
          </label>
          {form.is_multi_item && (
            <div className="space-y-1.5 pl-6">
              <Label>{isPolish ? "Liczba sztuk" : "Stock quantity"}</Label>
              <Input
                type="number"
                min={1}
                value={form.stock_quantity}
                onChange={(e) => set("stock_quantity", e.target.value)}
                placeholder="50"
                className="max-w-[160px]"
              />
            </div>
          )}
        </div>

        {/* SKU + warehouse location */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{isPolish ? "Kod & Lokalizacja magazynowa" : "SKU & Warehouse Location"}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isPolish ? "Kod wewnętrzny (SKU)" : "Internal Code (SKU)"}</Label>
              <Input value={form.internal_code} onChange={(e) => set("internal_code", e.target.value)} placeholder="np. CLO-00123456" />
            </div>
            <div className="space-y-1.5">
              <Label>{isPolish ? "Strefa magazynowa" : "Warehouse Zone"}</Label>
              <Input value={form.warehouse_zone} onChange={(e) => set("warehouse_zone", e.target.value)} placeholder="A" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isPolish ? "Regał / półka" : "Shelf"}</Label>
              <Input value={form.shelf} onChange={(e) => set("shelf", e.target.value)} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>{isPolish ? "Numer pudełka" : "Box Number"}</Label>
              <Input value={form.box_number} onChange={(e) => set("box_number", e.target.value)} placeholder="12" />
            </div>
          </div>
        </div>

        {/* Pallet assignment */}
        <div className="space-y-1.5">
          <Label>{isPolish ? "Paleta (opcjonalnie)" : "Pallet (optional)"}</Label>
          <select
            value={selectedPallet || ""}
            onChange={(e) => setSelectedPallet(e.target.value || null)}
            className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{isPolish ? "Brak palety" : "No pallet"}</option>
            {pallets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pallet_code} — {p.investor_name}
              </option>
            ))}
          </select>
        </div>

        {/* Generate PZ option — only when no pallet assigned */}
        {!selectedPallet && (
          <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Checkbox
              id="generatePZ"
              checked={generatePZ}
              onCheckedChange={(v) => setGeneratePZ(!!v)}
            />
            <label htmlFor="generatePZ" className="text-sm font-medium text-blue-800 cursor-pointer select-none">
              {isPolish ? "Wygeneruj dokument PZ po zapisaniu" : "Generate PZ document after saving"}
            </label>
          </div>
        )}

        {/* Listing fields */}
        <div className="space-y-1.5 pt-2 border-t">
          <Label className="flex items-center gap-1.5">
            {isPolish ? "Tytuł ogłoszenia" : "Listing Title"}
            <Badge variant="outline" className="text-xs font-normal text-emerald-600 border-emerald-300">AI</Badge>
          </Label>
          <Input value={form.listing_title} onChange={(e) => set("listing_title", e.target.value)} maxLength={60} />
          <p className="text-xs text-muted-foreground text-right">{form.listing_title.length}/60</p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            {isPolish ? "Opis ogłoszenia" : "Listing Description"}
            <Badge variant="outline" className="text-xs font-normal text-emerald-600 border-emerald-300">AI</Badge>
          </Label>
          <Textarea value={form.listing_description} onChange={(e) => set("listing_description", e.target.value)} rows={4} />
        </div>

        <div className="space-y-1.5">
          <Label>{isPolish ? "Notatki wewnętrzne" : "Internal Notes"}</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder={isPolish ? "Widoczne wady, uwagi dla magazynu..." : "Visible defects, warehouse notes..."}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> {isPolish ? "Wróć" : "Back"}
        </Button>
        <Button
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={saving || !form.product_name}
          size="lg"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {isPolish ? "Zapisz produkt" : "Save product"}
        </Button>
      </div>
    </div>
  );
}