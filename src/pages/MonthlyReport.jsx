import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Package, ShoppingCart, BarChart3, ArrowLeftRight } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const VAT_RATE = 0.23;
const toGross = (net) => net * (1 + VAT_RATE);
const toNet = (gross) => gross / (1 + VAT_RATE);

function StatCard({ label, net, gross, color = "slate", icon: Icon }) {
  const colors = {
    slate: "bg-white border-slate-200",
    blue: "bg-blue-50 border-blue-200",
    emerald: "bg-emerald-50 border-emerald-200",
    red: "bg-red-50 border-red-200",
    amber: "bg-amber-50 border-amber-200",
    purple: "bg-purple-50 border-purple-200",
  };
  const textColors = {
    slate: "text-slate-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={`w-4 h-4 ${textColors[color]}`} />}
      </div>
      <p className={`text-xl font-bold ${textColors[color]}`}>{net.toFixed(2)} PLN</p>
      <p className="text-xs text-slate-400 mt-0.5">brutto: {gross.toFixed(2)} PLN</p>
    </div>
  );
}

export default function MonthlyReport() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));

  const { data: docs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["warehouse_documents"],
    queryFn: () => base44.entities.WarehouseDocument.list("-date"),
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-sale_date"),
  });

  const isLoading = loadingDocs || loadingSales;

  const years = useMemo(() => {
    const ys = new Set();
    docs.forEach(d => { if (d.date) ys.add(new Date(d.date).getFullYear()); });
    sales.forEach(s => { if (s.sale_date) ys.add(new Date(s.sale_date).getFullYear()); });
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => b - a).map(String);
  }, [docs, sales]);

  const months = [
    { value: "01", label: "Styczeń" }, { value: "02", label: "Luty" },
    { value: "03", label: "Marzec" }, { value: "04", label: "Kwiecień" },
    { value: "05", label: "Maj" }, { value: "06", label: "Czerwiec" },
    { value: "07", label: "Lipiec" }, { value: "08", label: "Sierpień" },
    { value: "09", label: "Wrzesień" }, { value: "10", label: "Październik" },
    { value: "11", label: "Listopad" }, { value: "12", label: "Grudzień" },
  ];

  const filterByMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return (
      String(d.getFullYear()) === selectedYear &&
      String(d.getMonth() + 1).padStart(2, "0") === selectedMonth
    );
  };

  // Dokumenty w wybranym miesiącu
  const monthDocs = docs.filter(d => filterByMonth(d.date));
  const pzDocs = monthDocs.filter(d => d.document_type === "PZ");
  const wzDocs = monthDocs.filter(d => d.document_type === "WZ");
  const pwDocs = monthDocs.filter(d => d.document_type === "PW");
  const rwDocs = monthDocs.filter(d => d.document_type === "RW");
  const drpDocs = monthDocs.filter(d => d.document_type === "DRP");

  const sumNet = (arr) => arr.reduce((s, d) => s + (d.total_value || 0), 0);

  const pzNet = sumNet(pzDocs);
  const wzNet = sumNet(wzDocs);
  const pwNet = sumNet(pwDocs);
  const rwNet = sumNet(rwDocs);

  // Sprzedaże w miesiącu — sale_price jest BRUTTO (przeliczamy na netto przez /1.23),
  // purchase_price jest już NETTO (pochodzi z dokumentów PZ / kosztu palety)
  const monthSales = sales.filter(s => filterByMonth(s.sale_date));
  const totalRevenueNet = monthSales.reduce((s, x) => s + toNet(x.sale_price || 0), 0);
  const totalCostNet = monthSales.reduce((s, x) => s + (x.purchase_price || 0), 0);
  const totalProfitNet = totalRevenueNet - totalCostNet;
  const marginPct = totalCostNet > 0 ? (totalProfitNet / totalCostNet) * 100 : 0;

  // Stan magazynowy na koniec wybranego miesiąca — liczony narastająco z dokumentów
  // PZ + PW (przyjęcia) - WZ - RW (wydania), wszystkie dokumenty do końca wybranego miesiąca
  const isBeforeOrInMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, "0");
    if (y < selectedYear) return true;
    if (y > selectedYear) return false;
    return m <= selectedMonth;
  };

  const cumulativeDocs = docs.filter(d => isBeforeOrInMonth(d.date));

  // Stan z poprzedniego miesiąca — wszystkie dokumenty PRZED wybranym miesiącem
  const isBeforeMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, "0");
    if (y < selectedYear) return true;
    if (y > selectedYear) return false;
    return m < selectedMonth;
  };
  const prevMonthDocs = docs.filter(d => isBeforeMonth(d.date));
  const prevReceiptsNet = prevMonthDocs.filter(d => d.document_type === "PZ").reduce((s, d) => s + (d.total_value || 0), 0);
  const prevIssuesNet = prevMonthDocs.filter(d => d.document_type === "WZ").reduce((s, d) => s + (d.total_value || 0), 0);
  const prevStockValueNet = prevReceiptsNet - prevIssuesNet;

  // Przyjęcia i wydania w danym miesiącu — tylko PZ i WZ
  const monthReceiptsNet = pzNet;
  const monthIssuesNet = wzNet;

  // Stan na koniec miesiąca
  const totalStockValueNet = prevStockValueNet + monthReceiptsNet - monthIssuesNet;
  const cumulativeReceiptsNet = prevReceiptsNet + monthReceiptsNet;
  const cumulativeIssuesNet = prevIssuesNet + monthIssuesNet;

  // Podział sprzedaży per platforma — sale_price jest brutto (przeliczamy przez /1.23), purchase_price jest netto
  const byPlatform = monthSales.reduce((acc, s) => {
    const p = s.platform || "inne";
    if (!acc[p]) acc[p] = { count: 0, revenueNet: 0, profitNet: 0 };
    acc[p].count++;
    acc[p].revenueNet += toNet(s.sale_price || 0);
    acc[p].profitNet += toNet(s.sale_price || 0) - (s.purchase_price || 0);
    return acc;
  }, {});

  const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Arkusz 1 — Podsumowanie
    const summary = [
      ["RAPORT MIESIĘCZNY — VINTRIX MARKET SP. Z O.O.", "", ""],
      ["NIP: 7322230672", "", ""],
      [`Okres: ${monthLabel} ${selectedYear}`, "", ""],
      ["", "", ""],
      ["KATEGORIA", "NETTO (PLN)", "BRUTTO (PLN)"],
      ["Przyjęcia zewnętrzne (PZ)", pzNet.toFixed(2), toGross(pzNet).toFixed(2)],
      ["Wydania zewnętrzne (WZ)", wzNet.toFixed(2), toGross(wzNet).toFixed(2)],
      ["Przyjęcia wewnętrzne (PW)", pwNet.toFixed(2), toGross(pwNet).toFixed(2)],
      ["Rozchód wewnętrzny (RW)", rwNet.toFixed(2), toGross(rwNet).toFixed(2)],
      ["", "", ""],
      ["SPRZEDAŻ", "NETTO (PLN)", "BRUTTO (PLN)"],
      ["Przychód ze sprzedaży", totalRevenueNet.toFixed(2), toGross(totalRevenueNet).toFixed(2)],
      ["Koszt własny sprzedaży", totalCostNet.toFixed(2), toGross(totalCostNet).toFixed(2)],
      ["Zysk brutto ze sprzedaży", totalProfitNet.toFixed(2), toGross(totalProfitNet).toFixed(2)],
      [`Marża (%)`, `${marginPct.toFixed(1)}%`, `${marginPct.toFixed(1)}%`],
      ["", "", ""],
      ["STAN MAGAZYNOWY", "NETTO (PLN)", "BRUTTO (PLN)"],
      ["Stan z poprzedniego miesiąca", prevStockValueNet.toFixed(2), toGross(prevStockValueNet).toFixed(2)],
      ["Przyjęcia w danym miesiącu", monthReceiptsNet.toFixed(2), toGross(monthReceiptsNet).toFixed(2)],
      ["Wydania w danym miesiącu", monthIssuesNet.toFixed(2), toGross(monthIssuesNet).toFixed(2)],
      ["Stan magazynu na koniec miesiąca", totalStockValueNet.toFixed(2), toGross(totalStockValueNet).toFixed(2)],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    ws1["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Podsumowanie");

    // Arkusz 2 — Sprzedaże (sale_price jest brutto, purchase_price jest netto)
    const salesRows = monthSales.map((s, i) => ({
      "Lp.": i + 1,
      "Data": s.sale_date || "",
      "Produkt": s.product_name || "",
      "Platforma": s.platform || "",
      "Klient": s.customer_name || "",
      "Przychód netto (PLN)": parseFloat(toNet(s.sale_price || 0).toFixed(2)),
      "Przychód brutto (PLN)": parseFloat((s.sale_price || 0).toFixed(2)),
      "Koszt netto (PLN)": parseFloat((s.purchase_price || 0).toFixed(2)),
      "Koszt brutto (PLN)": parseFloat(toGross(s.purchase_price || 0).toFixed(2)),
      "Zysk netto (PLN)": parseFloat((toNet(s.sale_price || 0) - (s.purchase_price || 0)).toFixed(2)),
      "Dok. WZ": s.wz_document_number || "",
    }));
    const ws2 = XLSX.utils.json_to_sheet(salesRows);
    ws2["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Sprzedaże");

    // Arkusz 3 — Dokumenty narastająco (stan magazynowy)
    const stockDocRows = cumulativeDocs.map((d, i) => ({
      "Lp.": i + 1,
      "Data": d.date || "",
      "Numer dokumentu": d.document_number || "",
      "Typ": d.document_type || "",
      "Kontrahent": d.counterparty || "",
      "Wartość netto (PLN)": d.total_value || 0,
      "Wartość brutto (PLN)": parseFloat(toGross(d.total_value || 0).toFixed(2)),
    }));
    const ws3 = XLSX.utils.json_to_sheet(stockDocRows);
    ws3["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 20 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Stan magazynowy - dokumenty");

    XLSX.writeFile(wb, `raport_${selectedYear}_${selectedMonth}_vintrix.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Raport Miesięczny</h1>
          <p className="text-sm text-slate-500 mt-1">Podsumowanie finansowe i magazynowe dla księgowej — netto i brutto (VAT 23%)</p>
        </div>
        <Button onClick={exportExcel} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-4 h-4" /> Eksportuj do Excel
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <span className="text-sm font-medium text-slate-600">Okres:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400 ml-2">Stawka VAT: 23%</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Sales summary */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Sprzedaż — {monthLabel} {selectedYear}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Przychód" net={totalRevenueNet} gross={toGross(totalRevenueNet)} color="blue" icon={ShoppingCart} />
              <StatCard label="Koszt własny" net={totalCostNet} gross={toGross(totalCostNet)} color="amber" icon={Package} />
              <StatCard label={totalProfitNet >= 0 ? "Zysk" : "Strata"} net={totalProfitNet} gross={toGross(totalProfitNet)} color={totalProfitNet >= 0 ? "emerald" : "red"} icon={totalProfitNet >= 0 ? TrendingUp : TrendingDown} />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Marża</p>
                <p className="text-xl font-bold text-slate-700">{marginPct.toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-0.5">{monthSales.length} sprzedaży</p>
              </div>
            </div>
          </div>

          {/* Warehouse documents */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Dokumenty magazynowe — {monthLabel} {selectedYear}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Przyjęcia (PZ)" net={pzNet} gross={toGross(pzNet)} color="blue" icon={ArrowLeftRight} />
              <StatCard label="Wydania (WZ)" net={wzNet} gross={toGross(wzNet)} color="emerald" icon={ArrowLeftRight} />
              <StatCard label="Przyjęcia wewn. (PW)" net={pwNet} gross={toGross(pwNet)} color="purple" icon={ArrowLeftRight} />
              <StatCard label="Rozchód wewn. (RW)" net={rwNet} gross={toGross(rwNet)} color="amber" icon={ArrowLeftRight} />
            </div>
          </div>

          {/* Stock value */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Stan magazynowy — {monthLabel} {selectedYear}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Stan z poprzedniego miesiąca</p>
                <p className="text-xl font-bold text-slate-900">{prevStockValueNet.toFixed(2)} PLN</p>
                <p className="text-xs text-slate-400 mt-0.5">netto</p>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-2">Przyjęcia w danym miesiącu</p>
                <p className="text-xl font-bold text-emerald-900">{monthReceiptsNet.toFixed(2)} PLN</p>
                <p className="text-xs text-emerald-400 mt-0.5">PZ + PW netto</p>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">Wydania w danym miesiącu</p>
                <p className="text-xl font-bold text-amber-900">{monthIssuesNet.toFixed(2)} PLN</p>
                <p className="text-xs text-amber-400 mt-0.5">WZ + RW netto</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">Stan na koniec miesiąca</p>
                <p className="text-xl font-bold text-blue-900">{totalStockValueNet.toFixed(2)} PLN</p>
                <p className="text-xs text-blue-400 mt-0.5">brutto: {toGross(totalStockValueNet).toFixed(2)} PLN</p>
              </div>
            </div>
          </div>

          {/* By platform */}
          {Object.keys(byPlatform).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Sprzedaż per platforma</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                      <th className="text-left px-4 py-3 font-medium">Platforma</th>
                      <th className="text-right px-4 py-3 font-medium">Sprzedaży</th>
                      <th className="text-right px-4 py-3 font-medium">Przychód netto</th>
                      <th className="text-right px-4 py-3 font-medium">Przychód brutto</th>
                      <th className="text-right px-4 py-3 font-medium">Zysk netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byPlatform).map(([plat, data]) => (
                      <tr key={plat} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-700 capitalize">{plat}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{data.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{data.revenueNet.toFixed(2)} PLN</td>
                        <td className="px-4 py-3 text-right text-slate-500">{toGross(data.revenueNet).toFixed(2)} PLN</td>
                        <td className={`px-4 py-3 text-right font-semibold ${data.profitNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {data.profitNet >= 0 ? "+" : ""}{data.profitNet.toFixed(2)} PLN
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-700">Razem</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{monthSales.length}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{totalRevenueNet.toFixed(2)} PLN</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{toGross(totalRevenueNet).toFixed(2)} PLN</td>
                      <td className={`px-4 py-3 text-right font-bold ${totalProfitNet >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {totalProfitNet >= 0 ? "+" : ""}{totalProfitNet.toFixed(2)} PLN
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Sales detail */}
          {monthSales.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Lista sprzedaży ({monthSales.length})</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase">
                      <th className="text-left px-4 py-2.5 font-medium">Data</th>
                      <th className="text-left px-4 py-2.5 font-medium">Produkt</th>
                      <th className="text-left px-4 py-2.5 font-medium">Platforma</th>
                      <th className="text-right px-4 py-2.5 font-medium">Przychód netto</th>
                      <th className="text-right px-4 py-2.5 font-medium">Przychód brutto</th>
                      <th className="text-right px-4 py-2.5 font-medium">Koszt netto</th>
                      <th className="text-right px-4 py-2.5 font-medium">Zysk netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthSales.map((s) => {
                      const salePriceNet = toNet(s.sale_price || 0);
                      const purchasePriceNet = s.purchase_price || 0;
                      const profit = salePriceNet - purchasePriceNet;
                      return (
                        <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-500">{s.sale_date ? format(new Date(s.sale_date), "dd.MM.yyyy") : "—"}</td>
                          <td className="px-4 py-2.5 text-slate-800 font-medium max-w-[200px] truncate">{s.product_name || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500 capitalize">{s.platform || "—"}</td>
                          <td className="px-4 py-2.5 text-right text-slate-900 font-semibold">{salePriceNet.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{(s.sale_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{purchasePriceNet.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}