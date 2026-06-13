import jsPDF from "jspdf";

const COMPANY = "Vintrix Market";

// jsPDF built-in fonts don't support Polish characters — normalize them
function pl(str) {
  if (!str) return str;
  return String(str)
    .replace(/ą/g, "a").replace(/Ą/g, "A")
    .replace(/ć/g, "c").replace(/Ć/g, "C")
    .replace(/ę/g, "e").replace(/Ę/g, "E")
    .replace(/ł/g, "l").replace(/Ł/g, "L")
    .replace(/ń/g, "n").replace(/Ń/g, "N")
    .replace(/ó/g, "o").replace(/Ó/g, "O")
    .replace(/ś/g, "s").replace(/Ś/g, "S")
    .replace(/ź/g, "z").replace(/Ź/g, "Z")
    .replace(/ż/g, "z").replace(/Ż/g, "Z");
}

function addPageHeader(doc, title, docNumber, date) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY, 14, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(pl(title), 14, 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(pl(docNumber), 150, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Data: ${date}`, 150, 25);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 30, 196, 30);
}

function addSignatureLine(doc, y, label = "Podpis osoby odpowiedzialnej") {
  const pageH = doc.internal.pageSize.height;
  if (y + 30 > pageH - 10) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(150);
  doc.line(14, y + 20, 90, y + 20);
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(pl(label), 14, y + 25);
  doc.setTextColor(0);
  return y + 30;
}

export function exportDRP(pallet, products, docs) {
  const doc = new jsPDF();
  const drpDoc = docs.find(d => d.document_type === "DRP" && d.pallet_id === pallet.id);
  const pzDoc = docs.find(d => d.document_type === "PZ" && d.pallet_id === pallet.id);
  const rwDoc = docs.find(d => d.document_type === "RW" && d.pallet_id === pallet.id);
  const pwDoc = docs.find(d => d.document_type === "PW" && d.pallet_id === pallet.id);

  const number = drpDoc?.document_number || "DRP/—";
  const date = drpDoc?.date || new Date().toISOString().split("T")[0];
  addPageHeader(doc, "PROTOKÓŁ ROZBICIA PALETY / DEKOMPLETACJA", number, date);

  let y = 38;
  const totalValue = pallet.total_value || (pallet.total_cost + (pallet.additional_costs || 0));

  // Pallet info block
  doc.setFontSize(9);
  const infoRows = [
    ["Numer palety:", pallet.pallet_code, "Dostawca / Inwestor:", pallet.investor_name || "—"],
    ["Data zakupu:", pallet.purchase_date || "—", "Numer faktury:", pallet.invoice_number || "—"],
    ["Wartosc zakupowa:", `${(pallet.total_cost || 0).toFixed(2)} PLN`, "Koszty dodatkowe:", `${(pallet.additional_costs || 0).toFixed(2)} PLN`],
    ["Wartosc do rozliczenia:", `${totalValue.toFixed(2)} PLN`, "Metoda alokacji:", drpDoc?.allocation_method || pallet.allocation_method || "equal"],
    ["Dokument PZ:", pzDoc?.document_number || "—", "Dokument RW:", rwDoc?.document_number || "—"],
    ["Dokument PW:", pwDoc?.document_number || "—", "Zatwierdzil:", pallet.exploded_by || "—"],
  ];
  for (const [l1, v1, l2, v2] of infoRows) {
    doc.setFont("helvetica", "bold"); doc.text(pl(l1), 14, y); doc.setFont("helvetica", "normal"); doc.text(pl(v1), 55, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(pl(l2), 110, y); doc.setFont("helvetica", "normal"); doc.text(pl(v2), 155, y); }
    y += 6;
  }
  y += 4;
  doc.line(14, y, 196, y); y += 6;

  // Products table
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("Lista produktow", 14, y); y += 5;

  // Table header
  const cols = [14, 60, 95, 115, 140, 165, 196];
  const headers = ["Produkt / SKU", "Kategoria", "Stan", "Ilosc", "Cena spr.", "Koszt wl."];
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, cols[i] + 1, y + 4));
  y += 7;

  doc.setFont("helvetica", "normal");
  let totalAllocated = 0;
  for (const p of products) {
    if (y > 270) { doc.addPage(); y = 20; }
    const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
    doc.text(pl((p.product_name || "—").substring(0, 28)), cols[0] + 1, y + 3);
    if (p.internal_code) { doc.setFontSize(7); doc.setTextColor(130); doc.text(p.internal_code, cols[0] + 1, y + 7); doc.setFontSize(8); doc.setTextColor(0); }
    doc.text(pl(p.category || "—"), cols[1] + 1, y + 3);
    doc.text(pl(p.condition || "—"), cols[2] + 1, y + 3);
    doc.text(String(qty), cols[3] + 1, y + 3);
    doc.text(p.suggested_sale_price ? `${p.suggested_sale_price} PLN` : "—", cols[4] + 1, y + 3);
    doc.setFont("helvetica", "bold");
    doc.text(`${(p.purchase_price || 0).toFixed(2)} PLN`, cols[5] + 1, y + 3);
    doc.setFont("helvetica", "normal");
    totalAllocated += (p.purchase_price || 0) * qty;
    doc.setDrawColor(220); doc.line(14, y + 9, 196, y + 9);
    y += 10;
  }

  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`Suma produktow: ${totalAllocated.toFixed(2)} PLN`, 14, y);
  doc.text(`Wartosc palety: ${totalValue.toFixed(2)} PLN`, 120, y);
  y += 6;
  const diff = totalValue - totalAllocated;
  if (Math.abs(diff) > 0.01) {
    doc.setTextColor(200, 80, 0);
    doc.text(`Roznica zaokraglenia: ${diff.toFixed(2)} PLN`, 14, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.setFillColor(230, 255, 230);
  doc.rect(14, y, 182, 8, "F");
  doc.text("STATUS: ZATWIERDZONE", 14, y + 5.5);
  y += 14;

  addSignatureLine(doc, y);
  doc.save(`${number.replace(/\//g, "-")}.pdf`);
}

export function exportRW(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "RW — ROZCHÓD WEWNĘTRZNY", doc_data.document_number, doc_data.date);
  let y = 38;
  doc.setFontSize(9);
  const rows = [
    ["Paleta:", pallet?.pallet_code || "—", "Dostawca:", pl(pallet?.investor_name || doc_data.counterparty || "—")],
    ["Powiazany PZ:", doc_data.related_pz_number || "—", "Data:", doc_data.date || "—"],
    ["Wystawil:", pl(doc_data.created_by_name || "—"), "Powod:", "Rozbicie palety / dekompletacja"],
  ];
  for (const [l1, v1, l2, v2] of rows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(v1, 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(v2, 140, y); }
    y += 6;
  }
  y += 4; doc.line(14, y, 196, y); y += 8;

  // Items
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Pozycja", 15, y + 4); doc.text("Ilosc", 130, y + 4); doc.text("Wartosc", 165, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    doc.text(pl(item.product_name || "—"), 15, y + 3);
    doc.text(`${item.quantity} szt.`, 130, y + 3);
    doc.setFont("helvetica", "bold"); doc.text(`${(item.total_value || 0).toFixed(2)} PLN`, 165, y + 3); doc.setFont("helvetica", "normal");
    doc.setDrawColor(220); doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`RAZEM: ${(doc_data.total_value || 0).toFixed(2)} PLN`, 14, y);
  y += 12;
  if (doc_data.notes) { doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.text(`Uwagi: ${pl(doc_data.notes)}`, 14, y); y += 10; }
  addSignatureLine(doc, y);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}

export function exportPW(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "PW — PRZYJĘCIE WEWNĘTRZNE", doc_data.document_number, doc_data.date);
  let y = 38;
  doc.setFontSize(9);
  const rows = [
    ["Paleta:", pallet?.pallet_code || "—", "Dostawca:", pl(pallet?.investor_name || "—")],
    ["Powiazany PZ:", doc_data.related_pz_number || "—", "Powiazany RW:", doc_data.related_rw_number || "—"],
    ["Metoda alokacji:", doc_data.allocation_method || "equal", "Wystawil:", pl(doc_data.created_by_name || "—")],
  ];
  for (const [l1, v1, l2, v2] of rows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(v1, 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(v2, 155, y); }
    y += 6;
  }
  y += 4; doc.line(14, y, 196, y); y += 6;

  const cols = [14, 60, 100, 125, 152, 175];
  const headers = ["Produkt", "SKU", "Kat./Stan", "Ilosc", "Cena jedn.", "Wartosc"];
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, cols[i] + 1, y + 4));
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(pl((item.product_name || "—").substring(0, 26)), cols[0] + 1, y + 3);
    doc.text(item.internal_code || "—", cols[1] + 1, y + 3);
    doc.text(pl(item.category || "—"), cols[2] + 1, y + 3);
    doc.text(`${item.quantity}`, cols[3] + 1, y + 3);
    doc.text(`${(item.unit_price || 0).toFixed(2)}`, cols[4] + 1, y + 3);
    doc.setFont("helvetica", "bold"); doc.text(`${(item.total_value || 0).toFixed(2)}`, cols[5] + 1, y + 3); doc.setFont("helvetica", "normal");
    doc.setDrawColor(220); doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`RAZEM: ${(doc_data.total_value || 0).toFixed(2)} PLN`, 14, y);
  y += 12;
  addSignatureLine(doc, y);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}

