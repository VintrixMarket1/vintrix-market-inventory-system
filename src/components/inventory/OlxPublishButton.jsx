import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OlxShippingSettings from "@/components/inventory/OlxShippingSettings";
import OlxPublishDialog from "@/components/inventory/OlxPublishDialog";

export default function OlxPublishButton({ selectedIds, onDone }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prep, setPrep] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = async () => {
    const res = await base44.functions.invoke("getOlxAuthUrl", { redirect_uri: `${window.location.origin}/OlxCallback` });
    window.location.href = res.data.url;
  };

  const handleError = async (e) => {
    if (e?.response?.status === 409) {
      if (confirm("Konto OLX nie jest połączone. Połączyć teraz?")) await connect();
    } else {
      toast({ title: "Błąd OLX", description: e?.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const prepare = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("publishToOlx", { product_ids: [...selectedIds], mode: "prepare" });
      const results = res.data.results || [];
      setPrep({ items: results.filter(r => r.ok), skipped: results.filter(r => !r.ok) });
    } catch (e) {
      await handleError(e);
    }
    setLoading(false);
  };

  const publish = async (overrides) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("publishToOlx", { product_ids: Object.keys(overrides), overrides });
      const results = res.data.results || [];
      const ok = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok);
      const noDelivery = results.filter(r => r.ok && !r.delivery_ok);
      const lines = [
        ...failed.slice(0, 4).map(f => `✗ ${f.name}: ${f.error}`),
        ...noDelivery.slice(0, 3).map(f => `⚠ ${f.name}: OLX nie potwierdził Przesyłki OLX`),
      ];
      toast({
        title: `OLX: wystawiono ${ok} z ${results.length}`,
        description: lines.join("\n") || undefined,
        variant: failed.length || noDelivery.length ? "destructive" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (!failed.length) setPrep(null);
      if (ok) onDone?.();
    } catch (e) {
      await handleError(e);
    }
    setSubmitting(false);
  };

  return (
    <>
    <OlxShippingSettings />
    <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={prepare} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      OLX
    </Button>
    <OlxPublishDialog
      open={!!prep}
      items={prep?.items || []}
      skipped={prep?.skipped || []}
      submitting={submitting}
      onClose={() => setPrep(null)}
      onSubmit={publish}
    />
    </>
  );
}