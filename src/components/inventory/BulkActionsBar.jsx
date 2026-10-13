import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { X, CheckSquare, Tag, TrendingUp, Trash2, Loader2, ShoppingBag, Package, ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLang } from "@/lib/i18n";

export default function BulkActionsBar({ selectedIds, allProducts, pallets = [], onClear, onListSelected, onShopifyPublish, onAddToSet }) {
  const [loading, setLoading] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();
  const count = selectedIds.size;

  const bulkSetStatus = async (status) => {
    setLoading(true);
    const ids = [...selectedIds];
    for (const id of ids) {
      await base44.entities.Product.update(id, { status });
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: t("bulk_updated"), description: t("bulk_status_changed")(ids.length) });
    setLoading(false);
    onClear();
  };

  const bulkAssignPallet = async () => {
    if (!selectedPallet) return;
    setLoading(true);
    const ids = [...selectedIds];
    for (const id of ids) {
      await base44.entities.Product.update(id, { pallet_id: selectedPallet });
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    const pallet = pallets.find(p => p.id === selectedPallet);
    toast({ title: t("bulk_updated"), description: t("bulk_assigned_pallet")(ids.length, pallet?.pallet_code || "") });
    setSelectedPallet("");
    setLoading(false);
    onClear();
  };

  const bulkDelete = async () => {
    if (!confirm(t("bulk_delete_confirm")(count))) return;
    setLoading(true);
    for (const id of [...selectedIds]) {
      await base44.entities.Product.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: t("bulk_deleted"), description: t("bulk_deleted_count")(count) });
    setLoading(false);
    onClear();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckSquare className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-400">{count}</span> {t("bulk_selected")}
      </div>

      <div className="w-px h-5 bg-slate-600" />

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Tag className="w-3.5 h-3.5" />
        {t("bulk_change_status")}
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white bg-transparent" onClick={() => bulkSetStatus("in_stock")} disabled={loading}>
          {t("status_in_stock")}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white bg-transparent" onClick={() => bulkSetStatus("listed")} disabled={loading}>
          {t("status_listed")}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-600 text-emerald-400 hover:bg-emerald-900 hover:text-white bg-transparent" onClick={() => bulkSetStatus("sold")} disabled={loading}>
          {t("status_sold")}
        </Button>
      </div>

      <div className="w-px h-5 bg-slate-600" />

      {pallets.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Select value={selectedPallet} onValueChange={setSelectedPallet} disabled={loading}>
            <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 w-36">
              <SelectValue placeholder={t("bulk_assign_pallet")} />
            </SelectTrigger>
            <SelectContent>
              {pallets.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.pallet_code} — {p.investor_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={bulkAssignPallet} disabled={loading || !selectedPallet}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
          </Button>
        </div>
      )}

      <div className="w-px h-5 bg-slate-600" />

      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => onListSelected([...selectedIds])} disabled={loading}>
        <TrendingUp className="w-3.5 h-3.5" />
        {t("bulk_list_selected")}
      </Button>

      <Button size="sm" className="h-7 text-xs bg-slate-700 hover:bg-slate-600 text-white gap-1 border border-slate-600" onClick={() => onShopifyPublish?.([...selectedIds])} disabled={loading}>
        <ShoppingBag className="w-3.5 h-3.5" />
        Shopify
      </Button>

      <Button size="sm" className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1" onClick={() => onAddToSet?.([...selectedIds])} disabled={loading}>
        <ClipboardList className="w-3.5 h-3.5" />
        Inwentaryzacja
      </Button>

      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-slate-800" onClick={bulkDelete} disabled={loading}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </Button>

      <div className="w-px h-5 bg-slate-600" />

      <button onClick={onClear} className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}