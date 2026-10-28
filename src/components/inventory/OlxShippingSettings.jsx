import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Truck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SIZES = ["S", "M", "L", "XL"];

export default function OlxShippingSettings() {
  const [conn, setConn] = useState(null);
  const [carriers, setCarriers] = useState(null);
  const [size, setSize] = useState("M");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async (open) => {
    if (!open || carriers) return;
    setLoading(true);
    const [[c], res] = await Promise.all([
      base44.entities.OlxConnection.list("-connected_at", 1),
      base44.functions.invoke("getOlxDeliveryOptions", {}).catch(() => ({ data: { carriers: [] } })),
    ]);
    setConn(c || null);
    setCarriers(res.data.carriers || []);
    setSize(c?.package_size || "M");
    setSelected(c?.carriers?.length ? c.carriers : (res.data.carriers || []).map(x => x.id));
    setLoading(false);
  };

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    if (!selected.length) return toast({ title: "Wybierz min. jednego przewoźnika", variant: "destructive" });
    await base44.entities.OlxConnection.update(conn.id, { package_size: size, carriers: selected });
    toast({ title: "Zapisano ustawienia Przesyłki OLX" });
  };

  return (
    <Popover onOpenChange={load}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Truck className="w-3.5 h-3.5" />Przesyłka OLX</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">Przesyłka OLX (zawsze włączona)</p>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : !conn ? <p className="text-xs text-muted-foreground">Najpierw połącz konto OLX.</p> : (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gabaryt paczki</p>
              <div className="flex gap-1">
                {SIZES.map(s => (
                  <Button key={s} size="sm" variant={size === s ? "default" : "outline"} className="h-7 flex-1" onClick={() => setSize(s)}>{s}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Przewoźnicy</p>
              {carriers.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  {c.title} <span className="text-xs text-muted-foreground">({c.sizes.join("/")})</span>
                </label>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={save}>Zapisz</Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}