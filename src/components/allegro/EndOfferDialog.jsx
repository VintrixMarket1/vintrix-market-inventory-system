import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function EndOfferDialog({ item, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("unpublishFromAllegro", { offer_id: item.offer.id });
      onDone(item.offer.id, res.data.status, res.data.action);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zakończyć ofertę na Allegro?</DialogTitle>
          <DialogDescription>Tej operacji nie można cofnąć z poziomu aplikacji.</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="rounded-lg border p-4 text-sm space-y-1">
            <p className="font-medium">{item.offer.name}</p>
            <p>Oferta: <span className="font-mono">{item.offer.id}</span></p>
            <p>Sygnatura: <span className="font-mono font-semibold">{item.offer.signature}</span></p>
            <p>Status Allegro: {item.offer.status} · Magazyn: sprzedany</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Anuluj</Button>
          <Button variant="destructive" onClick={confirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Zakończ ofertę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}