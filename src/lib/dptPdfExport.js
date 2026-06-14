import { jsPDF } from "jspdf";

// Same transliteration used by all other PDF exports
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

const COMPANY = "Vintrix Market";

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

function addSignatureLine(doc, y) {
  const pageH = doc.internal.pageSize.height;
  if (y + 30 > pageH - 10) { doc.addPage(); y = 20; }
  doc.setDrawColor(150);
  doc.line(14, y + 20, 90, y + 20);
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(pl("Podpis osoby odpowiedzialnej"), 14, y + 25);
  doc.line(120, y + 20, 196, y + 20);
  doc.text(pl("Pieczetka / zatwierdzenie"), 120, y + 25);
  doc.setTextColor(0);
  return y + 30;
}

function sectionLabel(doc, text, y) {
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(pl(text), 16, y);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

function row(doc, label, value, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(pl(String(label)), 14, y);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(pl(String(value ?? "—")), 120);
  doc.text(lines, 70, y);
  return y + Math.max(lines.length * 5, 5);
}

export function exportDptPdf({ dptDoc, sourceProduct, newProduct, pallet, user }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;

  addPageHeader(doc, "DPT — Dokument Przeklasyfikowania Towaru", dptDoc.document_number || "DPT/—", dptDoc.date || new Date().toISOString().slice(0, 10));

  let y = 38;

  // ---- Info ogolne ----
  y = sectionLabel(doc, "INFORMACJE OGOLNE", y);
  doc.setFontSize(9);
  const infoRows = [
    ["Numer dokumentu:", dptDoc.document_number || "—", "Data konwersji:", dptDoc.date || "—"],
    ["Odpowiedzialny:", pl(user?.full_name || user?.email || "—"), "Paleta zrodlowa:", pallet ? `${pallet.pallet_code} — ${pl(pallet.investor_name)}` : "—"],
    ["Powod:", pl("Identyfikacja nieznanego przedmiotu i przeklasyfikowanie na wlasciwy produkt"), "", ""],
  ];
  for (const [l1, v1, l2, v2] of infoRows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(pl(v1), 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(pl(v2), 148, y); }
    y += 6;
  }
  y += 4;
  doc.line(14, y, 196, y); y += 6;

  // ---- Produkt przed ----
  y = sectionLabel(doc, "PRODUKT PRZED KONWERSJA (Nieznany przedmiot)", y);
  doc.setFontSize(9);
  const beforeRows = [
    ["Nazwa:", pl(sourceProduct?.product_name || "—"), "SKU:", sourceProduct?.internal_code || "—"],
    ["Kategoria:", pl(sourceProduct?.category || "—"), "Ilosc:", "1 szt."],
    ["Wartosc mag.:", `${sourceProduct?.purchase_price ?? "—"} PLN`, "Stan:", pl(sourceProduct?.condition || "—")],
  ];
  for (const [l1, v1, l2, v2] of beforeRows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(pl(v1), 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(pl(v2), 148, y); }
    y += 6;
  }
  y += 4;
  doc.line(14, y, 196, y); y += 6;

  // ---- Produkt po ----
  y = sectionLabel(doc, "PRODUKT PO KONWERSJI (nowy opisany produkt)", y);
  doc.setFontSize(9);
  const afterRows = [
    ["Nowa nazwa:", pl(newProduct?.product_name || "—"), "Nowe SKU:", newProduct?.internal_code || "—"],
    ["Marka:", pl(newProduct?.brand || "—"), "Kategoria:", pl(newProduct?.category || "—")],
    ["Stan:", pl(newProduct?.condition || "—"), "Ilosc:", `${newProduct?.stock_quantity || 1} szt.`],
    ["Wartosc po:", `${newProduct?.purchase_price ?? "—"} PLN`, "Cena sprzedazy:", `${newProduct?.suggested_sale_price ?? "—"} PLN`],
  ];
  for (const [l1, v1, l2, v2] of afterRows) {
    doc.setFont("helvetica", "bold"); doc.text(l1, 14, y); doc.setFont("helvetica", "normal"); doc.text(pl(v1), 50, y);
    if (l2) { doc.setFont("helvetica", "bold"); doc.text(l2, 110, y); doc.setFont("helvetica", "normal"); doc.text(pl(v2), 148, y); }
    y += 6;
  }

  const diff = (newProduct?.purchase_price ?? 0) - (sourceProduct?.purchase_price ?? 0);
  if (Math.abs(diff) > 0.01) {
    doc.setTextColor(diff > 0 ? 200 : 0, diff > 0 ? 0 : 150, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Roznica wartosci: ${diff > 0 ? "+" : ""}${diff.toFixed(2)} PLN`, 14, y);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 6;
  }
  y += 4;
  doc.line(14, y, 196, y); y += 6;

  // ---- Podsumowanie AI ----
  if (dptDoc.dpt_ai_summary) {
    y = sectionLabel(doc, "PODSUMOWANIE ANALIZY AI", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(pl(dptDoc.dpt_ai_summary), 182);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 4;
    doc.line(14, y, 196, y); y += 6;
  }

  // ---- Uwagi ----
  if (dptDoc.notes) {
    y = sectionLabel(doc, "UWAGI", y);
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
    y = sectionLabel(doc, "ZDJECIA PRODUKTU", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Liczba zdiec w systemie: ${newProduct.images.length} szt.`, 14, y);
    y += 5;
    newProduct.images.slice(0, 4).forEach((url, i) => {
      doc.text(`[${i + 1}] ${url.slice(0, 80)}${url.length > 80 ? "..." : ""}`, 14, y);
      y += 4;
    });
    doc.setTextColor(0);
    y += 4;
  }

  // ---- Status ----
  if (y > 240) { doc.addPage(); y = 20; }
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setFillColor(230, 255, 230);
  doc.rect(14, y, 182, 8, "F");
  doc.text("STATUS: ZATWIERDZONY", 14, y + 5.5);
  y += 14;

  // ---- Footer ----
  addSignatureLine(doc, y);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Wygenerowano: ${new Date().toLocaleString("pl-PL")} | Vintrix Market`, pageW / 2, 290, { align: "center" });

  doc.save(`${(dptDoc.document_number || "DPT").replace(/\//g, "-")}.pdf`);
}