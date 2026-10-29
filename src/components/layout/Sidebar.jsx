import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, Tag, DollarSign,
  Menu, X, ChevronRight, Layers, BookOpen, Settings, FileText, MessageCircle, BarChart3, Flag, Percent, ClipboardList, Upload
  } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLang();
  const { user } = useAuth();
  const isPracownik = user?.role === 'pracownik';

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin_notifications_unread"],
    queryFn: () => base44.entities.AdminNotification.filter({ is_read: false }),
    refetchInterval: 30000,
  });
  const unreadCount = notifications.length;

  const { data: actionFlagged = [] } = useQuery({
    queryKey: ["action_queue_count"],
    queryFn: () => base44.entities.Product.filter({ action_flag: true }, "-action_set_date", 200),
    refetchInterval: 30000,
  });
  const actionCount = actionFlagged.length;

  const allNavItems = [
    { path: "/Dashboard", labelKey: "nav_dashboard", icon: LayoutDashboard },
    { path: "/Inventory", labelKey: "nav_inventory", icon: Package },
    { path: "/InventorySets", label: "Inwentaryzacja", icon: ClipboardList },
    { path: "/ActionQueue", label: "Kolejka działań", icon: Flag },
    { path: "/ProductModels", labelKey: "nav_catalog", icon: BookOpen },
    { path: "/Pallets", labelKey: "nav_pallets", icon: Layers },
    { path: "/Listings", labelKey: "nav_listings", icon: Tag },
    { path: "/Sales", labelKey: "nav_sales", icon: DollarSign },
    { path: "/AllegroCsvImport", label: "Allegro CSV", icon: Upload },
    { path: "/AllegroReconcile", label: "Rozbieżności Allegro", icon: Flag },
    { path: "/Discounts", labelKey: "nav_discounts", icon: Percent },
    { path: "/WarehouseDocuments", label: "Dokumenty Mag.", icon: FileText },
    { path: "/MonthlyReport", label: "Raport Miesięczny", icon: BarChart3 },
    { path: "/Inquiries", label: "Zapytania klientów", icon: MessageCircle },
    { path: "/Settings", labelKey: "nav_settings", icon: Settings },
  ];

  const pracownikHidden = ["/Listings", "/Sales", "/Discounts", "/WarehouseDocuments", "/MonthlyReport", "/Inquiries", "/InventorySets", "/AllegroCsvImport"];
  const navItems = isPracownik
    ? allNavItems.filter(item => !pracownikHidden.includes(item.path))
    : allNavItems;

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
            {item.path === "/Inquiries" && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none font-bold">{unreadCount}</span>
            )}
            {item.path === "/ActionQueue" && actionCount > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none font-bold">{actionCount}</span>
            )}
            {isActive(item.path) && unreadCount === 0 && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
            {isActive(item.path) && unreadCount > 0 && item.path !== "/Inquiries" && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">💡 Tip</p>
          <p className="text-xs text-slate-500 mt-1">Vintrix Market Sp. z o.o.</p>
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