import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, Tag, DollarSign, Zap, 
  Menu, X, ChevronRight, Layers, BookOpen, ShoppingBag, Store, Settings, FileText, MessageCircle
} from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLang();

  const navItems = [
    { path: "/Dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard },
    { path: "/Inventory", labelKey: "nav_inventory", icon: Package },
    { path: "/ProductModels", labelKey: "nav_catalog", icon: BookOpen },
    { path: "/Pallets", labelKey: "nav_pallets", icon: Layers },
    { path: "/Listings", labelKey: "nav_listings", icon: Tag },
    { path: "/Sales", labelKey: "nav_sales", icon: DollarSign },
    { path: "/WarehouseDocuments", label: "Dokumenty Mag.", icon: FileText },
    { path: "/Inquiries", label: "Zapytania klientów", icon: MessageCircle },
    { path: "/QuickAdd", labelKey: "nav_quick_add", icon: Zap },
    { path: "/ShopifySettings", labelKey: "nav_shopify", icon: ShoppingBag },
    { path: "/AllegroSettings", labelKey: "nav_allegro", icon: Store },
    { path: "/Settings", labelKey: "nav_settings", icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">Vintrix</h1>
            <p className="text-slate-400 text-xs">Market Inventory</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              isActive(item.path)
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <item.icon className={`w-4.5 h-4.5 ${isActive(item.path) ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            {item.label || t(item.labelKey)}
            {isActive(item.path) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">💡 Tip</p>
          <p className="text-xs text-slate-500 mt-1">{t("nav_quick_add")} → szybkie dodawanie</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <NavContent />
      </aside>
    </>
  );
}