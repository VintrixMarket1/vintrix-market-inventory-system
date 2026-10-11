import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

const PARAM_BATCH = 50;

export default function AllegroCategoryExport() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [stats, setStats] = useState({ checked: 0, leaves: 0, paramsDone: 0 });
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [incomplete, setIncomplete] = useState(false);

  const runExport = async () => {
    setRunning(true);
    setError(null);
    setSummary(null);
    setIncomplete(false);
    setStats({ checked: 0, leaves: 0, paramsDone: 0 });

    try {
      // 1. Kategorie główne
      setPhase("Pobieranie kategorii głównych...");
      const rootRes = await base44.functions.invoke("exportAllegroCategories", { mode: "children" });
      const rootData = rootRes.data ?? rootRes;
      let totalCategories = 0;

      // 2. Rekurencyjne przejście całego drzewa (BFS)
      const queue = (rootData.categories || []).map((c) => ({ ...c, path: c.name }));
      totalCategories += queue.length;
      const leaves = [];
      let checked = 0;
      let apiErrors = 0;

      const fetchChildren = async (node) => {
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await base44.functions.invoke("exportAllegroCategories", {
              mode: "children",
              parent_id: node.id,
            });
            return (res.data ?? res).categories || [];
          } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
        throw new Error(`Nie udało się pobrać podkategorii dla: ${node.path} (${lastErr?.message || "błąd"})`);
      };

      while (queue.length > 0) {
        const node = queue.shift();
        checked++;
        if (checked % 25 === 0) setStats((s) => ({ ...s, checked }));
        if (node.leaf) {
          leaves.push(node);
          setStats((s) => ({ ...s, checked, leaves: leaves.length }));
          continue;
        }
        const children = await fetchChildren(node);
        totalCategories += children.length;
        for (const c of children) {
          queue.push({ ...c, path: `${node.path} > ${c.name}` });
        }
      }
      setStats((s) => ({ ...s, checked, leaves: leaves.length }));

      if (leaves.length === 0) {
        throw new Error("Nie znaleziono żadnych kategorii końcowych.");
      }

      // 3. Parametry kategorii końcowych — w partiach, z ponawianiem
      setPhase("Pobieranie parametrów kategorii końcowych...");
      const paramResults = {};
      let paramsDone = 0;

      for (let i = 0; i < leaves.length; i += PARAM_BATCH) {
        const batchIds = leaves.slice(i, i + PARAM_BATCH).map((c) => c.id);
        let remaining = batchIds;

        for (let attempt = 0; attempt < 3 && remaining.length > 0; attempt++) {
          try {
            const pres = await base44.functions.invoke("exportAllegroCategories", {
              mode: "parameters",
              category_ids: remaining,
            });
            const pdata = pres.data ?? pres;
            Object.assign(paramResults, pdata.results || {});
            remaining = (pdata.failed || []).map((f) => (typeof f === "string" ? f : f.id));
          } catch (e) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }

        // Ostatnia próba: pojedynczo dla tych, które nadal nie mają parametrów
        const stillMissing = remaining.filter((id) => !paramResults[id]);
        for (const id of stillMissing) {
          try {
            const pres = await base44.functions.invoke("exportAllegroCategories", {
              mode: "parameters",
              category_ids: [id],
            });
            const pdata = pres.data ?? pres;
            Object.assign(paramResults, pdata.results || {});
          } catch (e) {
            /* policzone poniżej jako błąd */
          }
          paramsDone++;
          setStats((s) => ({ ...s, paramsDone }));
        }

        for (const id of remaining) {
          if (!paramResults[id]) apiErrors++;
        }
        paramsDone += remaining.length;
        setStats((s) => ({ ...s, paramsDone }));
      }

      if (apiErrors > 0) {
        setIncomplete(true);
      }

      // 4. Plik JSON
      setPhase("Tworzenie pliku JSON...");
      const payload = {
        exported_at: new Date().toISOString(),
        export_complete: apiErrors === 0,
        source: "Allegro API — /sale/categories + /sale/category-parameters",
        total_categories: totalCategories,
        checked_categories: checked,
        total_leaf_categories: leaves.length,
        errors: apiErrors,
        categories: leaves.map((c) => ({
          id: c.id,
          name: c.name,
          full_path: c.path,
          parent_id: c.parent_id,
          is_leaf: true,
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
        total: totalCategories,
        checked,
        leaves: leaves.length,
        errors: apiErrors,
      });
      setPhase("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Nieznany błąd");
      setPhase("");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800 text-sm">Eksport kategorii Allegro</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekurencyjnie pobiera całe drzewo kategorii aż do kategorii końcowych, zbiera parametry (EAN/GTIN, wymagane) i zapisuje do jednego pliku JSON.
          </p>
        </div>
        <Button onClick={runExport} disabled={running} size="sm" className="gap-1.5 shrink-0">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Eksport kategorii Allegro
        </Button>
      </div>

      {running && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500">{phase}</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <span className="font-semibold text-slate-800">{stats.checked}</span> sprawdzonych
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <span className="font-semibold text-slate-800">{stats.leaves}</span> końcowych
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <span className="font-semibold text-slate-800">{stats.paramsDone}</span> parametrów
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className={`text-xs rounded-lg p-2.5 flex items-center gap-2 ${incomplete ? "text-amber-700 bg-amber-50" : "text-slate-600 bg-slate-50"}`}>
          {incomplete ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
          )}
          <span>
            {incomplete
              ? `Eksport NIEUKOŃCZONY: ${summary.errors} kategorii z błędami. Sprawdzono ${summary.checked}/${summary.total} kategorii, pobrano parametry dla ${summary.leaves - summary.errors}. Uruchom ponownie eksport, aby uzupełnić.`
              : `Eksport ukończony: ${summary.total} kategorii, ${summary.leaves} kategorii końcowych — plik JSON został pobrany.`}
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