import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const platformColors = {
  vinted: "bg-teal-100 text-teal-700",
  olx: "bg-blue-100 text-blue-700",
  allegro: "bg-orange-100 text-orange-700",
  ebay: "bg-red-100 text-red-700",
};

export default function Sales() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_date"),
  });

  const filtered = sales.filter(s => {
    const searchMatch = !search || s.product_name?.toLowerCase().includes(search.toLowerCase());
    const platformMatch = platformFilter === "all" || s.platform === platformFilter;
    return searchMatch && platformMatch;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const totalProfit = filtered.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.purchase_price || 0)), 0);

  const exportExcel = () => {
    const rows = filtered.map(s => ({
      "Data": s.sale_date || "",
      "Produkt": s.product_name || "",
      "Platforma": s.platform || "",
      "Cena sprzedaży (PLN)": s.sale_price || 0,
      "Cena zakupu (PLN)": s.purchase_price || 0,
      "Zysk (PLN)": parseFloat(((s.sale_price || 0) - (s.purchase_price || 0)).toFixed(2)),
      "Marża (%)": s.purchase_price > 0 ? parseFloat((((s.sale_price - s.purchase_price) / s.purchase_price) * 100).toFixed(2)) : "",
      "ID sprzedaży": s.id,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sprzedaż");
    XLSX.writeFile(wb, `sprzedaz_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} sales recorded</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
          <Download className="w-4 h-4" /> Eksportuj Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalRevenue.toFixed(0)} PLN</p>
        </div>
        <div className={`rounded-xl border p-4 ${totalProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Profit</p>
          <div className="flex items-center gap-1.5 mt-1">
            {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{totalProfit.toFixed(0)} PLN</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search sales..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="vinted">Vinted</SelectItem>
            <SelectItem value="olx">OLX</SelectItem>
            <SelectItem value="allegro">Allegro</SelectItem>
            <SelectItem value="ebay">eBay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">No sales recorded yet</p>
          <p className="text-xs text-slate-400 mt-1">Record sales from the Inventory page</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => {
            const profit = (sale.sale_price || 0) - (sale.purchase_price || 0);
            return (
              <div key={sale.id} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{sale.product_name || "Product"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${platformColors[sale.platform]}`}>
                      {sale.platform}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {sale.sale_date ? format(new Date(sale.sale_date), "MMM d, yyyy") : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">{sale.sale_price} PLN</p>
                  <p className={`text-xs font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {profit >= 0 ? "+" : ""}{profit.toFixed(0)} PLN profit
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}