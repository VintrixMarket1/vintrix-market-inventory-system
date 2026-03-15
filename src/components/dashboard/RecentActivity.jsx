import React from "react";
import { format } from "date-fns";
import { Package, Tag, DollarSign } from "lucide-react";

export default function RecentActivity({ products, listings, sales }) {
  const activities = [
    ...products.slice(0, 5).map(p => ({
      type: "product",
      label: `Added "${p.product_name}"`,
      date: p.created_date,
      icon: Package,
      color: "text-blue-500 bg-blue-50",
    })),
    ...listings.slice(0, 5).map(l => ({
      type: "listing",
      label: `Listed "${l.listing_title}" on ${l.platform}`,
      date: l.created_date,
      icon: Tag,
      color: "text-emerald-500 bg-emerald-50",
    })),
    ...sales.slice(0, 5).map(s => ({
      type: "sale",
      label: `Sold "${s.product_name || 'item'}" for ${s.sale_price} PLN`,
      date: s.created_date,
      icon: DollarSign,
      color: "text-amber-500 bg-amber-50",
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${a.color}`}>
                <a.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{a.label}</p>
                <p className="text-xs text-slate-400">
                  {a.date ? format(new Date(a.date), "MMM d, HH:mm") : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}