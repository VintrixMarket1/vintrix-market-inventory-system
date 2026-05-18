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
import { Sparkles, CheckCircle, ArrowLeft, Save } from "lucide-react";
import AiConfidenceBadge from "./AiConfidenceBadge";

const CATEGORIES = ["clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];
const CONDITIONS = ["new", "like_new", "used"];
const GENDERS = ["men", "women", "unisex", "kids", "none"];
const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const GENDER_LABELS = { men: "Mężczyzna", women: "Kobieta", unisex: "Unisex", kids: "Dzieci", none: "Brak" };

export default function ProductVerifyForm({ aiData, images, onSave, onBack }) {
  const [form, setForm] = useState({
    product_name: "",
    brand: "",
    category: "other",
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
          <p className="text-sm font-medium text-emerald-800">AI wypełniło formularz automatycznie</p>
          <p className="text-xs text-emerald-600">Sprawdź dane i popraw jeśli coś jest nieprawidłowe, następnie zapisz.</p>
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
          <Label>Nazwa produktu *</Label>
          <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Marka</Label>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="np. Nike, H&M" />
          </div>
          <div className="space-y-1.5">
            <Label>Kolor</Label>
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="np. czarny, granatowy" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Kategoria *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Przeznaczenie</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g} value={g}>{GENDER_LABELS[g]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stan *</Label>
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
            <Label>Rozmiar</Label>
            <Input value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="np. M, 42, XL" />
          </div>
          <div className="space-y-1.5">
            <Label>Suger. cena sprzedaży (PLN)</Label>
            <Input type="number" value={form.suggested_sale_price} onChange={(e) => set("suggested_sale_price", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cena zakupu (PLN)</Label>
            <Input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} placeholder="lub oblicz z palety" />
          </div>
        </div>

        {/* Pallet assignment */}
        <div className="space-y-1.5">
          <Label>Paleta (opcjonalnie)</Label>
          <Select value={selectedPallet} onValueChange={setSelectedPallet}>
            <SelectTrigger>
              <SelectValue placeholder="Przypisz do palety..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Brak palety</SelectItem>
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
            Tytuł ogłoszenia
            <Badge variant="outline" className="text-xs font-normal text-emerald-600 border-emerald-300">AI</Badge>
          </Label>
          <Input value={form.listing_title} onChange={(e) => set("listing_title", e.target.value)} maxLength={60} />
          <p className="text-xs text-muted-foreground text-right">{form.listing_title.length}/60</p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Opis ogłoszenia
            <Badge variant="outline" className="text-xs font-normal text-emerald-600 border-emerald-300">AI</Badge>
          </Label>
          <Textarea value={form.listing_description} onChange={(e) => set("listing_description", e.target.value)} rows={4} />
        </div>

        <div className="space-y-1.5">
          <Label>Notatki wewnętrzne</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Widoczne wady, uwagi dla magazynu..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Wróć
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
          Zapisz produkt
        </Button>
      </div>
    </div>
  );
}