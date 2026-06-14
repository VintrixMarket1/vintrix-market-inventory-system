import React, { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { Globe, Check, ShoppingBag, Store, LogOut, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import ShopifySettings from "./ShopifySettings";
import AllegroSettings from "./AllegroSettings";

export default function Settings() {
  const { lang, setLang, t } = useLang();
  const { logout, user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(lang);
  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || "");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    setNameSaving(true);
    await base44.auth.updateMe({ display_name: displayName });
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleSave = () => {
    setLang(pending);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("settings_title")}</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="shopify"><ShoppingBag className="w-3.5 h-3.5 mr-1.5" />Shopify</TabsTrigger>
          <TabsTrigger value="allegro"><Store className="w-3.5 h-3.5 mr-1.5" />Allegro</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">

          {/* Display Name */}
          <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-4 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Imię i nazwisko</h2>
                <p className="text-xs text-slate-500">Wyświetlane w dokumentach magazynowych</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Wyświetlane imię i nazwisko</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="np. Patryk Rezner" />
            </div>
            <button
              onClick={handleSaveName}
              disabled={nameSaving}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                nameSaved ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {nameSaved ? "✓ Zapisano" : nameSaving ? "Zapisywanie..." : "Zapisz imię"}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-5 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t("settings_language")}</h2>
                <p className="text-xs text-slate-500">{t("settings_language_desc")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { code: "pl", label: "🇵🇱 Polski" },
                { code: "en", label: "🇬🇧 English" },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => setPending(code)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    pending === code
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span>{label}</span>
                  {pending === code && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{t("settings_ai_lang")}:</span>{" "}
              {t("settings_ai_lang_desc")}
            </div>

            <button
              onClick={handleSave}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                saved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {saved ? `✓ ${t("settings_saved")}` : t("settings_save")}
            </button>
          </div>

          {/* Logout */}
          <div className="bg-white rounded-xl border border-slate-200/60 p-6 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Wylogowanie</p>
                <p className="text-xs text-slate-500 mt-0.5">Zalogowany jako <span className="font-medium">{user?.email}</span></p>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Wyloguj
              </button>
            </div>
          </div>
        </TabsContent>

        {/* Shopify */}
        <TabsContent value="shopify">
          <ShopifySettings embedded />
        </TabsContent>

        {/* Allegro */}
        <TabsContent value="allegro">
          <AllegroSettings embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}