import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Loader2 } from "lucide-react";

export default function Onboarding({ onComplete }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Imię i nazwisko są wymagane.");
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({ full_name: `${firstName.trim()} ${lastName.trim()}` });
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Vintrix Market</h1>
            <p className="text-xs text-slate-500">Witamy w aplikacji</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">Uzupełnij profil</h2>
        <p className="text-sm text-slate-500 mb-6">Podaj swoje imię i nazwisko, aby kontynuować.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Imię</Label>
            <Input
              placeholder="np. Jan"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nazwisko</Label>
            <Input
              placeholder="np. Kowalski"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Zapisz i kontynuuj
          </Button>
        </form>
      </div>
    </div>
  );
}