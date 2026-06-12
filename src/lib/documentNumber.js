/**
 * Generates a warehouse document number in format: TYPE/YYYY/MM/NNN
 * It queries existing documents to find the next sequential number for the month.
 */
import { base44 } from "@/api/base44Client";

export async function generateDocumentNumber(type) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${type}/${year}/${month}/`;

  const existing = await base44.entities.WarehouseDocument.list("-created_date", 200);
  const thisMonth = existing.filter(d => d.document_number?.startsWith(prefix));

  let maxNum = 0;
  for (const doc of thisMonth) {
    const parts = doc.document_number.split("/");
    const num = parseInt(parts[3]) || 0;
    if (num > maxNum) maxNum = num;
  }

  const nextNum = String(maxNum + 1).padStart(3, "0");
  return `${prefix}${nextNum}`;
}