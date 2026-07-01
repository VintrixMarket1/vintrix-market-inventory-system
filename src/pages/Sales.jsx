import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, TrendingUp, TrendingDown, Calendar, Pencil, Loader2, ShoppingCart, Package, Globe, Receipt } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const platformColors = {
  vinted: "bg-teal-100 text-teal-700",
  olx: "bg-blue-100 text-blue-700",
  allegro: "bg-orange-100 text-orange-700",
  ebay: "bg-red-100 text-red-700",
  web_store: "bg-violet-100 text-violet-700",
};

const platformLabels = {
  vinted: "Vinted",
  olx: "OLX",
  allegro: "Allegro",
  ebay: "eBay",
  web_store: "Sklep Internetowy",
};

const platforms = [
  { value: "vinted", label: "Vinted" },
  { value: "olx", label: "OLX" },
  { value: "allegro", label: "Allegro" },
  { value: "ebay", label: "eBay" },
  { value: "web_store", label: "Sklep Internetowy" },
];

function EditSaleModal({ sale, onClose, onSaved }) {
  const [form, setForm] = useState({
    sale_price: sale.sale_price || "",
    purchase_price: sale.purchase_price || "",
    sale_date: sale.sale_date || "",
    platform: sale.platform || "vinted",
    product_name: sale.product_name || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.Sale.update(sale.id, {
      ...form,
      sale_price: parseFloat(form.sale_price) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const profit = (parseFloat(form.sale_price) || 0) - (parseFloat(form.purchase_price) || 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj sprzedaż</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-900">{sale.product_name || "Produkt"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Platforma</Label>
              <Select value={form.platform} onValueChange={v => handleChange("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data sprzedaży</Label>
              <Input type="date" value={form.sale_date} onChange={e => handleChange("sale_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cena sprzedaży (PLN)</Label>
              <Input type="number" value={form.sale_price} onChange={e => handleChange("sale_price", e.target.value)} className="border-emerald-300 focus-visible:ring-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <Label>Cena zakupu (PLN)</Label>
              <Input type="number" value={form.purchase_price} onChange={e => handleChange("purchase_price", e.target.value)} />
            </div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-600">Zysk</p>
            <p className={`text-lg font-bold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {profit >= 0 ? "+" : ""}{profit.toFixed(2)} PLN
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Anuluj</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Zapisz zmiany
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SalesFilters({ search, setSearch, platformFilter, setPlatformFilter, dateFrom, setDateFrom, dateTo, setDateTo, onExport, onFiscalExport }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Szukaj produktu..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Select value={platformFilter} onValueChange={setPlatformFilter}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Platforma" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie platformy</SelectItem>
          {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <Input type="date" className="w-36 h-9 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">–</span>
        <Input type="date" className="w-36 h-9 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>
      <Button variant="outline" size="sm" onClick={onFiscalExport} className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
        <Receipt className="w-4 h-4" /> Raport fiskalny
      </Button>
      <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
        <Download className="w-4 h-4" /> Excel
      </Button>
    </div>
  );
}

function SaleSummaryCards({ filtered }) {
  const totalRevenue = filtered.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const totalProfit = filtered.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.purchase_price || 0)), 0);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200/60 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Przychód</p>
        <p className="text-xl font-bold text-slate-900 mt-1">{totalRevenue.toFixed(0)} PLN</p>
        <p className="text-xs text-slate-400 mt-0.5">{filtered.length} sprzedaży</p>
      </div>
      <div className={`rounded-xl border p-4 ${totalProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        <p className="text-xs text-slate-500 uppercase tracking-wider">Zysk</p>
        <div className="flex items-center gap-1.5 mt-1">
          {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
          <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{totalProfit.toFixed(0)} PLN</p>
        </div>
      </div>
    </div>
  );
}

function SaleRow({ sale, onEdit, index }) {
  const profit = (sale.sale_price || 0) - (sale.purchase_price || 0);
  const datePrefix = sale.sale_date ? sale.sale_date.replace(/-/g, "") : "000000";
  const saleNumber = `${datePrefix}-${String(index + 1).padStart(3, "0")}`;
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-4">
      <div className="flex-shrink-0 text-[10px] font-mono text-slate-400 w-28 hidden sm:block">{saleNumber}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-slate-900 truncate">{sale.product_name || "Produkt"}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge className={`text-[10px] ${platformColors[sale.platform] || "bg-slate-100 text-slate-600"}`}>
            {platformLabels[sale.platform] || sale.platform}
          </Badge>
          <span className="text-xs text-slate-400">
            {sale.sale_date ? format(new Date(sale.sale_date), "dd.MM.yyyy") : ""}
          </span>
          {sale.customer_name && (
            <span className="text-xs text-slate-400 truncate max-w-[120px]">{sale.customer_name}</span>
          )}
          {sale.wz_document_number && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
              {sale.wz_document_number}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-slate-900">{(sale.sale_price || 0).toFixed(2)} PLN</p>
        <p className={`text-xs font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {profit >= 0 ? "+" : ""}{profit.toFixed(2)} PLN zysk
        </p>
      </div>
      {onEdit && (
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 flex-shrink-0" onClick={() => onEdit(sale)}>
          <Pencil className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

function SalesList({ sales, isLoading, onEdit, emptyMessage }) {
  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }
  if (sales.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">{emptyMessage || "Brak sprzedaży"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {sales.map((sale, i) => <SaleRow key={sale.id} sale={sale} onEdit={onEdit} index={i} />)}
    </div>
  );
}

export default function Sales() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingSale, setEditingSale] = useState(null);

  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_date"),
  });

  const { data: wzDocs = [] } = useQuery({
    queryKey: ["wz_docs_for_fiscal"],
    queryFn: () => base44.entities.WarehouseDocument.filter({ document_type: "WZ" }),
  });

  const wzBySaleId = useMemo(() => {
    const map = {};
    wzDocs.forEach(w => { if (w.sale_id) map[w.sale_id] = w; });
    return map;
  }, [wzDocs]);

  const applyFilters = (list) => list.filter(s => {
    const searchMatch = !search || s.product_name?.toLowerCase().includes(search.toLowerCase()) || s.customer_name?.toLowerCase().includes(search.toLowerCase());
    const platformMatch = platformFilter === "all" || s.platform === platformFilter;
    const saleDate = s.sale_date ? new Date(s.sale_date) : null;
    const fromMatch = !dateFrom || (saleDate && saleDate >= new Date(dateFrom));
    const toMatch = !dateTo || (saleDate && saleDate <= new Date(dateTo));
    return searchMatch && platformMatch && fromMatch && toMatch;
  });

  const webStoreSales = sales.filter(s => s.platform === "web_store");
  const allFiltered = applyFilters(sales);
  const webStoreFiltered = applyFilters(webStoreSales);

  const exportExcel = (list, suffix = "") => {
    const rows = list.map(s => ({
      "Data": s.sale_date || "",
      "Produkt": s.product_name || "",
      "Platforma": platformLabels[s.platform] || s.platform || "",
      "Klient": s.customer_name || "",
      "Email": s.customer_email || "",
      "Dostawa": s.shipping_option || "",
      "Cena sprzedaży (PLN)": s.sale_price || 0,
      "Cena zakupu (PLN)": s.purchase_price || 0,
      "Zysk (PLN)": parseFloat(((s.sale_price || 0) - (s.purchase_price || 0)).toFixed(2)),
      "Marża (%)": s.purchase_price > 0 ? parseFloat((((s.sale_price - s.purchase_price) / s.purchase_price) * 100).toFixed(2)) : "",
      "Dok. WZ": s.wz_document_number || "",
      "ID sprzedaży": s.id,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sprzedaż");
    const dateRange = dateFrom && dateTo ? `_${format(new Date(dateFrom), "yyyy-MM-dd")}-${format(new Date(dateTo), "yyyy-MM-dd")}` : "";
    XLSX.writeFile(wb, `sprzedaz${suffix}${dateRange}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportFiscalReport = (list) => {
    const VAT_RATE = 0.23;
    const sorted = [...list].sort((a, b) => {
      const da = a.sale_date || "";
      const db = b.sale_date || "";
      if (da !== db) return da.localeCompare(db);
      return (a.product_name || "").localeCompare(b.product_name || "");
    });

    const rows = [];
    let runningTotal = 0;

    let currentDate = null;
    let dayGross = 0;
    let dayNet = 0;
    let dayCount = 0;

    sorted.forEach((s, i) => {
      const gross = s.sale_price || 0;
      const net = parseFloat((gross / (1 + VAT_RATE)).toFixed(2));
      const vat = parseFloat((gross - net).toFixed(2));
      const date = s.sale_date || "—";

      // Nowy dzień — emituj podsumowanie poprzedniego dnia + pusty wiersz odstępu
      if (currentDate && currentDate !== date) {
        rows.push({
          "Data": "",
          "Produkt": `— PODSUMOWANIE DNIA ${format(new Date(currentDate), "dd.MM.yyyy")} —`,
          "Platforma": `${dayCount} szt.`,
          "Netto (PLN)": parseFloat(dayNet.toFixed(2)),
          "VAT 23% (PLN)": parseFloat((dayGross - dayNet).toFixed(2)),
          "Brutto (PLN)": parseFloat(dayGross.toFixed(2)),
          "Numer WZ": "",
        });
        rows.push({});
        dayGross = 0;
        dayNet = 0;
        dayCount = 0;
      }

      currentDate = date;
      dayGross += gross;
      dayNet += net;
      dayCount++;
      runningTotal += gross;

      const wzDoc = wzBySaleId[s.id];
      rows.push({
        "Data": s.sale_date ? format(new Date(s.sale_date), "dd.MM.yyyy") : "—",
        "Produkt": s.product_name || "—",
        "Platforma": platformLabels[s.platform] || s.platform || "—",
        "Netto (PLN)": net,
        "VAT 23% (PLN)": vat,
        "Brutto (PLN)": parseFloat(gross.toFixed(2)),
        "Numer WZ": s.wz_document_number || wzDoc?.document_number || "",
      });

      // Ostatni element — emituj podsumowanie ostatniego dnia
      if (i === sorted.length - 1 && currentDate) {
        rows.push({
          "Data": "",
          "Produkt": `— PODSUMOWANIE DNIA ${format(new Date(currentDate), "dd.MM.yyyy")} —`,
          "Platforma": `${dayCount} szt.`,
          "Netto (PLN)": parseFloat(dayNet.toFixed(2)),
          "VAT 23% (PLN)": parseFloat((dayGross - dayNet).toFixed(2)),
          "Brutto (PLN)": parseFloat(dayGross.toFixed(2)),
          "Numer WZ": "",
        });
      }
    });

    // Wiersz końcowy — suma całkowita
    const totalNet = parseFloat((runningTotal / (1 + VAT_RATE)).toFixed(2));
    const totalVat = parseFloat((runningTotal - totalNet).toFixed(2));
    rows.push({});
    rows.push({
      "Data": "",
      "Produkt": "RAZEM PRZYCHÓD",
      "Platforma": `${sorted.length} szt.`,
      "Netto (PLN)": totalNet,
      "VAT 23% (PLN)": totalVat,
      "Brutto (PLN)": parseFloat(runningTotal.toFixed(2)),
      "Numer WZ": "",
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: ["Data", "Produkt", "Platforma", "Netto (PLN)", "VAT 23% (PLN)", "Brutto (PLN)", "Numer WZ"] });
    ws["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

    // Nagłówek
    const header = [
      ["RAPORT FISKALNY — VINTRIX MARKET SP. Z O.O."],
      ["NIP: 7322230672"],
      [`Data generowania: ${format(new Date(), "dd.MM.yyyy HH:mm")}`],
      dateFrom || dateTo ? [`Okres: ${dateFrom ? format(new Date(dateFrom), "dd.MM.yyyy") : "..."} — ${dateTo ? format(new Date(dateTo), "dd.MM.yyyy") : "..."}`] : [""],
      [""],
    ];

    const wb = XLSX.utils.book_new();
    const wsHeader = XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(wsHeader, rows, { origin: "A6", header: ["Data", "Produkt", "Platforma", "Netto (PLN)", "VAT 23% (PLN)", "Brutto (PLN)", "Numer WZ"] });
    wsHeader["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsHeader, "Raport fiskalny");

    const dateRange = dateFrom && dateTo ? `_${format(new Date(dateFrom), "yyyy-MM-dd")}-${format(new Date(dateTo), "yyyy-MM-dd")}` : `_${new Date().toISOString().split("T")[0]}`;
    XLSX.writeFile(wb, `raport_fiskalny${dateRange}.xlsx`);
  };

  const onSaved = () => { queryClient.invalidateQueries({ queryKey: ["sales"] }); setEditingSale(null); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sprzedaż</h1>
          <p className="text-sm text-slate-500 mt-1">{sales.length} sprzedaży łącznie</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="gap-1.5">
            <Package className="w-4 h-4" /> Wszystkie ({sales.length})
          </TabsTrigger>
          <TabsTrigger value="web_store" className="gap-1.5">
            <Globe className="w-4 h-4" /> Sklep Internetowy ({webStoreSales.length})
          </TabsTrigger>
        </TabsList>

        {/* ALL SALES TAB */}
        <TabsContent value="all" className="space-y-4">
          <SaleSummaryCards filtered={allFiltered} />
          <SalesFilters
            search={search} setSearch={setSearch}
            platformFilter={platformFilter} setPlatformFilter={setPlatformFilter}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            onExport={() => exportExcel(allFiltered)}
            onFiscalExport={() => exportFiscalReport(allFiltered)}
          />
          <SalesList sales={allFiltered} isLoading={isLoading} onEdit={setEditingSale} emptyMessage="Brak sprzedaży spełniających kryteria" />
        </TabsContent>

        {/* WEB STORE TAB */}
        <TabsContent value="web_store" className="space-y-4">
          <SaleSummaryCards filtered={webStoreFiltered} />
          <SalesFilters
            search={search} setSearch={setSearch}
            platformFilter={platformFilter} setPlatformFilter={setPlatformFilter}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            onExport={() => exportExcel(webStoreFiltered, "_sklep")}
            onFiscalExport={() => exportFiscalReport(webStoreFiltered)}
          />
          {webStoreFiltered.length === 0 && !isLoading ? (
            <div className="text-center py-20">
              <Globe className="w-10 h-10 text-violet-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Brak sprzedaży przez sklep internetowy</p>
              <p className="text-xs text-slate-400 mt-1">Sprzedaże pojawią się tutaj po potwierdzeniu płatności przez Stripe</p>
            </div>
          ) : (
            <SalesList sales={webStoreFiltered} isLoading={isLoading} onEdit={setEditingSale} />
          )}
        </TabsContent>
      </Tabs>

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}