import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ComplianceFields from "@/components/allegro/ComplianceFields";
import { ArrowLeft, Plus, Trash2, Save, Pencil, Building2 } from "lucide-react";

const EMPTY_TEMPLATE = {
  name: "",
  producer_name: "",
  producer_street: "ul. Przykładowa 1",
  producer_city: "Zgierz",
  producer_zip: "95-100",
  safety_type: "ROLE_FULFILLED_BY_MARKETPLACE",
  safety_url: "",
  invoice: "VAT",
  handling_time: "PT24H",
  notes: "",
  producer_trade_name: "", producer_country: "", producer_email: "",
  responsible_name: "", responsible_trade_name: "", responsible_street: "", responsible_city: "",
  responsible_zip: "", responsible_country: "", responsible_email: "",
  safety_text: "", match_categories: [],
};

const SAFETY_LABELS = {
  ROLE_FULFILLED_BY_MARKETPLACE: "Allegro odpowiada za bezpieczeństwo",
  NOT_APPLICABLE: "Nie dotyczy",
  DOCUMENT_URL: "Link do dokumentu bezpieczeństwa",
};

export default function AllegroTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [showForm, setShowForm] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["allegro_templates"],
    queryFn: () => base44.entities.AllegroTemplate.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) return base44.entities.AllegroTemplate.update(editingId, data);
      return base44.entities.AllegroTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allegro_templates"] });
      setForm(EMPTY_TEMPLATE);
      setEditingId(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AllegroTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allegro_templates"] }),
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEdit = (t) => {
    setForm({
      ...EMPTY_TEMPLATE,
      ...Object.fromEntries(Object.keys(EMPTY_TEMPLATE).filter(k => t[k] != null).map(k => [k, t[k]])),
      name: t.name || "",
      producer_name: t.producer_name || "",
      producer_street: t.producer_street || "",
      producer_city: t.producer_city || "",
      producer_zip: t.producer_zip || "",
      safety_type: t.safety_type || "ROLE_FULFILLED_BY_MARKETPLACE",
      safety_url: t.safety_url || "",
      invoice: t.invoice || "VAT",
      handling_time: t.handling_time || "PT24H",
      notes: t.notes || "",
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleNew = () => {
    setForm(EMPTY_TEMPLATE);
    setEditingId(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setForm(EMPTY_TEMPLATE);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/AllegroSettings")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-orange-500">Allegro</span> — Szablony wystawiania
          </h1>
          <p className="text-xs text-slate-500">Domyślne dane producenta i ustawienia bezpieczeństwa</p>
        </div>
        <Button onClick={handleNew} className="ml-auto bg-orange-500 hover:bg-orange-600 text-white gap-2" size="sm">
          <Plus className="w-4 h-4" /> Nowy szablon
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">
            {editingId ? "Edytuj szablon" : "Nowy szablon"}
          </h2>

          <div className="space-y-1.5">
            <Label className="text-xs">Nazwa szablonu *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="np. Odzież – Nike, Elektronika – Samsung" />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-medium text-slate-600 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Producent odpowiedzialny
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nazwa producenta *</Label>
                <Input value={form.producer_name} onChange={e => set("producer_name", e.target.value)} placeholder="np. Nike Inc., Adidas AG" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ulica i numer</Label>
                <Input value={form.producer_street} onChange={e => set("producer_street", e.target.value)} placeholder="ul. Przykładowa 1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Miasto</Label>
                  <Input value={form.producer_city} onChange={e => set("producer_city", e.target.value)} placeholder="Warszawa" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kod pocztowy</Label>
                  <Input value={form.producer_zip} onChange={e => set("producer_zip", e.target.value)} placeholder="00-000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kraj</Label>
                  <Input value={form.producer_country} onChange={e => set("producer_country", e.target.value)} placeholder="Chiny" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kontakt (email) *</Label>
                  <Input value={form.producer_email} onChange={e => set("producer_email", e.target.value)} placeholder="kontakt@producent.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nazwa własna (Allegro)</Label>
                  <Input value={form.producer_trade_name} onChange={e => set("producer_trade_name", e.target.value)} placeholder="np. Ciuchy" />
                </div>
              </div>
            </div>
          </div>

          <ComplianceFields form={form} set={set} />

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-medium text-slate-600 mb-1">Informacje o bezpieczeństwie</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Typ</Label>
              <Select value={form.safety_type} onValueChange={v => set("safety_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SAFETY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.safety_type === "DOCUMENT_URL" && (
              <div className="space-y-1.5">
                <Label className="text-xs">URL dokumentu bezpieczeństwa</Label>
                <Input value={form.safety_url} onChange={e => set("safety_url", e.target.value)} placeholder="https://..." />
              </div>
            )}
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Domyślna faktura</Label>
              <Select value={form.invoice} onValueChange={v => set("invoice", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAT">VAT</SelectItem>
                  <SelectItem value="NO_INVOICE">Bez faktury</SelectItem>
                  <SelectItem value="VAT_MARGIN">VAT marża</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Czas obsługi</Label>
              <Select value={form.handling_time} onValueChange={v => set("handling_time", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT24H">1 dzień roboczy</SelectItem>
                  <SelectItem value="PT48H">2 dni robocze</SelectItem>
                  <SelectItem value="PT72H">3 dni robocze</SelectItem>
                  <SelectItem value="P7D">7 dni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notatki (opcjonalne)</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="np. dla kategorii Odzież > Kurtki" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={handleCancel}>Anuluj</Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.producer_name}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Zapisuję..." : "Zapisz szablon"}
            </Button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {isLoading ? (
        <div className="text-center text-slate-400 py-8 text-sm">Ładowanie...</div>
      ) : templates.length === 0 && !showForm ? (
        <div className="bg-white border border-dashed rounded-xl p-10 text-center space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Brak szablonów</p>
          <p className="text-xs text-slate-400">Stwórz szablon z danymi producenta, żeby szybko wypełniać formularze wystawiania.</p>
          <Button onClick={handleNew} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white gap-2" size="sm">
            <Plus className="w-4 h-4" /> Utwórz pierwszy szablon
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-white border rounded-xl p-4 flex items-start gap-3 hover:border-slate-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.producer_name} · {t.producer_city} {t.producer_zip}</p>
                <p className="text-xs text-slate-400">{SAFETY_LABELS[t.safety_type]} · Faktura: {t.invoice} · {t.handling_time === "PT24H" ? "1 dzień" : t.handling_time === "PT48H" ? "2 dni" : t.handling_time === "PT72H" ? "3 dni" : "7 dni"}</p>
                {t.notes && <p className="text-xs text-slate-400 italic mt-0.5">{t.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleEdit(t)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                  onClick={() => { if (window.confirm("Usunąć ten szablon?")) deleteMutation.mutate(t.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}