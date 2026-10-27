const cell = (v) => `"${(v === null || v === undefined ? "" : String(v)).replace(/"/g, '""')}"`;

const HEADERS = ["id", "title", "description", "external_id", "location_city", "location_district", "images", "price_value", "price_currency", "state", "type", "part_number", "parts_category", "parts_warranty", "donor_make", "donor_model", "donor_generation", "compatibility_list", "bdo"];

export function downloadOlxCsv(products, fileName) {
  const rows = products.map(p => [
    p.olx_listing_id || "",
    (p.listing_title || p.product_name || "").slice(0, 70),
    p.listing_description || p.notes || "",
    p.internal_code,
    "Zgierz", "łódzkie",
    (p.images || []).join(","),
    p.suggested_sale_price,
    "PLN",
    p.condition === "new" ? "new" : "used",
    "",
    p.barcode,
    "", "",
    p.brand,
    "", "", "", "",
  ]);
  const lines = [HEADERS, ...rows].map(r => r.map(cell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}