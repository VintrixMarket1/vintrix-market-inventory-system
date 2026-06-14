import React, { useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, X, FileText } from "lucide-react";
import { generateDocumentNumber } from "@/lib/documentNumber";
import { useAuth } from "@/lib/AuthContext";

export default function ReturnModal({ product, onClose, onReturned }) {
  const { userDisplayName } = useAuth();
  const queryClient = useQueryClient();
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("reklamacja");
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("in_stock");
  const [loading, setLoading] = useState(false);

  const handleReturn = async () => {
    setLoading(true);

    // 1. Znajdź powiązaną sprzedaż (żeby uzyskać cenę sprzedaży i numer WZ)
    let saleRecord = null;
    try {
      const sales = await base44.entities.Sale.filter({ product_id: product.id });
      if (sales.length > 0) {
        // Weź najnowszą
        saleRecord = sales.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      }
    } catch (_) {}

    // 2. Wygeneruj numer dokumentu KOR-WZ (używamy PW jako forma przyjęcia zwrotu)
    const docNumber = await generateDocumentNumber("PW");

    // 3. Utwórz dokument PW — Przyjęcie Wewnętrzne (zwrot)
    const notesText = [`ZWROT TOWARU`, `Powod: ${reason}`];
    if (notes) notesText.push(notes);
    if (saleRecord?.wz_document_number) notesText.push(`Powiazany WZ: ${saleRecord.wz_document_number}`);

    const docData = {
      document_number: docNumber,
      document_type: "PW",
      date: returnDate,
      status: "confirmed",
      notes: notesText.join(". "),
      counterparty: saleRecord?.customer_name || "Klient",
      items: [{
        product_id: product.id,
        product_name: product.product_name,
        internal_code: product.internal_code || "",
        category: product.category || "",
        condition: product.condition || "used",
        quantity: 1,
        unit_price: product.purchase_price || 0,
        total_value: product.purchase_price || 0,
      }],
      total_value: product.purchase_price || 0,
      created_by_name: userDisplayName,
    };

    const createdDoc = await base44.entities.WarehouseDocument.create(docData);

    // 4. Przywróć produkt na magazyn z nowym statusem
    await base44.entities.Product.update(product.id, {
      status: newStatus,
    });

    // 5. Inwaliduj cache
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse_documents"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });

    setLoading(false);
    onReturned?.();
    onClose();
  };

  const REASON_LABELS = {
    reklamacja: "Reklamacja (wada produktu)",
    pomylka: "Pomyłka klienta",
    niezgodnosc: "Niezgodność z opisem",
    odrzucenie: "Odmowa odbioru",
    inne: "Inne",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">Rejestracja zwrotu</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Product info */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Produkt</p>
          <p className="font-semibold text-slate-800">{product.product_name}</p>
          {product.internal_code && <p className="text-xs text-slate-400 font-mono mt-0.5">{product.internal_code}</p>}
          {product.brand && <p className="text-xs text-slate-500 mt-0.5">{product.brand}</p>}
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Data zwrotu</label>
            <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Powód zwrotu</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Status po zwrocie</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">Na stanie (gotowy do sprzedaży)</SelectItem>
                <SelectItem value="listed">Wystawiony</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Dodatkowe uwagi (opcjonalnie)</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={2}
              placeholder="Opis stanu po zwrocie, uwagi..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
            <FileText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700">
              System wygeneruje dokument <strong>PW (Przyjęcie Wewnętrzne)</strong> z adnotacją "Zwrot towaru" i przywróci produkt na stan magazynowy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Anuluj</Button>
          <Button
            onClick={handleReturn}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Przetwarzanie...
              </span>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Zarejestruj zwrot
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}