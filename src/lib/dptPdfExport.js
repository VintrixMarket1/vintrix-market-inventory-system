import { jsPDF } from "jspdf";
import { pl, addPageHeader, sectionHeader, infoRow, addSignatureLine, pdfFooter, statusBar } from "./pdfShared";

export function exportDptPdf({ dptDoc, sourceProduct, newProduct, pallet, user }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = dptDoc.date || new Date().toISOString().slice(0, 10);

  addPageHeader(doc, "DPT — Dokument Przeklasyfikowania Towaru", dptDoc.document_number || "DPT/—", date);

  let y = 32;

  // ---- Info ogolne ----
  y = sectionHeader(doc, "INFORMACJE OGOLNE", y);
  y = infoRow(doc, "Numer dokumentu:", dptDoc.document_number, "Data konwersji:", date, y);
  y = infoRow(doc, "Odpowiedzialny:", user?.full_name || user?.email || "—", "Paleta:", pallet ? `${pallet.pallet_code} — ${pl(pallet.investor_name)}` : "—", y);
  y = infoRow(doc, "Powod:", "Identyfikacja nieznanego przedmiotu i przeklasyfikowanie", "", "", y);
  y += 3;

  // ---- Produkt przed ----
  y = sectionHeader(doc, "PRODUKT PRZED KONWERSJA (Nieznany przedmiot)", y);
  y = infoRow(doc, "Nazwa:", sourceProduct?.product_name, "SKU:", sourceProduct?.internal_code || "—", y);
  y = infoRow(doc, "Kategoria:", sourceProduct?.category || "—", "Stan:", sourceProduct?.condition || "—", y);
  y = infoRow(doc, "Wartosc mag.:", `${sourceProduct?.purchase_price ?? "—"} PLN`, "Ilosc:", "1 szt.", y);
  y += 3;

  // ---- Produkt po ----
  y = sectionHeader(doc, "PRODUKT PO KONWERSJI", y);
  y = infoRow(doc, "Nowa nazwa:", newProduct?.product_name, "Nowe SKU:", newProduct?.internal_code || "—", y);
  y = infoRow(doc, "Marka:", newProduct?.brand || "—", "Kategoria:", newProduct?.category || "—", y);
  y = infoRow(doc, "Stan:", newProduct?.condition || "—", "Ilosc:", `${newProduct?.stock_quantity || 1} szt.`, y);
  y = infoRow(doc, "Wartosc po:", `${newProduct?.purchase_price ?? "—"} PLN`, "Cena sprzedazy:", `${newProduct?.suggested_sale_price ?? "—"} PLN`, y);

  const diff = (newProduct?.purchase_price ?? 0) - (sourceProduct?.purchase_price ?? 0);
  if (Math.abs(diff) > 0.01) {
    doc.setTextColor(diff > 0 ? 200 : 0, diff > 0 ? 0 : 150, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Roznica wartosci: ${diff > 0 ? "+" : ""}${diff.toFixed(2)} PLN`, 14, y);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 6;
  }
  y += 3;

  // ---- AI Summary ----
  if (dptDoc.dpt_ai_summary) {
    y = sectionHeader(doc, "PODSUMOWANIE ANALIZY AI", y);
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(pl(dptDoc.dpt_ai_summary), 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;
  }

  // ---- Uwagi ----
  if (dptDoc.notes) {
    y = sectionHeader(doc, "UWAGI", y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const lines = doc.splitTextToSize(pl(dptDoc.notes), 182);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
    doc.setFont("helvetica", "normal");
  }

  // ---- Zdjecia ----
  if (newProduct?.images?.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    y = sectionHeader(doc, "ZDJECIA PRODUKTU", y);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Liczba zdiec: ${newProduct.images.length} szt.`, 14, y);
    y += 5;
    newProduct.images.slice(0, 4).forEach((url, i) => {
      doc.text(`[${i + 1}] ${url.slice(0, 80)}${url.length > 80 ? "..." : ""}`, 14, y);
      y += 4;
    });
    doc.setTextColor(0);
    y += 3;
  }

  if (y > 240) { doc.addPage(); y = 20; }
  y = statusBar(doc, y, "STATUS: ZATWIERDZONY");
  addSignatureLine(doc, y);
  pdfFooter(doc);

  doc.save(`${(dptDoc.document_number || "DPT").replace(/\//g, "-")}.pdf`);
}