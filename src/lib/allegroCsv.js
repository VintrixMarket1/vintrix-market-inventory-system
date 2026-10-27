const CONDITION_LABELS = { new: "Nowy", like_new: "Używany", used: "Używany" };

const cell = (v) => `"${(v === null || v === undefined ? "" : String(v)).replace(/"/g, '""')}"`;

export function downloadAllegroCsv(products, fileName) {
  const headers = ["sku", "nazwa", "marka", "rozmiar", "kolor", "stan", "ean", "cena", "ilosc", "kategoria_allegro_id", "opis", "zdjecia"];
  const rows = products.map(p => [
    p.internal_code, p.listing_title || p.product_name, p.brand, p.size, p.color,
    CONDITION_LABELS[p.condition], p.barcode, p.suggested_sale_price,
    p.is_multi_item ? (p.stock_quantity || 0) : 1, p.allegro_category_id,
    p.listing_description, (p.images || []).join("|"),
  ]);
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