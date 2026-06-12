import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, Tag, DollarSign, TrendingUp } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import { useLang } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useLang();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => base44.entities.Sale.list("-created_date"),
  });
  const { data: pallets = [] } = useQuery({
    queryKey: ["pallets"],
    queryFn: () => base44.entities.Pallet.list(),
  });

  // Nieskalkulowane palety — traktowane jako produkty zbiorcze na stanie
  const unsettledPallets = pallets.filter(p => p.status !== "processed");
  const unsettledPalletIds = new Set(unsettledPallets.map(p => p.id));

  // Produkty z skalkulowanych palet (lub bez palety)
  const settledProducts = products.filter(p => !p.pallet_id || !unsettledPalletIds.has(p.pallet_id));

  // Liczba nieskalkulowanych szt. z palet (wg produktów tymczasowych)
  const unsettledUnits = products
    .filter(p => p.pallet_id && unsettledPalletIds.has(p.pallet_id))
    .reduce((sum, p) => sum + (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1), 0);

  const inStock = settledProducts.filter(p => p.status === "in_stock" || !p.status).length + unsettledUnits;
  const listed = settledProducts.filter(p => p.status === "listed").length;
  const sold = sales.length;
  const totalProfit = sales.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.purchase_price || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("dash_title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("dash_subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("dash_in_stock")} value={inStock} icon={Package} color="blue" subtitle={unsettledPallets.length > 0 ? `w tym ${unsettledPallets.length} palet(y) niesort.` : `${settledProducts.length} ${t("dash_total_products")}`} />
        <StatCard title={t("dash_listed")} value={listed} icon={Tag} color="purple" subtitle={t("dash_active_listings")} />
        <StatCard title={t("dash_sold")} value={sold} icon={DollarSign} color="amber" subtitle={t("dash_all_time")} />
        <StatCard title={t("dash_total_profit")} value={`${totalProfit.toFixed(0)} PLN`} icon={TrendingUp} color="emerald" subtitle={t("dash_revenue_minus_costs")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity products={products} listings={listings} sales={sales} />
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("dash_sales_by_platform")}</h3>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t("dash_no_sales")}</p>
          ) : (
            <div className="space-y-3">
              {["vinted", "olx", "allegro", "ebay"].map(platform => {
                const platformSales = sales.filter(s => s.platform === platform);
                const revenue = platformSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
                if (platformSales.length === 0) return null;
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-slate-700 capitalize">{platform}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">{revenue.toFixed(0)} PLN</span>
                      <span className="text-xs text-slate-400 ml-2">({platformSales.length} {t("dash_sales_label")})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}