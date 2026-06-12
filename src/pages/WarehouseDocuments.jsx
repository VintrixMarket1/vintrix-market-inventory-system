import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, FileText, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const TYPE_COLORS = {
  PZ: "bg-blue-100 text-blue-700",
  WZ: "bg-emerald-100 text-emerald-700",
  RW: "bg-orange-100 text-orange-700",
  MM: "bg-purple-100 text-purple-700",
  IN: "bg-slate-100 text-slate-700",
};

const TYPE_LABELS = {
  PZ: "Przyjęcie Zewnętrzne",
  WZ: "Wydanie Zewnętrzne",
  RW: "Rozchód Wewnętrzny",
  MM: "Przesunięcie Między-mag.",
  IN: "Inwentaryzacja",
};

function DocumentRow({ doc }) {
  const [expanded, setExpanded] = useState(false);
  const items = doc.items || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="shrink-0">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm text-slate-800">{doc.document_number}</span>
            <Badge className={`text-[10px] ${TYPE_COLORS[doc.document_type] || "bg-slate-100 text-slate-600"}`}>
              {doc.document_type} — {TYPE_LABELS[doc.document_type] || doc.document_type}
            </Badge>
            {doc.status === "draft" && <Badge className="text-[10px] bg-amber-100 text-amber-700">Roboczy</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span>Data: {doc.date ? format(new Date(doc.date), "dd.MM.yyyy") : "—"}</span>
            {doc.counterparty && <span>Kontrahent: {doc.counterparty}</span>}
            {doc.platform && doc.document_type === "WZ" && <span>Platforma: {doc.platform}</span>}
            {doc.reference_number && <span>Ref: {doc.reference_number}</span>}
            <span>{items.length} poz.</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-900">{(doc.total_value || 0).toFixed(2)} PLN</p>
          <p className="text-[10px] text-slate-400 mt-0.5">wartość</p>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {doc.notes && <p className="text-xs text-slate-500 mb-3 italic">Uwagi: {doc.notes}</p>}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-1.5 font-medium">Produkt</th>
                <th className="pb-1.5 font-medium">Kod SKU</th>
                <th className="pb-1.5 font-medium text-right">Ilość</th>
                <th className="pb-1.5 font-medium text-right">Cena jedn.</th>
                <th className="pb-1.5 font-medium text-right">Wartość</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 text-slate-700 font-medium max-w-[200px] truncate">{item.product_name}</td>
                  <td className="py-1.5 font-mono text-slate-400">{item.internal_code || "—"}</td>
                  <td className="py-1.5 text-right text-slate-700">{item.quantity} szt.</td>
                  <td className="py-1.5 text-right text-slate-500">{(item.unit_price || 0).toFixed(2)} PLN</td>
                  <td className="py-1.5 text-right font-semibold text-slate-700">{(item.total_value || 0).toFixed(2)} PLN</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 mt-1">
                <td colSpan={4} className="pt-2 text-right font-semibold text-slate-600">Razem:</td>
                <td className="pt-2 text-right font-bold text-slate-900">{(doc.total_value || 0).toFixed(2)} PLN</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function WarehouseDocuments() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["warehouse_documents"],
    queryFn: () => base44.entities.WarehouseDocument.list("-created_date"),
  });

  const filtered = docs.filter(d => {
    const searchMatch = !search ||
      d.document_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.counterparty?.toLowerCase().includes(search.toLowerCase()) ||
      d.items?.some(i => i.product_name?.toLowerCase().includes(search.toLowerCase()));
    const typeMatch = typeFilter === "all" || d.document_type === typeFilter;
    const docDate = d.date ? new Date(d.date) : null;
    const fromMatch = !dateFrom || (docDate && docDate >= new Date(dateFrom));
    const toMatch = !dateTo || (docDate && docDate <= new Date(dateTo));
    return searchMatch && typeMatch && fromMatch && toMatch;
  });

  const totalPZ = filtered.filter(d => d.document_type === "PZ").reduce((s, d) => s + (d.total_value || 0), 0);
  const totalWZ = filtered.filter(d => d.document_type === "WZ").reduce((s, d) => s + (d.total_value || 0), 0);

  const exportExcel = () => {
    const rows = [];
    for (const doc of filtered) {
      for (const item of (doc.items || [])) {
        rows.push({
          "Numer dokumentu": doc.document_number,
          "Typ": doc.document_type,
          "Data": doc.date || "",
          "Kontrahent": doc.counterparty || "",
          "Platforma": doc.platform || "",
          "Produkt": item.product_name || "",
          "SKU": item.internal_code || "",
          "Ilość": item.quantity || 0,
          "Cena jedn. (PLN)": item.unit_price || 0,
          "Wartość (PLN)": item.total_value || 0,
          "Uwagi": doc.notes || "",
        });
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dokumenty magazynowe");
    XLSX.writeFile(wb, `dokumenty_magazynowe_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dokumenty Magazynowe</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ewidencja ruchów magazynowych zgodna z ustawą o rachunkowości
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
          <Download className="w-4 h-4" /> Eksportuj Excel (JPK)
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Dokumenty</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-500 uppercase tracking-wider">Przyjęcia (PZ)</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{totalPZ.toFixed(0)} PLN</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-500 uppercase tracking-wider">Wydania (WZ)</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{totalWZ.toFixed(0)} PLN</p>
        </div>
        <div className={`rounded-xl border p-4 ${(totalPZ - totalWZ) >= 0 ? "bg-slate-50 border-slate-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Wartość zapasów</p>
          <p className={`text-xl font-bold mt-1 ${(totalPZ - totalWZ) >= 0 ? "text-slate-700" : "text-red-700"}`}>
            {(totalPZ - totalWZ).toFixed(0)} PLN
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Szukaj po numerze, produkcie, kontrahencie..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Typ dokumentu" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="PZ">PZ — Przyjęcie</SelectItem>
            <SelectItem value="WZ">WZ — Wydanie</SelectItem>
            <SelectItem value="RW">RW — Rozchód Wew.</SelectItem>
            <SelectItem value="MM">MM — Przesunięcie</SelectItem>
            <SelectItem value="IN">IN — Inwentaryzacja</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-full sm:w-36 h-9 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="Od" />
        <Input type="date" className="w-full sm:w-36 h-9 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="Do" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Brak dokumentów magazynowych</p>
          <p className="text-xs text-slate-400 mt-1">Dokumenty WZ są tworzone automatycznie przy rejestracji sprzedaży</p>
          <p className="text-xs text-slate-400">Dokumenty PZ — przy przyjęciu towaru (palety)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}