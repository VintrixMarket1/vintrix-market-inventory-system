import React from "react";
import { AlertTriangle } from "lucide-react";
import { resolveTemplate, isTemplateComplete } from "@/lib/allegroCsv";

export default function TemplateAssignSelect({ product, templates, onAssign }) {
  const resolved = resolveTemplate(product, templates);
  const ok = isTemplateComplete(resolved);
  return (
    <div className="flex items-center gap-1.5">
      {!ok && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Brak kompletnych danych producenta / osoby odpowiedzialnej" />}
      <select
        value={product.allegro_template_id || ""}
        onChange={e => onAssign(product, e.target.value)}
        className={`h-7 rounded-md border text-xs px-1.5 max-w-[160px] bg-white ${ok ? "border-slate-200" : "border-amber-300 text-amber-700"}`}
      >
        <option value="">{resolved && !product.allegro_template_id ? `Auto: ${resolved.name}` : "— brak szablonu —"}</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}