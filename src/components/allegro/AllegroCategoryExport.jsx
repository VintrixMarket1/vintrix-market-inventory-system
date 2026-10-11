import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

const BATCH_SIZE = 30;

export default function AllegroCategoryExport() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const runExport = async () => {
    setRunning(true);
    setError(null);
    setSummary(null);
    setProgress({ done: 0, total: 0 });

    try {
      setPhase("Pobieranie kategorii z Allegro...");
      const res = await base44.functions.invoke("exportAllegroCategories", { mode: "categories" });
      const tree = res.data ?? res;
      const leaves = tree.leaves || [];
      if (leaves.length === 0) {
        throw new Error("Nie pobrano żadnych kategorii.");
      }

      setPhase("Pobieranie parametrów podkategorii końcowych...");
      setProgress({ done: 0, total: leaves.length });

      const paramResults = {};
      const failedIds = [];

      for (let i = 0; i < leaves.length; i += BATCH_SIZE) {
        const batchIds = leaves.slice(i, i + BATCH_SIZE).map((c) => c.id);
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          try {
            const pres = await base44.functions.invoke("exportAllegroCategories", {
              mode: "parameters",
              category_ids: batchIds,
            });
            const pdata = pres.data ?? pres;
            Object.assign(paramResults, pdata.results || {});
            (pdata.failed || []).forEach((id) => failedIds.push(id));
            ok = true;
          } catch (e) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        if (!ok) failedIds.push(...batchIds);
        setProgress({ done: Math.min(i + BATCH_SIZE, leaves.length), total: leaves.length });
      }

      setPhase("Tworzenie pliku JSON...");

      const payload = {
        exported_at: new Date().toISOString(),
        source: "Allegro API — /sale/categories + /sale/category-parameters",
        total_categories: tree.total_categories,
        total_leaf_categories: leaves.length,
        failed_parameter_categories: failedIds.length,
        categories: leaves.map((c) => ({
          id: c.id,
          name: c.name,
          full_path: c.path,
          parent_id: c.parent_id,
          parameters: paramResults[c.id] || [],
          parameters_failed: !paramResults[c.id],
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `allegro-categories-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSummary({
        total: tree.total_categories,
        leaves: leaves.length,
        failed: failedIds.length,
      });
      setPhase("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Nieznany błąd");
      setPhase("");
    } finally {
      setRunning(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800 text-sm">Eksport kategorii Allegro</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Pobiera wszystkie kategorie i podkategorie końcowe wraz z pełnymi parametrami (m.in. EAN) i zapisuje do jednego pliku JSON.
          </p>
        </div>
        <Button onClick={runExport} disabled={running} size="sm" className="gap-1.5 shrink-0">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Eksport kategorii Allegro
        </Button>
      </div>

      {running && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{phase}</span>
            {progress.total > 0 && <span>{progress.done} / {progress.total} ({pct}%)</span>}
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {summary && (
        <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span>
            Pobrano {summary.leaves} podkategorii końcowych (z {summary.total} kategorii) — plik JSON został pobrany.
            {summary.failed > 0 && (
              <span className="text-amber-600"> Parametry nieudane dla {summary.failed} kategorii.</span>
            )}
          </span>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Błąd eksportu: {error}</span>
        </div>
      )}
    </div>
  );
}