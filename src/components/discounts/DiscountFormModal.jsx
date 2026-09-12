import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";

export default function DiscountFormModal({ code, onClose, onSaved }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [form, setForm] = useState(code ? {
    code: code.code || "",
    discount_type: code.discount_type || "percent",
    value: code.value ?? "",
    expires_at: code.expires_at || "",
    max_uses: code.max_uses ?? "",
    min_order_value: code.min_order_value ?? "",
    is_active: code.is_active !== false,
  } : {
    code: "",
    discount_type: "percent",
    value: "",
    expires_at: "",
    max_uses: "",
    min_order_value: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const valueNum = parseFloat(form.value);
    if (!form.code.trim()) { setError(t("dc_code_required")); return; }
    if (!valueNum || valueNum <= 0) { setError(t("dc_value_required")); return; }
    if (form.discount_type === "percent" && valueNum > 100) { setError(t("dc_percent_max")); return; }
    setSaving(true);
    setError("");
    const data = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      value: valueNum,
      expires_at: form.expires_at || null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
      is_active: !!form.is_active,
    };
    if (code) {
      await base44.entities.DiscountCode.update(code.id, data);
      toast({ title: t("dc_updated") });
    } else {
      await base44.entities.DiscountCode.create({ ...data, used_count: 0 });
      toast({ title: t("dc_created") });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{code ? t("dc_edit_code") : t("dc_new_code")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t("dc_code")} *</Label>
            <Input
              value={form.code}
              onChange={e => handleChange("code", e.target.value.toUpperCase())}
              className="font-mono uppercase"
              placeholder="VINTRIX10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("dc_type")}</Label>
              <select
                value={form.discount_type}
                onChange={e => handleChange("discount_type", e.target.value)}
                className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="percent">{t("dc_percent")}</option>
                <option value="amount">{t("dc_amount")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dc_value")} *</Label>
              <Input
                type="number"
                value={form.value}
                onChange={e => handleChange("value", e.target.value)}
                placeholder={form.discount_type === "percent" ? "10" : "20"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("dc_expires")}</Label>
              <Input type="date" value={form.expires_at || ""} onChange={e => handleChange("expires_at", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dc_max_uses")}</Label>
              <Input type="number" value={form.max_uses || ""} onChange={e => handleChange("max_uses", e.target.value)} placeholder={t("dc_unlimited")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("dc_min_order")}</Label>
            <Input type="number" value={form.min_order_value || ""} onChange={e => handleChange("min_order_value", e.target.value)} placeholder="0.00" />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={e => handleChange("is_active", e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            <span className="text-sm font-medium text-slate-700">{t("dc_active")}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{t("common_close")}</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("common_save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}