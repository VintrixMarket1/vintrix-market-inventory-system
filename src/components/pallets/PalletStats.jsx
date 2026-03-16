import React from "react";
import { TrendingUp, Package, DollarSign, BarChart2 } from "lucide-react";

export default function PalletStats({ products, sales, pallet }) {
  const palletProducts = products.filter(p => p.pallet_id === pallet.id);
  const palletProductIds = new Set(palletProducts.map(p => p.id));
  const palletSales = sales.filter(s => palletProductIds.has(s.product_id));

  const totalItems = palletProducts.length;
  const soldItems = palletProducts.filter(p => p.status === "sold").length;
  const revenue = palletSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const profit = revenue - (pallet.total_cost || 0);
  const roi = pallet.total_cost > 0 ? ((profit / pallet.total_cost) * 100).toFixed(1) : 0;
  const sellThrough = totalItems > 0 ? ((soldItems / totalItems) * 100).toFixed(0) : 0;

  const stats = [
    { label: "Total Items", value: totalItems, icon: Package, color: "text-blue-600 bg-blue-50" },
    { label: "Sold", value: `${soldItems}/${totalItems}`, icon: BarChart2, color: "text-purple-600 bg-purple-50" },
    { label: "Revenue", value: `${revenue.toFixed(0)} PLN`, icon: DollarSign, color: "text-amber-600 bg-amber-50" },
    { label: `ROI ${profit >= 0 ? "+" : ""}${profit.toFixed(0)} PLN`, value: `${roi}%`, icon: TrendingUp, color: profit >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
            <s.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="font-bold text-slate-900 text-sm">{s.value}</p>
          </div>
        </div>
      ))}
      <div className="col-span-2 md:col-span-4 bg-slate-50 rounded-xl border border-slate-200/60 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">Sell-through rate</span>
        <div className="flex items-center gap-3 flex-1 mx-4">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${sellThrough}%` }} />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-10 text-right">{sellThrough}%</span>
        </div>
      </div>
    </div>
  );
}