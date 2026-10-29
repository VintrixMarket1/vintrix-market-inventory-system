import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EndOfferDialog from "@/components/allegro/EndOfferDialog";

async function loadMismatches() {
  const offers = [];
  for (let offset = 0; ; offset += 100) {
    const res = await base44.functions.invoke("getAllegroOffers", { limit: 100, offset });
    offers.push(...res.data.offers);
    if (res.data.offers.length < 100) break;
  }
  const open = offers.filter((o) => o.signature && o.status !== "ENDED");
  const sigs = [...new Set(open.map((o) => o.signature))];
  const sold = [];
  for (let i = 0; i < sigs.length; i += 100) {
    const page = await base44.entities.Product.filter({ internal_code: { $in: sigs.slice(i, i + 100) }, status: "sold" });
    sold.push(...page);
  }
  const byCode = Object.fromEntries(sold.map((p) => [p.internal_code, p]));
  return open.filter((o) => byCode[o.signature]).map((o) => ({ offer: o, product: byCode[o.signature] }));
}

export default function AllegroReconcile() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { toast } = useToast();

  const refresh = () => {
    setLoading(true);
    loadMismatches().then(setItems).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const handleDone = (id, status, action) => {
    setItems((list) => list.filter((i) => i.offer.id !== id));
    setSelected(null);
    toast({
      title: action === "deleted" ? "Oferta usunięta" : "Oferta zakończona",
      description: `Oferta ${id} — status: ${status}`,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rozbieżności Allegro</h1>
          <p className="text-sm text-muted-foreground">Oferty niezakończone, których sygnatura wskazuje produkt sprzedany w magazynie.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Odśwież
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">Brak rozbieżności.</p>
      ) : (
        <div className="divide-y rounded-xl border">
          {items.map((i) => (
            <div key={i.offer.id} className="flex items-center gap-4 p-4">
              {i.offer.image && <img src={i.offer.image} alt="" className="w-12 h-12 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{i.offer.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{i.offer.signature} · {i.offer.id}</p>
              </div>
              <Badge variant={i.offer.status === "ACTIVE" ? "destructive" : "secondary"}>{i.offer.status}</Badge>
              <Button size="sm" variant="destructive" onClick={() => setSelected(i)}>Zakończ</Button>
            </div>
          ))}
        </div>
      )}
      <EndOfferDialog item={selected} onClose={() => setSelected(null)} onDone={handleDone} />
    </div>
  );
}