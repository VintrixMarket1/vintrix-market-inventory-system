const CONDITION_LABELS = { new: "Nowy", like_new: "Używany", used: "Używany" };

const cell = (v) => `"${(v === null || v === undefined ? "" : String(v)).replace(/"/g, '""')}"`;

// Szablon zgodności: przypisany ręcznie albo dopasowany po kategorii (dokładnie lub prefiks, np. "clothing")
export function resolveTemplate(product, templates) {
  if (product.allegro_template_id) {
    const t = templates.find(x => x.id === product.allegro_template_id);
    if (t) return t;
  }
  const cat = product.category || "";
  return templates.find(t => (t.match_categories || []).includes(cat))
    || templates.find(t => (t.match_categories || []).some(c => c && cat.startsWith(c + "_")))
    || null;
}

export function isTemplateComplete(t) {
  return !!(t && t.producer_name && t.producer_street && t.producer_city && t.producer_email
    && t.responsible_name && t.responsible_street && t.responsible_city && t.responsible_email);
}

const addr = (t, p) => [t?.[`${p}_street`], `${t?.[`${p}_zip`] || ""} ${t?.[`${p}_city`] || ""}`.trim(), t?.[`${p}_country`]]
  .filter(Boolean).join(", ");

export function downloadAllegroCsv(products, fileName, templates = []) {
  const headers = ["sku", "nazwa", "marka", "rozmiar", "kolor", "stan", "ean", "cena", "ilosc", "kategoria_allegro_id", "opis", "zdjecia",
    "producent_nazwa_wlasna", "producent_nazwa", "producent_adres", "producent_kontakt",
    "osoba_odpowiedzialna_nazwa_wlasna", "osoba_odpowiedzialna_nazwa", "osoba_odpowiedzialna_adres", "osoba_odpowiedzialna_kontakt",
    "informacje_o_bezpieczenstwie"];
  const rows = products.map(p => {
    const t = resolveTemplate(p, templates);
    return [
      p.internal_code, p.listing_title || p.product_name, p.brand, p.size, p.color,
      CONDITION_LABELS[p.condition], p.barcode, p.suggested_sale_price,
      p.is_multi_item ? (p.stock_quantity || 0) : 1, p.allegro_category_id,
      p.listing_description, (p.images || []).join("|"),
      t?.producer_trade_name, t?.producer_name, addr(t, "producer"), t?.producer_email,
      t?.responsible_trade_name, t?.responsible_name, addr(t, "responsible"), t?.responsible_email,
      t?.safety_text,
    ];
  });
  const lines = [headers, ...rows].map(r => r.map(cell).join(";"));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const AVAILABLE_STATUSES = ["in_stock", "listed"];