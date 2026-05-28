import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle, ArrowLeft } from "lucide-react";
import AiConfidenceBadge from "./AiConfidenceBadge";
import { SUBCATEGORIES } from "@/lib/subcategories";
import { useLang } from "@/lib/i18n";

const CATEGORIES = ["clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];
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
  });
  const [selectedPallet, setSelectedPallet] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list(),
  });

  useEffect(() => {
    if (aiData) {
      setForm({
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
      });
    }
  }, [aiData]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(
      {
        ...form,
        suggested_sale_price: parseFloat(form.suggested_sale_price) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
      },
      selectedPallet || null
    );
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isPolish ? "Kategoria *" : "Category *"}</Label>
            <Select value={form.category} onValueChange={(v) => { set("category", v); set("subcategory", ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Podkategoria" : "Subcategory"}</Label>
            <Select value={form.subcategory || ""} onValueChange={(v) => set("subcategory", v)}>
              <SelectTrigger><SelectValue placeholder={isPolish ? "Wybierz..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {(SUBCATEGORIES[form.category] || []).map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isPolish ? "Przeznaczenie" : "Gender"}</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isPolish ? "Stan *" : "Condition *"}</Label>
            <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
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

        {/* Pallet assignment */}
        <div className="space-y-1.5">
          <Label>{isPolish ? "Paleta (opcjonalnie)" : "Pallet (optional)"}</Label>
          <Select value={selectedPallet} onValueChange={setSelectedPallet}>
            <SelectTrigger>
              <SelectValue placeholder={isPolish ? "Przypisz do palety..." : "Assign to pallet..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>{isPolish ? "Brak palety" : "No pallet"}</SelectItem>
              {pallets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.pallet_code} — {p.investor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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