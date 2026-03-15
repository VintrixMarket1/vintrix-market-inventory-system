import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, Tag, DollarSign, TrendingUp } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
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

  const inStock = products.filter(p => p.status === "in_stock" || !p.status).length;
  const listed = products.filter(p => p.status === "listed").length;
  const sold = sales.length;
  const totalProfit = sales.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.purchase_price || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your inventory and sales</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="In Stock" value={inStock} icon={Package} color="blue" subtitle={`${products.length} total products`} />
        <StatCard title="Listed" value={listed} icon={Tag} color="purple" subtitle="Active listings" />
        <StatCard title="Sold" value={sold} icon={DollarSign} color="amber" subtitle="All time" />
        <StatCard title="Total Profit" value={`${totalProfit.toFixed(0)} PLN`} icon={TrendingUp} color="emerald" subtitle="Revenue minus costs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity products={products} listings={listings} sales={sales} />
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Sales by Platform</h3>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No sales recorded yet</p>
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
                      <span className="text-xs text-slate-400 ml-2">({platformSales.length} sales)</span>
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