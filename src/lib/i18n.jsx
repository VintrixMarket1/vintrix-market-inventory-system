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

    // Add Product
    ap_title: "Add Product",
    ap_step1: "Step 1: Upload product photos",
    ap_step2: "Step 2: AI is analyzing the product...",
    ap_step3: "Step 3: Verify data and save",
    ap_done: "Product saved!",
    ap_saved: "Product has been saved!",
    ap_add_another: "Add another",
    ap_go_inventory: "Go to inventory",

    // Image Uploader
    iu_uploading: "Uploading photos...",
    iu_click_drag: "Click or drag photos here",
    iu_hint: "Upload at least 1 photo so AI can analyze the product",
    iu_uploaded: "Uploaded photos",
    iu_main: "Main",
    iu_analyze: "Analyze with AI",

    // AI Analysis Step
    ai_analyzing: "AI is analyzing the product...",
    ai_analyzing_desc: "Recognizing type, brand, condition and generating listing description.",
    ai_analyzing_wait: "This may take a few seconds.",
    ai_step_recognize: "Recognizing product",
    ai_step_assess: "Assessing condition",
    ai_step_generate: "Generating description",

    // Common
    common_close: "Close",
    common_delete: "Delete",
    common_edit: "Edit",
    common_save: "Save",
    common_loading: "Loading...",
    common_select: "Select...",
    common_search: "Search...",

    // Catalog
    cat_filters: "Filters", cat_clear: "Clear", cat_show_results: "Show results",
    cat_condition: "Condition", cat_price_range: "Price range (PLN)", cat_price_from: "from", cat_price_to: "to",
    cat_categories: "Categories", cat_all: "All", cat_favorites: "Favorites",
    cat_products_count: "products", cat_no_results: "No products matching criteria",
    cat_clear_filters: "Clear filters", cat_buy_now: "Buy now", cat_on_request: "On request",
    cat_search_placeholder: "Search products, brands...", cat_search_placeholder_short: "Search...",
    cat_hello: "Hi", cat_messages: "Messages", cat_cart: "Cart", cat_logout: "Logout",
    cat_add_to_cart: "Add to cart", cat_in_cart: "In cart", cat_ask: "Ask",
    cat_premium_catalog: "Premium Catalog",
    cat_inquiry_sent: "Inquiry sent!", cat_contact_soon: "We'll contact you soon.",

    // Product Detail
    pd_brand: "Brand", pd_size: "Size", pd_color: "Color", pd_gender: "Gender", pd_description: "Description",
    pd_price_on_request: "Price on request", pd_ask: "Ask", pd_make_offer: "Make offer",
    pd_product_inquiry: "Product inquiry", pd_inquiry_placeholder: "Write what you'd like to know...",
    pd_cancel: "Cancel", pd_send: "Send", pd_your_offer: "Your price offer", pd_asking_price: "Asking price",
    pd_your_price: "Your price (PLN)", pd_message_optional: "Message (optional)", pd_add_message: "Add message...",
    pd_send_offer: "Send offer", pd_offer_sent: "Offer sent!",

    // Gender
    gender_men: "Men", gender_women: "Women", gender_unisex: "Unisex", gender_kids: "Kids",

    // Cart
    cart_title: "Cart", cart_empty: "Cart is empty",
    cart_empty_hint: "Add products by clicking \"Buy now\"", cart_pay: "Pay",
    cart_total_no_shipping: "Total (without shipping)",
    cart_each_separate: "Each product paid separately — click \"Pay\" next to selected",
    cart_one_product: "product", cart_many_products: "products",

    // Checkout
    co_title: "Order checkout", co_accepted_offer: "Accepted offer", co_contact_data: "Contact details",
    co_full_name: "Full name *", co_email: "Email *", co_phone: "Phone",
    co_nip: "VAT number (optional)", co_company: "Company (optional)", co_shipping_method: "Delivery method",
    co_personal_pickup: "Personal pickup", co_personal_pickup_desc: "Pick up your order at our warehouse",
    co_inpost: "InPost Parcel Locker", co_inpost_desc: "Delivery to selected parcel locker",
    co_courier: "Home courier", co_courier_desc: "Delivery to specified address",
    co_free: "Free", co_delivery_address: "Delivery address", co_street: "Street and number *",
    co_postal_code: "Postal code *", co_city: "City *", co_parcel_locker: "Parcel locker",
    co_locker_id: "Parcel locker number/ID *", co_locker_hint: "Enter InPost parcel locker code (e.g. WAW123M)",
    co_product: "Product", co_delivery: "Delivery", co_free_f: "Free", co_total: "Total",
    co_redirecting: "Redirecting to payment...", co_pay: "Pay",
    co_stripe_note: "Payment handled by Stripe. We accept cards, BLIK, Przelewy24.",
    co_iframe_error: "Payment works only in a published app, not in preview.",
    co_error: "An error occurred. Try again.",

    // Messages
    msg_title: "My messages", msg_subtitle: "Inquiries and purchase offers",
    msg_inquiries: "Inquiries", msg_offers: "Offers",
    msg_no_inquiries: "No sent inquiries", msg_no_offers: "No submitted offers",
    msg_your_inquiry: "Your inquiry", msg_seller_reply: "Seller's reply",
    msg_waiting_reply: "Waiting for seller's reply...",
    msg_your_offer: "Your offer", msg_seller_counter: "Seller's counter-offer",
    msg_your_message: "Your message", msg_seller_message: "Seller's message",
    msg_offer_accepted: "✅ Offer accepted by seller! You can now finalize the purchase.",
    msg_offer_rejected: "❌ Offer rejected by seller.",
    msg_you_accepted: "✅ You accepted the counter-offer. You can now finalize the purchase.",
    msg_you_rejected: "❌ You rejected the counter-offer.",
    msg_you_countered: "💬 You sent a counter-offer. Waiting for seller's reply.",
    msg_seller_offer_new: "The seller sent you an offer. Choose what you want to do:",
    msg_respond_offer: "Respond to offer", msg_respond_counter: "Respond to counter-offer",
    msg_your_counter: "Your counter-offer (PLN) — optional",
    msg_reject: "Reject", msg_counter: "Counter", msg_accept: "Accept",
    msg_finalize_pay: "Finalize and pay", msg_product: "Product",

    // Inquiry/Offer statuses
    status_pending: "Pending", status_replied: "Replied", status_closed: "Closed",
    status_accepted: "Accepted", status_rejected_status: "Rejected", status_countered: "Counter-offer",
    status_your_counter: "Your counter-offer", status_you_accepted: "You accepted", status_you_rejected: "You rejected",
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

    // Add Product
    ap_title: "Dodaj produkt",
    ap_step1: "Krok 1: Wgraj zdjęcia produktu",
    ap_step2: "Krok 2: AI analizuje produkt...",
    ap_step3: "Krok 3: Zweryfikuj dane i zapisz",
    ap_done: "Produkt zapisany!",
    ap_saved: "Produkt został zapisany!",
    ap_add_another: "Dodaj kolejny",
    ap_go_inventory: "Przejdź do inwentarza",

    // Image Uploader
    iu_uploading: "Przesyłam zdjęcia...",
    iu_click_drag: "Kliknij lub przeciągnij zdjęcia tutaj",
    iu_hint: "Wgraj co najmniej 1 zdjęcie, aby AI mogło przeanalizować produkt",
    iu_uploaded: "Wgrane zdjęcia",
    iu_main: "Główne",
    iu_analyze: "Analizuj z AI",

    // AI Analysis Step
    ai_analyzing: "AI analizuje produkt...",
    ai_analyzing_desc: "Rozpoznaję typ, markę, stan i generuję opis ogłoszenia.",
    ai_analyzing_wait: "To może zająć kilka sekund.",
    ai_step_recognize: "Rozpoznaję produkt",
    ai_step_assess: "Oceniam stan",
    ai_step_generate: "Generuję opis",

    // Common
    common_close: "Zamknij",
    common_delete: "Usuń",
    common_edit: "Edytuj",
    common_save: "Zapisz",
    common_loading: "Ładowanie...",
    common_select: "Wybierz...",
    common_search: "Szukaj...",

    // Catalog
    cat_filters: "Filtry", cat_clear: "Wyczyść", cat_show_results: "Pokaż wyniki",
    cat_condition: "Stan produktu", cat_price_range: "Zakres cen (PLN)", cat_price_from: "od", cat_price_to: "do",
    cat_categories: "Kategorie", cat_all: "Wszystkie", cat_favorites: "Ulubione",
    cat_products_count: "produktów", cat_no_results: "Brak produktów spełniających kryteria",
    cat_clear_filters: "Wyczyść filtry", cat_buy_now: "Kup teraz", cat_on_request: "Na zapytanie",
    cat_search_placeholder: "Szukaj produktów, marek...", cat_search_placeholder_short: "Szukaj...",
    cat_hello: "Cześć", cat_messages: "Wiadomości", cat_cart: "Koszyk", cat_logout: "Wyloguj",
    cat_add_to_cart: "Dodaj do koszyka", cat_in_cart: "W koszyku", cat_ask: "Zapytaj",
    cat_premium_catalog: "Premium Catalog",
    cat_inquiry_sent: "Zapytanie wysłane!", cat_contact_soon: "Skontaktujemy się z Tobą wkrótce.",

    // Product Detail
    pd_brand: "Marka", pd_size: "Rozmiar", pd_color: "Kolor", pd_gender: "Przeznaczenie", pd_description: "Opis",
    pd_price_on_request: "Cena na zapytanie", pd_ask: "Zapytaj", pd_make_offer: "Złóż ofertę",
    pd_product_inquiry: "Zapytanie o produkt", pd_inquiry_placeholder: "Napisz czego chcesz się dowiedzieć...",
    pd_cancel: "Anuluj", pd_send: "Wyślij", pd_your_offer: "Twoja oferta cenowa", pd_asking_price: "Cena wywoławcza",
    pd_your_price: "Twoja cena (PLN)", pd_message_optional: "Wiadomość (opcjonalnie)", pd_add_message: "Dodaj wiadomość...",
    pd_send_offer: "Wyślij ofertę", pd_offer_sent: "Oferta wysłana!",

    // Gender
    gender_men: "Mężczyźni", gender_women: "Kobiety", gender_unisex: "Unisex", gender_kids: "Dzieci",

    // Cart
    cart_title: "Koszyk", cart_empty: "Koszyk jest pusty",
    cart_empty_hint: "Dodaj produkty klikając \"Kup teraz\"", cart_pay: "Zapłać",
    cart_total_no_shipping: "Łącznie (bez dostawy)",
    cart_each_separate: "Każdy produkt opłacany osobno — kliknij \"Zapłać\" przy wybranym",
    cart_one_product: "produkt", cart_many_products: "produkty/ów",

    // Checkout
    co_title: "Finalizacja zamówienia", co_accepted_offer: "Zaakceptowana oferta", co_contact_data: "Dane kontaktowe",
    co_full_name: "Imię i nazwisko *", co_email: "Email *", co_phone: "Telefon",
    co_nip: "NIP (opcjonalnie)", co_company: "Firma (opcjonalnie)", co_shipping_method: "Sposób dostawy",
    co_personal_pickup: "Odbiór osobisty", co_personal_pickup_desc: "Odbierz zamówienie osobiście w naszym magazynie",
    co_inpost: "Paczkomat InPost", co_inpost_desc: "Dostawa do wybranego paczkomatu",
    co_courier: "Kurier do domu", co_courier_desc: "Dostawa pod wskazany adres",
    co_free: "Bezpłatne", co_delivery_address: "Adres dostawy", co_street: "Ulica i numer *",
    co_postal_code: "Kod pocztowy *", co_city: "Miasto *", co_parcel_locker: "Paczkomat",
    co_locker_id: "Numer/ID paczkomatu *", co_locker_hint: "Wpisz kod paczkomatu InPost (np. WAW123M)",
    co_product: "Produkt", co_delivery: "Dostawa", co_free_f: "Bezpłatna", co_total: "Razem",
    co_redirecting: "Przekierowuję do płatności...", co_pay: "Zapłać",
    co_stripe_note: "Płatność obsługiwana przez Stripe. Akceptujemy karty, BLIK, Przelewy24.",
    co_iframe_error: "Płatność działa tylko w opublikowanej aplikacji, nie w podglądzie.",
    co_error: "Wystąpił błąd. Spróbuj ponownie.",

    // Messages
    msg_title: "Moje wiadomości", msg_subtitle: "Zapytania i oferty zakupu",
    msg_inquiries: "Zapytania", msg_offers: "Oferty",
    msg_no_inquiries: "Brak wysłanych zapytań", msg_no_offers: "Brak złożonych ofert",
    msg_your_inquiry: "Twoje zapytanie", msg_seller_reply: "Odpowiedź sprzedawcy",
    msg_waiting_reply: "Czekamy na odpowiedź sprzedawcy...",
    msg_your_offer: "Twoja oferta", msg_seller_counter: "Kontroferta sprzedawcy",
    msg_your_message: "Twoja wiadomość", msg_seller_message: "Wiadomość sprzedawcy",
    msg_offer_accepted: "✅ Oferta zaakceptowana przez sprzedawcę! Możesz teraz sfinalizować zakup.",
    msg_offer_rejected: "❌ Oferta odrzucona przez sprzedawcę.",
    msg_you_accepted: "✅ Zaakceptowałeś kontrofertę. Możesz teraz sfinalizować zakup.",
    msg_you_rejected: "❌ Odrzuciłeś kontrofertę.",
    msg_you_countered: "💬 Wysłałeś kontrofertę. Czekamy na odpowiedź sprzedawcy.",
    msg_seller_offer_new: "Sprzedawca wysłał Ci ofertę. Wybierz co chcesz zrobić:",
    msg_respond_offer: "Odpowiedz na ofertę", msg_respond_counter: "Odpowiedz na kontrofertę",
    msg_your_counter: "Twoja kontroferta (PLN) — opcjonalnie",
    msg_reject: "Odrzuć", msg_counter: "Kontruj", msg_accept: "Akceptuj",
    msg_finalize_pay: "Sfinalizuj i zapłać", msg_product: "Produkt",

    // Inquiry/Offer statuses
    status_pending: "Oczekuje", status_replied: "Odpowiedziano", status_closed: "Zamknięte",
    status_accepted: "Zaakceptowana", status_rejected_status: "Odrzucona", status_countered: "Kontroferta",
    status_your_counter: "Twoja kontroferta", status_you_accepted: "Zaakceptowałeś", status_you_rejected: "Odrzuciłeś",
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