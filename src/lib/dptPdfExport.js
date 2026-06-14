import { jsPDF } from "jspdf";

function wrapText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function sectionHeader(doc, text, y) {
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y - 4, 182, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(text, 16, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

function row(doc, label, value, x, y, labelW = 55) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(String(label), x, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(value ?? "—"), x + labelW, y);
  return y + 5;
}

export function exportDptPdf({ dptDoc, sourceProduct, newProduct, pallet, user }) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 15;
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - 2 * margin;

  // ---- Header ----
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageW, 22, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("VINTRIX MARKET", margin, 10);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Dokument Przeklasyfikowania Towaru", margin, 16);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(dptDoc.document_number || "DPT/—", pageW - margin, 10, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Data: ${dptDoc.date || new Date().toISOString().slice(0, 10)}`, pageW - margin, 16, { align: "right" });

  pdf.setTextColor(0, 0, 0);
  y = 30;

  // ---- Info block ----
  y = sectionHeader(pdf, "INFORMACJE OGÓLNE", y);
  y = row(pdf, "Numer dokumentu:", dptDoc.document_number, margin, y);
  y = row(pdf, "Data konwersji:", dptDoc.date, margin, y);
  y = row(pdf, "Odpowiedzialny:", user?.full_name || user?.email || "—", margin, y);
  y = row(pdf, "Powód:", "Identyfikacja nieznanego przedmiotu i przeklasyfikowanie na właściwy produkt", margin, y);
  if (pallet) {
    y = row(pdf, "Źródłowa paleta:", `${pallet.pallet_code} — ${pallet.investor_name}`, margin, y);
  }
  if (dptDoc.related_pz_number) {
    y = row(pdf, "Powiązany dok. PW:", dptDoc.related_pz_number, margin, y);
  }
  y += 3;

  // ---- Before ----
  y = sectionHeader(pdf, "PRODUKT PRZED KONWERSJĄ (Nieznany przedmiot)", y);
  y = row(pdf, "Stara nazwa:", sourceProduct?.product_name, margin, y);
  y = row(pdf, "Stare SKU:", sourceProduct?.internal_code || "—", margin, y);
  y = row(pdf, "Kategoria:", sourceProduct?.category || "—", margin, y);
  y = row(pdf, "Ilość:", "1 szt.", margin, y);
  y = row(pdf, "Wartość przed:", `${sourceProduct?.purchase_price ?? "—"} PLN`, margin, y);
  y += 3;

  // ---- After ----
  y = sectionHeader(pdf, "PRODUKT PO KONWERSJI (nowy opisany produkt)", y);
  y = row(pdf, "Nowa nazwa:", newProduct?.product_name, margin, y);
  y = row(pdf, "Nowe SKU:", newProduct?.internal_code || "—", margin, y);
  y = row(pdf, "Marka:", newProduct?.brand || "—", margin, y);
  y = row(pdf, "Kategoria:", newProduct?.category || "—", margin, y);
  y = row(pdf, "Stan:", newProduct?.condition || "—", margin, y);
  y = row(pdf, "Ilość:", `${newProduct?.stock_quantity || 1} szt.`, margin, y);
  y = row(pdf, "Wartość po:", `${newProduct?.purchase_price ?? "—"} PLN`, margin, y);
  y = row(pdf, "Cena sprzedaży:", `${newProduct?.suggested_sale_price ?? "—"} PLN`, margin, y);

  const diff = (newProduct?.purchase_price ?? 0) - (sourceProduct?.purchase_price ?? 0);
  if (diff !== 0) {
    pdf.setTextColor(diff > 0 ? 220 : 0, diff > 0 ? 0 : 150, 0);
    y = row(pdf, "Różnica wartości:", `${diff > 0 ? "+" : ""}${diff.toFixed(2)} PLN`, margin, y);
    pdf.setTextColor(0, 0, 0);
  }
  y += 3;

  // ---- AI Summary ----
  if (dptDoc.dpt_ai_summary) {
    y = sectionHeader(pdf, "PODSUMOWANIE ANALIZY AI", y);
    pdf.setFontSize(7.5);
    y = wrapText(pdf, dptDoc.dpt_ai_summary, margin, y, contentW, 4.5);
    y += 3;
  }

  // ---- Notes ----
  if (dptDoc.notes) {
    y = sectionHeader(pdf, "UWAGI", y);
    pdf.setFontSize(8);
    y = wrapText(pdf, dptDoc.notes, margin, y, contentW, 5);
    y += 3;
  }

  // ---- Photos ----
  if (newProduct?.images?.length > 0) {
    // check page space
    if (y > 220) { pdf.addPage(); y = 15; }
    y = sectionHeader(pdf, "ZDJĘCIA PRODUKTU (miniatury)", y);
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Zdjęcia dostępne w systemie: ${newProduct.images.length} szt.`, margin, y);
    y += 4;
    pdf.setTextColor(0, 0, 0);
    newProduct.images.slice(0, 4).forEach((url, i) => {
      pdf.text(`[${i + 1}] ${url.slice(0, 80)}${url.length > 80 ? "…" : ""}`, margin, y);
      y += 4;
    });
    y += 3;
  }

  // ---- Signature ----
  if (y > 240) { pdf.addPage(); y = 15; }
  y += 10;
  pdf.setDrawColor(100, 116, 139);
  pdf.line(margin, y, margin + 70, y);
  pdf.setFontSize(7.5);
  pdf.text("Podpis osoby odpowiedzialnej", margin, y + 4);
  pdf.line(pageW - margin - 70, y, pageW - margin, y);
  pdf.text("Pieczątka / zatwierdzenie", pageW - margin - 70, y + 4);

  // ---- Footer ----
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Wygenerowano: ${new Date().toLocaleString("pl-PL")} | Vintrix Market`, pageW / 2, 290, { align: "center" });

  pdf.save(`${dptDoc.document_number?.replace(/\//g, "-") || "DPT"}.pdf`);
}