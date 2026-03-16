import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const CSV_TEMPLATE = `product_name,category,condition,purchase_price,suggested_sale_price,size,warehouse_zone,shelf,box_number,pallet_code,notes
Nike Air Max 90,shoes,like_new,45,120,42,A,1,3,,
Zara Hoodie Black,clothing,new,25,65,L,A,2,1,PAL-001,Good condition`;

const CATEGORIES = ["clothing", "shoes", "accessories", "electronics", "home", "toys", "sports", "books", "other"];
const CONDITIONS = ["new", "like_new", "used"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { rows: [], errors: ["File is empty or has no data rows"] };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim());
    const row = Object.fromEntries(headers.map((h, idx) => [h, vals[idx] || ""]));
    if (!row.product_name) { errors.push(`Row ${i + 1}: missing product_name`); continue; }
    if (!CATEGORIES.includes(row.category)) { errors.push(`Row ${i + 1}: invalid category "${row.category}"`); continue; }
    if (!CONDITIONS.includes(row.condition)) { errors.push(`Row ${i + 1}: invalid condition "${row.condition}"`); continue; }
    rows.push(row);
  }
  return { rows, errors };
}

function generateCode(category) {
  const prefix = category.substring(0, 3).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export default function CsvImport({ open, onClose, pallets, selectedPalletId, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [palletId, setPalletId] = useState(selectedPalletId || "");

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vintrix_import_template.csv";
    a.click();
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setPreview(parsed);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview?.rows?.length) return;
    setImporting(true);
    const products = preview.rows.map(row => ({
      product_name: row.product_name,
      category: row.category,
      condition: row.condition,
      purchase_price: parseFloat(row.purchase_price) || 0,
      suggested_sale_price: parseFloat(row.suggested_sale_price) || 0,
      size: row.size || undefined,
      warehouse_zone: row.warehouse_zone || undefined,
      shelf: row.shelf || undefined,
      box_number: row.box_number || undefined,
      notes: row.notes || undefined,
      internal_code: generateCode(row.category),
      status: "in_stock",
      quantity: 1,
      images: [],
      pallet_id: palletId || undefined,
    }));
    await base44.entities.Product.bulkCreate(products);
    setImporting(false);
    setResult({ count: products.length });
    onImported();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <span className="text-sm text-slate-600">Download the template first</span>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
              <Download className="w-4 h-4" /> Template
            </Button>
          </div>

          {pallets?.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Assign to Pallet (optional)</label>
              <select
                value={palletId}
                onChange={e => setPalletId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">No pallet</option>
                {pallets.map(p => (
                  <option key={p.id} value={p.id}>{p.pallet_code} — {p.investor_name}</option>
                ))}
              </select>
            </div>
          )}

          <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">{file ? file.name : "Click to upload CSV file"}</p>
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>

          {preview && (
            <div className="space-y-2">
              {preview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {preview.errors.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {e}
                    </div>
                  ))}
                </div>
              )}
              {preview.rows.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm text-emerald-700 font-medium">
                    ✓ {preview.rows.length} products ready to import
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {preview.rows.slice(0, 3).map(r => r.product_name).join(", ")}
                    {preview.rows.length > 3 ? ` +${preview.rows.length - 3} more` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">
                Successfully imported {result.count} products!
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={importing || !preview?.rows?.length}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {preview?.rows?.length > 0 ? `${preview.rows.length} Products` : ""}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}