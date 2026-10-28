import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const SIZES = [["A", "A – mała (8×38×64 cm)"], ["B", "B – średnia (19×38×64 cm)"], ["C", "C – duża (41×38×64 cm)"]];

export default function OlxShippingSettings() {
  const [conn, setConn] = useState(null);
  const [size, setSize] = useState("A");
  const [weight, setWeight] = useState(2);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.OlxConnection.list("-connected_at", 1).then(([c]) => {
      if (!c) return;
      setConn(c); setSize(c.package_size || "A"); setWeight(c.package_weight_kg || 2);
    });
  }, []);

  const save = async () => {
    await base44.entities.OlxConnection.update(conn.id, { package_size: size, package_weight_kg: Number(weight) });
    toast({ title: "Zapisano ustawienia przesyłki OLX" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Truck className="w-3.5 h-3.5" />Przesyłka OLX</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">Przesyłka OLX (zawsze włączona)</p>
        {!conn ? <p className="text-xs text-muted-foreground">Najpierw połącz konto OLX.</p> : (
          <>
            <div className="space-y-1">
              {SIZES.map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={size === v} onChange={() => setSize(v)} />{l}
                </label>
              ))}
            </div>
            <div className="text-sm">Waga (kg)<Input type="number" min="0.1" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></div>
            <Button size="sm" className="w-full" onClick={save}>Zapisz</Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}