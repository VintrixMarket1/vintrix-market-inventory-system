import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function PartialRefundModal({ sale, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const alreadyRefunded = sale.refund_amount || 0;
  const maxRefundable = (sale.sale_price || 0) - alreadyRefunded;
  const refundStatus = sale.refund_status || "none";

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Nieprawidłowa kwota", variant: "destructive" });
      return;
    }
    if (amt > maxRefundable) {
      toast({ title: `Maksymalna kwota zwrotu to ${maxRefundable.toFixed(2)} PLN`, variant: "destructive" });
      return;
    }

    if (!reason.trim()) {
      toast({ title: "Podaj powód zwrotu", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const res = await base44.functions.invoke("processPartialRefund", {
        sale_id: sale.id,
        refund_amount: amt,
        reason: reason.trim(),
      });

      if (res.data?.success) {
        toast({
          title: "Zwrot zrealizowany",
          description: `Zwrócono ${amt.toFixed(2)} PLN klientowi ${sale.customer_name || sale.customer_email || ""}`.trim(),
        });
        onSaved();
        onClose();
      } else {
        toast({ title: "Błąd", description: res.data?.error || "Nieznany błąd", variant: "destructive" });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Nieznany błąd";
      toast({ title: "Błąd zwrotu", description: msg, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            Częściowy zwrot środków
          </DialogTitle>
          <DialogDescription>
            Zwróć część kosztów zakupu klientowi zgłaszającemu nieprawidłowość.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Sale summary */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-slate-900 truncate">{sale.product_name || "Produkt"}</p>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Cena sprzedaży:</span>
              <span className="font-medium">{(sale.sale_price || 0).toFixed(2)} PLN</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Klient:</span>
              <span className="font-medium truncate max-w-[160px]">{sale.customer_name || sale.customer_email || "—"}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Data sprzedaży:</span>
              <span className="font-medium">{sale.sale_date ? format(new Date(sale.sale_date), "dd.MM.yyyy") : "—"}</span>
            </div>
          </div>

          {/* Existing refund info */}
          {refundStatus !== "none" && (
            <div className={`rounded-lg p-3 flex items-start gap-2 ${refundStatus === "full" ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"}`}>
              {refundStatus === "full"
                ? <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              <div className="text-xs">
                <p className={`font-medium ${refundStatus === "full" ? "text-blue-700" : "text-amber-700"}`}>
                  {refundStatus === "full" ? "Pełny zwrot już wykonany" : "Częściowy zwrot już wykonany"}
                </p>
                <p className="text-slate-500">
                  Zwrócono: {alreadyRefunded.toFixed(2)} PLN
                  {sale.refund_date && ` • ${format(new Date(sale.refund_date), "dd.MM.yyyy")}`}
                </p>
                {sale.refund_reason && <p className="text-slate-400 mt-0.5">Powód: {sale.refund_reason}</p>}
              </div>
            </div>
          )}

          {/* Refund form */}
          {maxRefundable > 0 ? (
            <>
              <div className="space-y-1.5">
                <Label>Kwota zwrotu (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundable}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="border-amber-300 focus-visible:ring-amber-400"
                />
                <p className="text-xs text-slate-400">
                  Maksymalnie: {maxRefundable.toFixed(2)} PLN
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Powód zwrotu</Label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="np. Produkt dotarł z uszkodzeniem, brakujący element, niezgodność z opisem..."
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Anuluj</Button>
                <Button onClick={handleSubmit} disabled={processing} className="bg-amber-600 hover:bg-amber-700">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Zwróć {amount ? `${parseFloat(amount).toFixed(2)} PLN` : ""}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm text-slate-500">
              Całkowita kwota sprzedaży została już zwrócona.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}