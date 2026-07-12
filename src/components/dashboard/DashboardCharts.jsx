import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from "recharts";
import { BarChart3, Layers, Tag } from "lucide-react";
import { CATEGORY_GROUPS, getCategoryLabel } from "@/lib/categoryConfig";
import { useLang } from "@/lib/i18n";

const VAT_DIVISOR = 1.23;
const PALETTE = ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444", "#3b82f6"];

function monthKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key, lang) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", { month: "short", year: "2-digit" });
}

export default function DashboardCharts({ sales, products, pallets }) {
  const { lang } = useLang();

  // Product lookup map
  const productMap = useMemo(() => {
    const m = new Map();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  // Pallet lookup map
  const palletMap = useMemo(() => {
    const m = new Map();
    pallets.forEach(p => m.set(p.id, p));
    return m;
  }, [pallets]);

  // Enriched sales with net values
  const enrichedSales = useMemo(() => sales.map(s => {
    const netRevenue = (s.sale_price || 0) / VAT_DIVISOR;
    const cost = s.purchase_price || productMap.get(s.product_id)?.purchase_price || 0;
    const netProfit = netRevenue - cost;
    return { ...s, netRevenue, netProfit, cost };
  }), [sales, productMap]);

  // 1. Monthly net profit — last 12 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const keys = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const buckets = {};
    keys.forEach(k => { buckets[k] = { revenue: 0, profit: 0, count: 0 }; });
    enrichedSales.forEach(s => {
      const key = monthKey(s.sale_date);
      if (key && buckets[key]) {
        buckets[key].revenue += s.netRevenue;
        buckets[key].profit += s.netProfit;
        buckets[key].count += 1;
      }
    });
    return keys.map(k => ({
      label: monthLabel(k, lang),
      revenue: Math.round(buckets[k].revenue),
      profit: Math.round(buckets[k].profit),
      count: buckets[k].count,
    }));
  }, [enrichedSales, lang]);

  // 2. Sales & profit by pallet
  const palletData = useMemo(() => {
    const buckets = {};
    enrichedSales.forEach(s => {
      const prod = productMap.get(s.product_id);
      const palletId = prod?.pallet_id;
      if (!palletId) return;
      if (!buckets[palletId]) {
        const pal = palletMap.get(palletId);
        buckets[palletId] = {
          label: pal?.pallet_code || palletId.slice(-6),
          revenue: 0, profit: 0, count: 0,
        };
      }
      buckets[palletId].revenue += s.netRevenue;
      buckets[palletId].profit += s.netProfit;
      buckets[palletId].count += 1;
    });
    return Object.values(buckets)
      .map(b => ({ ...b, revenue: Math.round(b.revenue), profit: Math.round(b.profit) }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [enrichedSales, productMap, palletMap]);

  // 3. Sales & profit by category
  const categoryData = useMemo(() => {
    const buckets = {};
    enrichedSales.forEach(s => {
      const prod = productMap.get(s.product_id);
      const cat = prod?.category || "other";
      if (!buckets[cat]) buckets[cat] = { revenue: 0, profit: 0, count: 0 };
      buckets[cat].revenue += s.netRevenue;
      buckets[cat].profit += s.netProfit;
      buckets[cat].count += 1;
    });
    return Object.entries(buckets)
      .map(([cat, b]) => ({
        label: getCategoryLabel(cat, lang),
        revenue: Math.round(b.revenue),
        profit: Math.round(b.profit),
        count: b.count,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [enrichedSales, productMap, lang]);

  const tooltipStyle = {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#f1f5f9",
  };
  const axisStyle = { fontSize: 11, fill: "#64748b" };

  const ChartCard = ({ title, icon: Icon, children, subtitle }) => (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400 ml-auto">{subtitle}</span>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Monthly net profit */}
      <ChartCard
        title={lang === "pl" ? "Miesięczny zysk netto" : "Monthly Net Profit"}
        icon={BarChart3}
        subtitle={lang === "pl" ? "ostatnie 12 miesięcy" : "last 12 months"}
      >
        {monthlyData.every(d => d.count === 0) ? (
          <p className="text-sm text-slate-400 text-center py-8">{lang === "pl" ? "Brak danych sprzedażowych" : "No sales data"}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `${v} zł`} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                formatter={(value, name) => [
                  `${value.toLocaleString("pl-PL")} zł`,
                  name === "profit" ? (lang === "pl" ? "Zysk netto" : "Net Profit") : (lang === "pl" ? "Przychód netto" : "Net Revenue"),
                ]}
              />
              <Legend
                formatter={(value) => value === "profit"
                  ? (lang === "pl" ? "Zysk netto" : "Net Profit")
                  : (lang === "pl" ? "Przychód netto" : "Net Revenue")}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="revenue" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales & profit by pallet */}
        <ChartCard
          title={lang === "pl" ? "Sprzedaż i zysk wg palet" : "Sales & Profit by Pallet"}
          icon={Layers}
          subtitle={lang === "pl" ? "top 8" : "top 8"}
        >
          {palletData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{lang === "pl" ? "Brak powiązanych palet" : "No pallets linked"}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={palletData} layout="vertical" margin={{ top: 4, right: 8, left: 20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `${v} zł`} />
                <YAxis type="category" dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} width={90} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                  formatter={(value, name) => [
                    `${value.toLocaleString("pl-PL")} zł`,
                    name === "profit" ? (lang === "pl" ? "Zysk netto" : "Net Profit") : (lang === "pl" ? "Przychód netto" : "Net Revenue"),
                  ]}
                />
                <Legend
                  formatter={(value) => value === "profit"
                    ? (lang === "pl" ? "Zysk netto" : "Net Profit")
                    : (lang === "pl" ? "Przychód netto" : "Net Revenue")}
                  wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                />
                <Bar dataKey="revenue" fill="#a5b4fc" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Sales & profit by category */}
        <ChartCard
          title={lang === "pl" ? "Sprzedaż i zysk wg kategorii" : "Sales & Profit by Category"}
          icon={Tag}
          subtitle={lang === "pl" ? "top 8" : "top 8"}
        >
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{lang === "pl" ? "Brak danych kategorii" : "No category data"}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} angle={-35} textAnchor="end" height={70} interval={0} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `${v} zł`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                  formatter={(value, name) => [
                    `${value.toLocaleString("pl-PL")} zł`,
                    name === "profit" ? (lang === "pl" ? "Zysk netto" : "Net Profit") : (lang === "pl" ? "Przychód netto" : "Net Revenue"),
                  ]}
                />
                <Legend
                  formatter={(value) => value === "profit"
                    ? (lang === "pl" ? "Zysk netto" : "Net Profit")
                    : (lang === "pl" ? "Przychód netto" : "Net Revenue")}
                  wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                />
                <Bar dataKey="revenue" fill="#fcd34d" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}