// Shared PDF utilities for all warehouse documents
import { jsPDF } from "jspdf";

export const COMPANY_NAME = "Vintrix Market Sp. Z O.O.";
export const COMPANY_NIP = "NIP: 7322230672";

// Transliterate Polish characters (jsPDF built-in fonts don't support them)
export function pl(str) {
  if (!str) return String(str ?? "");
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

// Dark header bar — same style across all docs
export function addPageHeader(doc, title, docNumber, date) {
  const pageW = doc.internal.pageSize.width;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(COMPANY_NAME, 14, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(COMPANY_NIP, 14, 16);
  doc.text(pl(title), 14, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pl(docNumber), pageW - 14, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Data: ${date}`, pageW - 14, 16, { align: "right" });

  doc.setTextColor(0, 0, 0);
}

// Gray section header bar
export function sectionHeader(doc, text, y) {
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(pl(text), 16, y);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

// Two-column info row
export function infoRow(doc, l1, v1, l2, v2, y) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold"); doc.text(pl(String(l1)), 14, y);
  doc.setFont("helvetica", "normal"); doc.text(pl(String(v1 ?? "—")), 55, y);
  if (l2 !== undefined) {
    doc.setFont("helvetica", "bold"); doc.text(pl(String(l2)), 110, y);
    doc.setFont("helvetica", "normal"); doc.text(pl(String(v2 ?? "—")), 155, y);
  }
  return y + 6;
}

// Signature lines
export function addSignatureLine(doc, y) {
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

// Standard items table
export function itemsTable(doc, items, y, colDefs) {
  // colDefs: [{x, w, label, key, align, bold}]
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  colDefs.forEach(col => {
    doc.text(col.label, col.x + 1, y + 4, { align: col.align || "left" });
  });
  y += 7;

  doc.setFont("helvetica", "normal");
  for (const item of (items || [])) {
    if (y > 270) { doc.addPage(); y = 20; }
    colDefs.forEach(col => {
      const val = typeof col.value === "function" ? col.value(item) : (item[col.key] ?? "—");
      if (col.bold) doc.setFont("helvetica", "bold");
      doc.text(pl(String(val)), col.x + 1, y + 3, { align: col.align || "left" });
      if (col.bold) doc.setFont("helvetica", "normal");
    });
    doc.setDrawColor(220);
    doc.line(14, y + 8, 196, y + 8);
    y += 9;
  }
  return y;
}

export function statusBar(doc, y, label = "STATUS: ZATWIERDZONY") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setFillColor(230, 255, 230);
  doc.rect(14, y, 182, 8, "F");
  doc.text(pl(label), 14, y + 5.5);
  doc.setFont("helvetica", "normal");
  return y + 14;
}

export function pdfFooter(doc) {
  const pageW = doc.internal.pageSize.width;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Wygenerowano: ${new Date().toLocaleString("pl-PL")} | ${COMPANY_NAME} | ${COMPANY_NIP}`,
    pageW / 2, 290, { align: "center" }
  );
  doc.setTextColor(0);
}