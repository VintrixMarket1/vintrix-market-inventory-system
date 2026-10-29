import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Download, Loader2, X } from "lucide-react";
import AddCategoryToList from "@/components/export/AddCategoryToList";
import AddProductToList from "@/components/export/AddProductToList";
import { downloadAllegroCsv, AVAILABLE_STATUSES, resolveTemplate, isTemplateComplete } from "@/lib/allegroCsv";
import TemplateAssignSelect from "@/components/export/TemplateAssignSelect";
import { downloadOlxCsv } from "@/lib/olxCsv";

const STATUS_LABEL = { in_stock: "Na stanie", listed: "Wystawiony" };

export default function ExportListDetail({ list, onUpdate }) {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const ids = list.product_ids || [];

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); return; }
    setLoading(true);
    base44.entities.Product.filter({ id: { $in: ids } }, { limit: 2000 })
      .then(page => setProducts((page.items || []).filter(p => AVAILABLE_STATUSES.includes(p.status))))
      .finally(() => setLoading(false));
  }, [list.id, ids.join(",")]);

  const addIds = (newIds) => {
    const merged = [...new Set([...ids, ...newIds])];
    onUpdate({ product_ids: merged });
    toast({ title: `Dodano produktów: ${merged.length - ids.length}` });
  };

  const removeId = (id) => onUpdate({ product_ids: ids.filter(i => i !== id) });

  const [templates, setTemplates] = useState([]);
  useEffect(() => { base44.entities.AllegroTemplate.list("-created_date").then(setTemplates); }, []);

  const assignTemplate = async (product, templateId) => {
    await base44.entities.Product.update(product.id, { allegro_template_id: templateId || null });
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, allegro_template_id: templateId || null } : p));
  };

  const missingCount = products.filter(p => !isTemplateComplete(resolveTemplate(p, templates))).length;

  const exportAllegro = () => {
    if (missingCount > 0 && !window.confirm(`${missingCount} produktów nie ma kompletnych danych producenta / osoby odpowiedzialnej. Eksportować mimo to (puste pola)?`)) return;
    downloadAllegroCsv(products, `allegro-${list.name}.csv`, templates);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{list.name}</h2>
        <div className="flex gap-2">
          <Button disabled={products.length === 0} onClick={exportAllegro}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" /> Allegro CSV ({products.length})
          </Button>
          <Button disabled={products.length === 0} onClick={() => downloadOlxCsv(products, `olx-${list.name}.csv`)}
            className="gap-1.5 bg-sky-600 hover:bg-sky-700">
            <Download className="w-4 h-4" /> OLX CSV ({products.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Dodaj produkty</TabsTrigger>
          <TabsTrigger value="category">Dodaj kategorię</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><AddProductToList existingIds={ids} onAdd={addIds} /></TabsContent>
        <TabsContent value="category"><AddCategoryToList onAdd={addIds} /></TabsContent>
      </Tabs>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Produkty na liście (sprzedane są pomijane)</p>
        {missingCount > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
            {missingCount} produktów bez kompletnego szablonu zgodności Allegro — przypisz szablon w kolumnie po prawej.
          </p>
        )}
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : products.length === 0 ? (
          <p className="text-sm text-slate-400">Lista jest pusta.</p>
        ) : (
          <div className="border border-slate-100 rounded-lg max-h-96 overflow-y-auto divide-y divide-slate-100">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 truncate">{p.listing_title || p.product_name} <span className="text-slate-400">{p.internal_code}</span></span>
                <TemplateAssignSelect product={p} templates={templates} onAssign={assignTemplate} />
                <span className="text-xs text-slate-500">{STATUS_LABEL[p.status]}</span>
                <span className="text-slate-500 w-20 text-right">{p.suggested_sale_price ? `${p.suggested_sale_price} zł` : "—"}</span>
                <button onClick={() => removeId(p.id)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}