import { jsPDF } from "jspdf";
import { pl, addPageHeader, sectionHeader, infoRow, addSignatureLine, pdfFooter, statusBar } from "./pdfShared";

export function exportDRP(pallet, products, docs) {
  const doc = new jsPDF();
  const drpDoc = docs.find(d => d.document_type === "DRP" && d.pallet_id === pallet.id);
  const pzDoc  = docs.find(d => d.document_type === "PZ"  && d.pallet_id === pallet.id);
  const rwDoc  = docs.find(d => d.document_type === "RW"  && d.pallet_id === pallet.id);
  const pwDoc  = docs.find(d => d.document_type === "PW"  && d.pallet_id === pallet.id);

  const number = drpDoc?.document_number || "DRP/—";
  const date   = drpDoc?.date || new Date().toISOString().split("T")[0];
  const totalValue = pallet.total_value || ((pallet.total_cost || 0) + (pallet.additional_costs || 0));

  // Use saved items from DRP document (snapshot at time of explosion), fall back to live products
  const items = (drpDoc?.items && drpDoc.items.length > 0) ? drpDoc.items : products.map(p => ({
    product_id: p.id,
    product_name: p.product_name,
    internal_code: p.internal_code || "",
    category: p.category || "",
    condition: p.condition || "",
    quantity: p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1,
    unit_price: p.purchase_price || 0,
    total_value: (p.purchase_price || 0) * (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1),
  }));

  addPageHeader(doc, "DRP — Protokol Rozbicia Palety / Dekompletacja", number, date);
  let y = 32;

  y = sectionHeader(doc, "DANE PALETY", y);
  y = infoRow(doc, "Numer palety:", pallet.pallet_code, "Dostawca / Inwestor:", pallet.investor_name || "—", y);
  y = infoRow(doc, "Data zakupu:", pallet.purchase_date || "—", "Numer faktury:", pallet.invoice_number || "—", y);
  y = infoRow(doc, "Wartosc zakupowa:", `${(pallet.total_cost || 0).toFixed(2)} PLN`, "Koszty dodatkowe:", `${(pallet.additional_costs || 0).toFixed(2)} PLN`, y);
  y = infoRow(doc, "Wartosc do rozliczenia:", `${totalValue.toFixed(2)} PLN`, "Metoda alokacji:", drpDoc?.allocation_method || pallet.allocation_method || "equal", y);
  y = infoRow(doc, "Dokument PZ:", pzDoc?.document_number || "—", "Dokument RW:", rwDoc?.document_number || "—", y);
  y = infoRow(doc, "Dokument PW:", pwDoc?.document_number || "—", "Wystawil:", drpDoc?.created_by_name || pallet.exploded_by || "—", y);
  y += 4;

  y = sectionHeader(doc, "LISTA PRODUKTOW", y);
  const cols = [14, 65, 100, 120, 145, 170];
  const headers = ["Produkt / SKU", "Kategoria", "Stan", "Ilosc", "Cena jedn.", "Wartosc"];
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => doc.text(h, cols[i] + 1, y + 4));
  y += 7;

  doc.setFont("helvetica", "normal");
  let totalAllocated = 0;
  for (const item of items) {
    if (y > 270) { doc.addPage(); y = 20; }
    const qty = item.quantity || 1;
    const unitPrice = item.unit_price || 0;
    const itemTotal = item.total_value != null ? item.total_value : unitPrice * qty;
    doc.setFontSize(8);
    doc.text(pl((item.product_name || "—").substring(0, 28)), cols[0] + 1, y + 3);
    if (item.internal_code) {
      doc.setFontSize(7); doc.setTextColor(130);
      doc.text(item.internal_code, cols[0] + 1, y + 7);
      doc.setFontSize(8); doc.setTextColor(0);
    }
    doc.text(pl(item.category || "—"), cols[1] + 1, y + 3);
    doc.text(pl(item.condition || "—"), cols[2] + 1, y + 3);
    doc.text(String(qty), cols[3] + 1, y + 3);
    doc.text(`${unitPrice.toFixed(2)} PLN`, cols[4] + 1, y + 3);
    doc.setFont("helvetica", "bold");
    doc.text(`${itemTotal.toFixed(2)} PLN`, cols[5] + 1, y + 3);
    doc.setFont("helvetica", "normal");
    totalAllocated += itemTotal;
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
  y = statusBar(doc, y, "STATUS: ZATWIERDZONE");
  addSignatureLine(doc, y);
  pdfFooter(doc);
  doc.save(`${number.replace(/\//g, "-")}.pdf`);
}

