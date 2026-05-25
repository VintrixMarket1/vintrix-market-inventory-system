import React, { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "vintrix_lang";

export const translations = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_inventory: "Inventory",
    nav_catalog: "Catalog",
    nav_pallets: "Pallets",
    nav_listings: "Listings",
    nav_sales: "Sales",
    nav_quick_add: "Quick Add",
    nav_shopify: "Shopify",
    nav_allegro: "Allegro",
    nav_settings: "Settings",

    // Dashboard
    dash_title: "Dashboard",
    dash_subtitle: "Overview of your inventory and sales",
    dash_in_stock: "In Stock",
    dash_listed: "Listed",
    dash_sold: "Sold",
    dash_total_profit: "Total Profit",
    dash_total_products: "total products",
    dash_active_listings: "Active listings",
    dash_all_time: "All time",
    dash_revenue_minus_costs: "Revenue minus costs",
    dash_sales_by_platform: "Sales by Platform",
    dash_no_sales: "No sales recorded yet",
    dash_sales_label: "sales",

    // Inventory
    inv_title: "Inventory",
    inv_products: "products",
    inv_add_product: "Add Product",
    inv_import_csv: "Import CSV",
    inv_export: "Export",
    inv_shopify: "Shopify",
    inv_no_products: "No products found",
    inv_add_first: "Add your first product",
    inv_list: "List",
    inv_sell: "Sell",
    inv_delete_confirm: "Delete this product?",
    inv_size: "Size",
    inv_purchase: "Purchase",
    inv_sale: "Sale",

    // Product Form
    pf_add: "Add Product",
    pf_edit: "Edit Product",
    pf_name: "Product Name",
    pf_sku: "SKU / Internal Code",
    pf_auto_generated: "Auto-generated",
    pf_category: "Category",
    pf_subcategory: "Subcategory",
    pf_condition: "Condition",
    pf_size: "Size",
    pf_purchase_price: "Purchase Price (PLN)",
    pf_sale_price: "Suggested Sale Price (PLN)",
    pf_warehouse_zone: "Warehouse Zone",
    pf_shelf: "Shelf",
    pf_box_number: "Box Number",
    pf_barcode: "Barcode / Code",
    pf_pallet: "Pallet",
    pf_no_pallet: "No pallet",
    pf_notes: "Notes",
    pf_notes_placeholder: "Any additional notes...",
    pf_description: "Offer Description (HTML)",
    pf_generate_ai: "Generate AI",
    pf_generating: "Generating...",
    pf_images: "Images",
    pf_cancel: "Cancel",
    pf_update: "Update",
    pf_add_btn: "Add Product",
    pf_multi_item: "Multi-item",
    pf_multi_item_desc: "(multiple units of the same item)",
    pf_stock_qty: "Stock quantity (units)",
    pf_internal_only: "internal only",
    pf_chat_ai: "Chat AI",
    pf_scan_barcode: "Scan or enter barcode",
    pf_description_placeholder: "Generate AI description or type manually...",
    pf_size_placeholder: "e.g. M, 42",

    // Listings
    lst_title: "Listings",
    lst_subtitle: "Manage your marketplace listings",
    lst_no_listings: "No listings yet",
    lst_platform: "Platform",
    lst_status: "Status",
    lst_search: "Search listings...",
    lst_all: "All",
    lst_delete_confirm: "Delete this listing?",

    // Sales
    sales_title: "Sales",
    sales_subtitle: "Track your sold items and revenue",
    sales_record: "Record Sale",
    sales_no_sales: "No sales recorded yet",
    sales_profit: "Profit",
    sales_platform: "Platform",
    sales_date: "Date",
    sales_price: "Price",
    sales_purchase: "Purchase",

    // Settings
    settings_title: "Settings",
    settings_language: "Language",
    settings_language_desc: "Choose the interface and AI generation language",
    settings_lang_en: "English",
    settings_lang_pl: "Polish",
    settings_save: "Save",
    settings_saved: "Saved!",
    settings_ai_lang: "AI Language",
    settings_ai_lang_desc: "AI will generate titles and descriptions in the selected language",

    // AI generation language prompt label
    ai_lang_name: "English",

    // Conditions
    cond_new: "New",
    cond_like_new: "Like new",
    cond_used: "Used",

    // Statuses
    status_in_stock: "In stock",
    status_listed: "Listed",
    status_sold: "Sold",

    // Pallets
    pal_title: "Pallets",
    pal_add: "Add Pallet",
    pal_no_pallets: "No pallets yet",
    pal_code: "Pallet Code",
    pal_investor: "Investor",
    pal_cost: "Total Cost",
    pal_status: "Status",
    pal_products: "Products",

    // Quick add
    qa_title: "Quick Add",
    qa_subtitle: "Rapidly add products on the go",

    // Common
    common_close: "Close",
    common_delete: "Delete",
    common_edit: "Edit",
    common_save: "Save",
    common_loading: "Loading...",
    common_select: "Select...",
    common_search: "Search...",
  },

  pl: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_inventory: "Magazyn",
    nav_catalog: "Katalog",
    nav_pallets: "Palety",
    nav_listings: "Ogłoszenia",
    nav_sales: "Sprzedaż",
    nav_quick_add: "Szybkie dodanie",
    nav_shopify: "Shopify",
    nav_allegro: "Allegro",
    nav_settings: "Ustawienia",

    // Dashboard
    dash_title: "Dashboard",
    dash_subtitle: "Przegląd magazynu i sprzedaży",
    dash_in_stock: "W magazynie",
    dash_listed: "Wystawione",
    dash_sold: "Sprzedane",
    dash_total_profit: "Łączny zysk",
    dash_total_products: "produktów łącznie",
    dash_active_listings: "Aktywne ogłoszenia",
    dash_all_time: "Łącznie",
    dash_revenue_minus_costs: "Przychód minus koszty",
    dash_sales_by_platform: "Sprzedaż według platformy",
    dash_no_sales: "Brak zarejestrowanej sprzedaży",
    dash_sales_label: "sprzedaży",

    // Inventory
    inv_title: "Magazyn",
    inv_products: "produktów",
    inv_add_product: "Dodaj produkt",
    inv_import_csv: "Import CSV",
    inv_export: "Eksport",
    inv_shopify: "Shopify",
    inv_no_products: "Nie znaleziono produktów",
    inv_add_first: "Dodaj pierwszy produkt",
    inv_list: "Wystaw",
    inv_sell: "Sprzedaj",
    inv_delete_confirm: "Usunąć ten produkt?",
    inv_size: "Rozmiar",
    inv_purchase: "Zakup",
    inv_sale: "Sprzedaż",

    // Product Form
    pf_add: "Dodaj produkt",
    pf_edit: "Edytuj produkt",
    pf_name: "Nazwa produktu",
    pf_sku: "SKU / Kod wewnętrzny",
    pf_auto_generated: "Automatycznie",
    pf_category: "Kategoria",
    pf_subcategory: "Podkategoria",
    pf_condition: "Stan",
    pf_size: "Rozmiar",
    pf_purchase_price: "Cena zakupu (PLN)",
    pf_sale_price: "Sugerowana cena sprzedaży (PLN)",
    pf_warehouse_zone: "Strefa magazynowa",
    pf_shelf: "Regał",
    pf_box_number: "Numer pudełka",
    pf_barcode: "Kod kreskowy / Kod",
    pf_pallet: "Paleta",
    pf_no_pallet: "Brak palety",
    pf_notes: "Notatki",
    pf_notes_placeholder: "Dodatkowe notatki...",
    pf_description: "Opis oferty (HTML)",
    pf_generate_ai: "Generuj AI",
    pf_generating: "Generowanie...",
    pf_images: "Zdjęcia",
    pf_cancel: "Anuluj",
    pf_update: "Zaktualizuj",
    pf_add_btn: "Dodaj produkt",
    pf_multi_item: "Wielosztuk",
    pf_multi_item_desc: "(wiele sztuk tego samego egzemplarza)",
    pf_stock_qty: "Stan magazynowy (liczba sztuk)",
    pf_internal_only: "tylko wewnętrznie",
    pf_chat_ai: "Chat AI",
    pf_scan_barcode: "Zeskanuj lub wpisz kod",
    pf_description_placeholder: "Wygeneruj opis AI lub wpisz ręcznie...",
    pf_size_placeholder: "np. M, 42",

    // Listings
    lst_title: "Ogłoszenia",
    lst_subtitle: "Zarządzaj ogłoszeniami na platformach",
    lst_no_listings: "Brak ogłoszeń",
    lst_platform: "Platforma",
    lst_status: "Status",
    lst_search: "Szukaj ogłoszeń...",
    lst_all: "Wszystkie",
    lst_delete_confirm: "Usunąć to ogłoszenie?",

    // Sales
    sales_title: "Sprzedaż",
    sales_subtitle: "Śledź sprzedane przedmioty i przychody",
    sales_record: "Zarejestruj sprzedaż",
    sales_no_sales: "Brak zarejestrowanej sprzedaży",
    sales_profit: "Zysk",
    sales_platform: "Platforma",
    sales_date: "Data",
    sales_price: "Cena",
    sales_purchase: "Zakup",

    // Settings
    settings_title: "Ustawienia",
    settings_language: "Język",
    settings_language_desc: "Wybierz język interfejsu i generowania AI",
    settings_lang_en: "Angielski",
    settings_lang_pl: "Polski",
    settings_save: "Zapisz",
    settings_saved: "Zapisano!",
    settings_ai_lang: "Język AI",
    settings_ai_lang_desc: "AI będzie generować tytuły i opisy w wybranym języku",

    // AI generation language prompt label
    ai_lang_name: "Polish",

    // Conditions
    cond_new: "Nowy",
    cond_like_new: "Jak nowy",
    cond_used: "Używany",

    // Statuses
    status_in_stock: "W magazynie",
    status_listed: "Wystawiony",
    status_sold: "Sprzedany",

    // Pallets
    pal_title: "Palety",
    pal_add: "Dodaj paletę",
    pal_no_pallets: "Brak palet",
    pal_code: "Kod palety",
    pal_investor: "Inwestor",
    pal_cost: "Koszt całkowity",
    pal_status: "Status",
    pal_products: "Produkty",

    // Quick add
    qa_title: "Szybkie dodanie",
    qa_subtitle: "Szybko dodawaj produkty w locie",

    // Common
    common_close: "Zamknij",
    common_delete: "Usuń",
    common_edit: "Edytuj",
    common_save: "Zapisz",
    common_loading: "Ładowanie...",
    common_select: "Wybierz...",
    common_search: "Szukaj...",
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "pl";
  });

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key) => {
    return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}