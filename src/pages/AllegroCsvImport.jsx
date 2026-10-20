import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import AllegroCategoryPicker from "@/components/listings/AllegroCategoryPicker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Upload, Loader2, CheckCircle2, XCircle, FileSpreadsheet, AlertTriangle, Send } from "lucide-react";

// ————— Parsowanie CSV (separator ; lub , z obsługą cudzysłowów) —————
function parseCsvText(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] || "";
  const counts = {
    ";": (firstLine.match(/;/g) || []).length,
    ",": (firstLine.match(/,/g) || []).length,
  };
  const delim = counts[";"] >= counts[","] ? ";" : ",";
  const rows = [];
  let cur = [], cell = "", inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { cur.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      cur.push(cell); cell = "";
      if (cur.some(c => c.trim() !== "")) rows.push(cur);
      cur = [];
    } else cell += ch;
  }
  cur.push(cell);
  if (cur.some(c => c.trim() !== "")) rows.push(cur);
  return rows;
}

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AllegroCsvImport() {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [categoryPath, setCategoryPath] = useState("");
  const [params, setParams] = useState(null);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState(null);

  // ————— Szablon CSV z dokładnymi parametrami kategorii (z API Allegro) —————
  const loadParams = async (id) => {
    if (!id) return;
    setParamsLoading(true);
    setParams(null);
    setParsedRows([]);
    setResults(null);
    try {
      const res = await base44.functions.invoke("getAllegroParameters", { category_id: id });
      setParams(res.parameters || []);
    } catch (e) {
      toast({ title: "Błąd", description: e?.message || "Nie udało się pobrać parametrów kategorii", variant: "destructive" });
    } finally {
      setParamsLoading(false);
    }
  };

  const downloadTemplate = () => {
    if (!params || !categoryId) return;
    const baseCols = ["nazwa", "ean", "cena", "ilosc", "opis", "zdjecia"];
    const paramCols = params.map(p => {
      const vals = (p.values || []).map(v => v.name);
      const note = vals.length > 0 && vals.length <= 15 ? ` (${vals.join(" / ")})` : (vals.length > 15 ? " (dokładna wartość z katalogu Allegro)" : "");
      return `param|${p.id}|${p.name}${note}`;
    });
    const headers = [...baseCols, ...paramCols];
    const lines = [headers.map(csvCell).join(";")];
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `allegro-szablon-${categoryPath.replace(/[<>"/]/g, "").slice(0, 60) || categoryId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Szablon pobrany", description: `Kolumny parametrów: ${paramCols.length}` });
  };

  // ————— Import wypełnionego pliku —————
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResults(null);
    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length < 2) throw new Error("Plik nie zawiera danych (nagłówek + min. 1 wiersz).");
      const headers = rows[0].map(h => h.trim());
      const paramHeaderIdx = headers.map((h, i) => [h, i]).filter(([h]) => h.startsWith("param|"));
      const idx = (name) => headers.findIndex(h => h.toLowerCase() === name);

      const parsed = rows.slice(1).map(cells => {
        const row = {
          name: (cells[idx("nazwa")] || "").trim(),
          ean: (cells[idx("ean")] || "").trim(),
          price: (cells[idx("cena")] || "").trim(),
          quantity: (cells[idx("ilosc")] || "").trim(),
          description: (cells[idx("opis")] || "").trim(),
          images: (cells[idx("zdjecia")] || "").split("|").map(s => s.trim()).filter(Boolean),
          parameters: {},
          _issues: [],
        };
        for (const [h, i] of paramHeaderIdx) {
          const pid = h.split("|")[1];
          const val = (cells[i] || "").trim();
          if (val) row.parameters[pid] = val;
        }
        const priceNum = parseFloat(row.price.replace(",", "."));
        if (!row.name) row._issues.push("brak nazwy");
        if (isNaN(priceNum) || priceNum <= 0) row._issues.push("nieprawidłowa cena");
        if (row.images.length === 0) row._issues.push("brak zdjęć");
        return row;
      });
      if (parsed.length === 0) throw new Error("Brak wierszy z danymi.");
      setParsedRows(parsed);
    } catch (err) {
      toast({ title: "Błąd pliku", description: err.message, variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const publishRows = async () => {
    setPublishing(true);
    setResults(null);
    try {
      const payloadRows = parsedRows.map(r => ({
        name: r.name, ean: r.ean, price: r.price, quantity: r.quantity,
        description: r.description, images: r.images, parameters: r.parameters,
      }));
      const res = await base44.functions.invoke("bulkPublishAllegroCsv", {
        category_id: categoryId,
        rows: payloadRows,
        publish_active: true,
      });
      setResults(res.results || []);
    } catch (e) {
      toast({ title: "Błąd", description: e?.message || "Nie udało się wystawić ofert", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const okCount = (results || []).filter(r => r.ok).length;
  const validCount = parsedRows.filter(r => r._issues.length === 0).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allegro — masowe wystawianie z pliku CSV</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pobierz szablon z dokładnymi parametrami kategorii z API Allegro, wypełnij w Excelu i wystaw wiele ofert na raz.
        </p>
      </div>

      {/* Krok 1 — kategoria i szablon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">1. Wybierz kategorię Allegro i pobierz szablon</h2>
        <AllegroCategoryPicker
          value={categoryId}
          valuePath={categoryPath}
          onChange={(id, fullPath) => {
            setCategoryId(id || "");
            setCategoryPath(fullPath || "");
            if (id) loadParams(id);
            else { setParams(null); setParsedRows([]); }
          }}
        />
        {paramsLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Pobieram parametry z Allegro…</div>
        )}
        {params && params.length === 0 && (
          <p className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Ta kategoria nie ma wymaganych parametrów — szablon zawiera tylko podstawowe kolumny.</p>
        )}
        {params && params.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-slate-600">
                Parametry kategorii: <span className="font-semibold">{params.length}</span>
                {" "}({params.filter(p => p.required).length} wymaganych) — trafią do szablonu jako kolumny <code className="text-xs bg-slate-100 px-1 rounded">param|ID|Nazwa</code>
              </p>
              <Button size="sm" onClick={downloadTemplate} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4" /> Pobierz szablon CSV
              </Button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
              {params.map(p => (
                <div key={p.id} className="px-3 py-2 text-sm flex items-start gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${p.required ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.required ? "wymagany" : "opcjonalny"}
                  </span>
                  <span className="text-slate-800 font-medium">{p.name}</span>
                  {(p.values || []).length > 0 && (
                    <span className="text-xs text-slate-400 truncate">
                      dozwolone: {(p.values || []).slice(0, 8).map(v => v.name).join(", ")}{(p.values || []).length > 8 ? "…" : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Krok 2 — import pliku */}
      {params && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">2. Wgraj wypełniony plik</h2>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm shadow-sm hover:bg-accent">
              <Upload className="w-4 h-4" /> Wybierz plik CSV
            </span>
          </label>
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{parsedRows.length}</span> ofert w pliku
                {validCount < parsedRows.length && (
                  <span className="text-amber-600">· {parsedRows.length - validCount} z problemami (cena/nazwa/zdjęcia) — zostaną spróbowane, ale mogą się nie udać</span>
                )}
              </p>
              <div className="border border-slate-100 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">Nazwa</th>
                      <th className="px-2 py-2 text-left">Cena</th>
                      <th className="px-2 py-2 text-left">Ilość</th>
                      <th className="px-2 py-2 text-left">EAN</th>
                      <th className="px-2 py-2 text-left">Zdjęcia</th>
                      <th className="px-2 py-2 text-left">Parametry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r._issues.length > 0 ? "bg-amber-50" : ""}>
                        <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1.5 max-w-[220px] truncate text-slate-800">{r.name || <span className="text-red-500">brak</span>}</td>
                        <td className="px-2 py-1.5">{r.price || "—"}</td>
                        <td className="px-2 py-1.5">{r.quantity || 1}</td>
                        <td className="px-2 py-1.5 text-slate-500">{r.ean || "—"}</td>
                        <td className="px-2 py-1.5">{r.images.length > 0 ? `${r.images.length} ✓` : <span className="text-red-500">brak</span>}</td>
                        <td className="px-2 py-1.5 text-slate-500">{Object.keys(r.parameters).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={publishRows} disabled={publishing} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {publishing ? "Wystawiam…" : `Wystaw ${parsedRows.length} ofert na Allegro`}
              </Button>
              {publishing && <p className="text-xs text-slate-500">Wysyłanie wielu ofert może potrwać kilkadziesiąt sekund — każde zdjęcie jest przenoszone na serwery Allegro.</p>}
            </div>
          )}
        </div>
      )}

      {/* Krok 3 — wyniki */}
      {results && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">3. Wyniki</h2>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-emerald-600">{okCount}</span> wystawiono ·{" "}
            <span className="font-semibold text-red-600">{results.length - okCount}</span> niepowodzeń
          </p>
          <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {results.map(r => (
              <div key={r.index} className="px-3 py-2 text-sm flex items-start gap-2">
                {r.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-slate-800 truncate">{r.name || `Wiersz ${r.index + 1}`}</p>
                  {r.ok && r.offer_id && <p className="text-xs text-slate-400">ID oferty: {r.offer_id}</p>}
                  {r.ok && r.warning && <p className="text-xs text-amber-600">Ostrzeżenia: {r.warning}</p>}
                  {!r.ok && <p className="text-xs text-red-600 whitespace-pre-line">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}