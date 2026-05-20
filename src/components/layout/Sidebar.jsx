import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, Tag, DollarSign, Zap, 
  Menu, X, ChevronRight, Layers, BookOpen, ShoppingBag, Store
} from "lucide-react";

const navItems = [
  { path: "/Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/Inventory", label: "Inventory", icon: Package },
  { path: "/ProductModels", label: "Catalog", icon: BookOpen },
  { path: "/Pallets", label: "Pallets", icon: Layers },
  { path: "/Listings", label: "Listings", icon: Tag },
  { path: "/Sales", label: "Sales", icon: DollarSign },
  { path: "/QuickAdd", label: "Quick Add", icon: Zap },
  { path: "/ShopifySettings", label: "Shopify", icon: ShoppingBag },
  { path: "/AllegroSettings", label: "Allegro", icon: Store },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            {item.label}
            {isActive(item.path) && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">Speed Tip</p>
          <p className="text-xs text-slate-500 mt-1">Use Quick Add for fast mobile entries</p>
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