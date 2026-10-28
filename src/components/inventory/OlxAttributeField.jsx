import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OlxAttributeField({ field, value, onChange }) {
  const missing = field.required && !String(value || "").trim();
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {field.label}{field.required && <span className="text-destructive"> *</span>}
      </label>
      {field.values.length ? (
        <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
          <SelectTrigger className={`h-8 text-sm ${missing ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__none">— nie wybrano —</SelectItem>
            {field.values.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className={`h-8 text-sm ${missing ? "border-destructive" : ""}`}
          type={field.numeric ? "number" : "text"}
          maxLength={field.numeric ? undefined : field.max || undefined}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}