export function exportRW(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "RW — Rozchod Wewnetrzny", doc_data.document_number, doc_data.date);
  let y = 32;

  y = sectionHeader(doc, "DANE DOKUMENTU", y);
  y = infoRow(doc, "Paleta:", pallet?.pallet_code || "—", "Dostawca:", pallet?.investor_name || doc_data.counterparty || "—", y);
  y = infoRow(doc, "Powiazany PZ:", doc_data.related_pz_number || "—", "Data:", doc_data.date || "—", y);
  y = infoRow(doc, "Wystawil:", doc_data.created_by_name || "—", "Powod:", "Rozbicie palety / dekompletacja", y);
  y += 4;

  y = sectionHeader(doc, "POZYCJE DOKUMENTU", y);
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Pozycja", 15, y + 4); doc.text("Ilosc", 130, y + 4); doc.text("Wartosc", 165, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(pl(item.product_name || "—"), 15, y + 3);
    doc.text(`${item.quantity} szt.`, 130, y + 3);
    doc.setFont("helvetica", "bold"); doc.text(`${(item.total_value || 0).toFixed(2)} PLN`, 165, y + 3); doc.setFont("helvetica", "normal");
    doc.setDrawColor(220); doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`RAZEM: ${(doc_data.total_value || 0).toFixed(2)} PLN`, 14, y);
  y += 8;
  if (doc_data.notes) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic");
    doc.text(`Uwagi: ${pl(doc_data.notes)}`, 14, y); y += 8;
    doc.setFont("helvetica", "normal");
  }
  y = statusBar(doc, y, "STATUS: ZATWIERDZONY");
  addSignatureLine(doc, y);
  pdfFooter(doc);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}

export function exportPW(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "PW — Przyjecie Wewnetrzne", doc_data.document_number, doc_data.date);
  let y = 32;

  y = sectionHeader(doc, "DANE DOKUMENTU", y);
  y = infoRow(doc, "Paleta:", pallet?.pallet_code || "—", "Dostawca:", pallet?.investor_name || "—", y);
  y = infoRow(doc, "Powiazany PZ:", doc_data.related_pz_number || "—", "Powiazany RW:", doc_data.related_rw_number || "—", y);
  y = infoRow(doc, "Metoda alokacji:", doc_data.allocation_method || "equal", "Wystawil:", doc_data.created_by_name || "—", y);
  y += 4;

  y = sectionHeader(doc, "POZYCJE DOKUMENTU", y);
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
  y += 8;
  y = statusBar(doc, y, "STATUS: ZATWIERDZONY");
  addSignatureLine(doc, y);
  pdfFooter(doc);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}

export function exportWZ(doc_data) {
  const doc = new jsPDF();
  addPageHeader(doc, "WZ — Wydanie Zewnetrzne", doc_data.document_number, doc_data.date);
  let y = 32;

  y = sectionHeader(doc, "DANE DOKUMENTU", y);
  y = infoRow(doc, "Kontrahent:", doc_data.counterparty || "—", "Platforma:", doc_data.platform || "—", y);
  y = infoRow(doc, "Nr sprzedazy:", doc_data.sale_id || "—", "Data:", doc_data.date || "—", y);
  y = infoRow(doc, "Wystawil:", doc_data.created_by_name || "—", "Status:", doc_data.status === "confirmed" ? "Zatwierdzony" : "Roboczy", y);
  y += 4;

  y = sectionHeader(doc, "POZYCJE DOKUMENTU", y);
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Produkt", 15, y + 4); doc.text("SKU", 95, y + 4); doc.text("Ilosc", 130, y + 4); doc.text("Cena jedn.", 148, y + 4); doc.text("Wartosc", 172, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(pl((item.product_name || "—").substring(0, 38)), 15, y + 3);
    doc.text(item.internal_code || "—", 95, y + 3);
    doc.text(`${item.quantity} szt.`, 130, y + 3);
    doc.text(`${(item.unit_price || 0).toFixed(2)} PLN`, 148, y + 3);
    doc.setFont("helvetica", "bold"); doc.text(`${(item.total_value || 0).toFixed(2)} PLN`, 172, y + 3); doc.setFont("helvetica", "normal");
    doc.setDrawColor(220); doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`RAZEM: ${(doc_data.total_value || 0).toFixed(2)} PLN`, 14, y);
  y += 8;
  if (doc_data.notes) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic");
    doc.text(`Uwagi: ${pl(doc_data.notes)}`, 14, y); y += 8;
    doc.setFont("helvetica", "normal");
  }
  y = statusBar(doc, y, "STATUS: ZATWIERDZONY");
  addSignatureLine(doc, y);
  pdfFooter(doc);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}

export function exportPZ(doc_data, pallet) {
  const doc = new jsPDF();
  addPageHeader(doc, "PZ — Przyjecie Zewnetrzne", doc_data.document_number, doc_data.date);
  let y = 32;

  y = sectionHeader(doc, "DANE DOKUMENTU", y);
  y = infoRow(doc, "Paleta:", pallet?.pallet_code || "—", "Dostawca:", pallet?.investor_name || doc_data.counterparty || "—", y);
  y = infoRow(doc, "Numer faktury:", doc_data.reference_number || "—", "Data:", doc_data.date || "—", y);
  y = infoRow(doc, "Wystawil:", doc_data.created_by_name || "—", "Status:", doc_data.status === "confirmed" ? "Zatwierdzony" : "Roboczy", y);
  y += 4;

  y = sectionHeader(doc, "POZYCJE DOKUMENTU", y);
  doc.setFillColor(240, 240, 240); doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("Produkt", 15, y + 4); doc.text("Ilosc", 120, y + 4); doc.text("Cena jedn.", 145, y + 4); doc.text("Wartosc", 172, y + 4);
  y += 7;
  doc.setFont("helvetica", "normal");
  for (const item of (doc_data.items || [])) {
    if (y > 270) { doc.addPage(); y = 20; }
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
  y += 8;
  y = statusBar(doc, y, "STATUS: ZATWIERDZONY");
  addSignatureLine(doc, y);
  pdfFooter(doc);
  doc.save(`${doc_data.document_number.replace(/\//g, "-")}.pdf`);
}