export function exportPZ(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "PZ — PRZYJĘCIE ZEWNĘTRZNE", doc_data.document_number, doc_data.date);
  let y = 38;
  doc.setFontSize(9);
  const rows = [
    ["Paleta:", pallet?.pallet_code || "—", "Dostawca:", pl(pallet?.investor_name || doc_data.counterparty || "—")],
    ["Numer faktury:", doc_data.reference_number || "—", "Data:", doc_data.date || "—"],
    ["Wystawil:", pl(doc_data.created_by_name || "—"), "Status:", doc_data.status === "confirmed" ? "Zatwierdzony" : "Roboczy"],
  ];
  for (const [l1, v1, l2, v2] of rows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(v1, 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(v2, 150, y); }
    y += 6;
  }
  y += 4; doc.line(14, y, 196, y); y += 6;

  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Produkt", 15, y + 4); doc.text("Ilosc", 120, y + 4); doc.text("Cena jedn.", 145, y + 4); doc.text("Wartosc", 172, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    doc.text(pl((item.product_name || "—").substring(0, 40)), 15, y + 3);
    doc.text(`${item.quantity} szt.`, 120, y + 3);
    doc.text(`${(item.unit_price || 0).toFixed(2)} PLN`, 145, y + 3);
    doc.setFont("helvetica", "bold"); doc.text(`${(item.total_value || 0).toFixed(2)} PLN`, 172, y + 3); doc.setFont("helvetica", "normal");
    doc.setDrawColor(220); doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`RAZEM: ${(doc_data.total_value || 0).toFixed(2)} PLN`, 14, y);
  y += 14;
  addSignatureLine(doc, y);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}