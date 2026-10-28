import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OlxShippingSettings from "@/components/inventory/OlxShippingSettings";

export default function OlxPublishButton({ selectedIds, onDone }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = async () => {
    const res = await base44.functions.invoke("getOlxAuthUrl", { redirect_uri: `${window.location.origin}/OlxCallback` });
    window.location.href = res.data.url;
  };

  const publish = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("publishToOlx", { product_ids: [...selectedIds] });
      const results = res.data.results || [];
      const ok = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok);
      toast({
        title: `OLX: wystawiono ${ok} z ${results.length}`,
        description: failed.slice(0, 3).map(f => `${f.name}: ${f.error}`).join("\n") || undefined,
        variant: failed.length ? "destructive" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (ok) onDone?.();
    } catch (e) {
      if (e?.response?.status === 409) {
        if (confirm("Konto OLX nie jest połączone. Połączyć teraz?")) await connect();
      } else {
        toast({ title: "Błąd OLX", description: e?.response?.data?.error || e.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <>
    <OlxShippingSettings />
    <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={publish} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
      OLX
    </Button>
    </>
  );
}