import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ListChecks } from "lucide-react";

export default function ExportListsSidebar({ lists, selectedId, onSelect, onCreate, onDelete }) {
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} placeholder="Nazwa nowej listy" />
        <Button size="icon" onClick={create} className="bg-emerald-600 hover:bg-emerald-700 shrink-0"><Plus className="w-4 h-4" /></Button>
      </div>
      {lists.length === 0 && <p className="text-sm text-slate-400">Brak list eksportowych.</p>}
      <div className="space-y-1">
        {lists.map(l => (
          <div key={l.id} onClick={() => onSelect(l.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${selectedId === l.id ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-700"}`}>
            <ListChecks className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{l.name}</span>
            <span className="text-xs text-slate-400">{(l.product_ids || []).length}</span>
            <button onClick={e => { e.stopPropagation(); if (confirm(`Usunąć listę "${l.name}"?`)) onDelete(l.id); }}
              className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}