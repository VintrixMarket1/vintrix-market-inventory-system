import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Power, Percent } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import DiscountFormModal from "@/components/discounts/DiscountFormModal";

export default function Discounts() {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // "new" | rekord | null

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discount_codes"],
    queryFn: () => base44.entities.DiscountCode.list("-created_date"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["discount_codes"] });

  const toggleActive = async (c) => {
    await base44.entities.DiscountCode.update(c.id, { is_active: !c.is_active });
    invalidate();
  };

  const remove = async (c) => {
    if (!window.confirm(t("dc_delete_confirm"))) return;
    await base44.entities.DiscountCode.delete(c.id);
    toast({ title: t("dc_deleted") });
    invalidate();
  };

  const today = new Date().toISOString().split("T")[0];
  const isExpired = (c) => !!c.expires_at && c.expires_at < today;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("dc_title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("dc_subtitle")}</p>
        </div>
        <Button onClick={() => setEditing("new")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> {t("dc_add")}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16">
            <Percent className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{t("dc_no_codes")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                  <th className="text-left px-4 py-3 font-medium">{t("dc_code")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dc_value")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dc_usage")}</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">{t("dc_min_order")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dc_expires")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("dc_status")}</th>
                  <th className="text-right px-4 py-3 font-medium">{t("dc_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => {
                  const expired = isExpired(c);
                  return (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.code}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.discount_type === "percent" ? `${c.value}%` : `${c.value} PLN`}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.used_count || 0} {t("dc_of")} {c.max_uses ?? t("dc_unlimited")}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {c.min_order_value ? `${c.min_order_value} PLN` : "—"}
                      </td>
                      <td className={`px-4 py-3 ${expired ? "text-red-600 font-medium" : "text-slate-500"}`}>
                        {expired ? t("dc_expired") : (c.expires_at || "—")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.is_active && !expired ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {c.is_active && !expired ? t("dc_active") : t("dc_inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(c)} title={t("dc_active")}>
                            <Power className={`w-4 h-4 ${c.is_active ? "text-emerald-600" : "text-slate-400"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                            <Pencil className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(c)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <DiscountFormModal
          code={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { invalidate(); setEditing(null); }}
        />
      )}
    </div>
  );
}