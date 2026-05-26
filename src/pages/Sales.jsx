import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, TrendingUp, TrendingDown, Calendar, Pencil, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const platformColors = {
  vinted: "bg-teal-100 text-teal-700",
  olx: "bg-blue-100 text-blue-700",
  allegro: "bg-orange-100 text-orange-700",
  ebay: "bg-red-100 text-red-700",
};

const platforms = [
  { value: "vinted", label: "Vinted" },
  { value: "olx", label: "OLX" },
  { value: "allegro", label: "Allegro" },
  { value: "ebay", label: "eBay" },
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

  const filtered = sales.filter(s => {
    const searchMatch = !search || s.product_name?.toLowerCase().includes(search.toLowerCase());
    const platformMatch = platformFilter === "all" || s.platform === platformFilter;
    const saleDate = s.sale_date ? new Date(s.sale_date) : null;
    const fromMatch = !dateFrom || (saleDate && saleDate >= new Date(dateFrom));
    const toMatch = !dateTo || (saleDate && saleDate <= new Date(dateTo));
    return searchMatch && platformMatch && fromMatch && toMatch;
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
    const dateRange = dateFrom && dateTo ? `_${format(new Date(dateFrom), "yyyy-MM-dd")}-${format(new Date(dateTo), "yyyy-MM-dd")}` : "";
    XLSX.writeFile(wb, `sprzedaz${dateRange}_${new Date().toISOString().split("T")[0]}.xlsx`);
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
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Input
            type="date"
            className="w-36 h-9 text-sm"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="Od"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">-</span>
          <Input
            type="date"
            className="w-36 h-9 text-sm"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="Do"
          />
        </div>
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
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 flex-shrink-0" onClick={() => setEditingSale(sale)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["sales"] }); setEditingSale(null); }}
        />
      )}
    </div>
  );
}