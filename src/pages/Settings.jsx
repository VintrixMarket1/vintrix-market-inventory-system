import React, { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Globe, Check } from "lucide-react";

export default function Settings() {
  const { lang, setLang, t } = useLang();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(lang);

  const handleSave = () => {
    setLang(pending);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("settings_title")}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 p-6 space-y-5">
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
    </div>
  );
}