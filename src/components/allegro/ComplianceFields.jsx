import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Party({ title, prefix, form, set }) {
  const f = (k, label, ph, span) => (
    <div className={`space-y-1.5 ${span ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      <Input value={form[`${prefix}_${k}`] || ""} onChange={e => set(`${prefix}_${k}`, e.target.value)} placeholder={ph} />
    </div>
  );
  return (
    <div className="border-t pt-4">
      <p className="text-xs font-medium text-slate-600 mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        {f("name", "Nazwa *", "np. KD EUROPE")}
        {f("trade_name", "Nazwa własna (Allegro)", "np. CIUCHY")}
        {f("street", "Ulica i numer *", "Stara Debszczyna 4", true)}
        {f("zip", "Kod pocztowy", "16-424")}
        {f("city", "Miasto *", "Filipów")}
        {f("country", "Kraj", "Polska")}
        {f("email", "Kontakt (email) *", "kontakt@firma.pl")}
      </div>
    </div>
  );
}

export default function ComplianceFields({ form, set }) {
  return (
    <>
      <Party title="Osoba odpowiedzialna (UE)" prefix="responsible" form={form} set={set} />
      <div className="border-t pt-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tekst informacji o bezpieczeństwie</Label>
          <Textarea rows={3} value={form.safety_text || ""} onChange={e => set("safety_text", e.target.value)}
            placeholder="np. Produkt nie zawiera małych elementów. Prać zgodnie z metką..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Automatyczne dopasowanie do kategorii (oddziel przecinkami)</Label>
          <Input value={(form.match_categories || []).join(", ")}
            onChange={e => set("match_categories", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
            placeholder="np. clothing, shoes_women" />
          <p className="text-[11px] text-slate-400">„clothing” obejmie wszystkie kategorie odzieży (clothing_men, clothing_women…).</p>
        </div>
      </div>
    </>
  );
}