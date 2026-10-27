import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";

export default function ListingAccountInput({ value, onChange }) {
  const [accounts, setAccounts] = useState([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    const page = await base44.entities.ListingAccount.list({ sort: "name", limit: 200 });
    setAccounts(page.items || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    await base44.entities.ListingAccount.create({ name });
    setNewName("");
    onChange(name);
    load();
  };

  const saveEdit = async (acc) => {
    const name = editName.trim();
    if (!name) return;
    await base44.entities.ListingAccount.update(acc.id, { name });
    if (value === acc.name) onChange(name);
    setEditId(null);
    load();
  };

  const remove = async (acc) => {
    if (!confirm(`Usunąć konto "${acc.name}"?`)) return;
    await base44.entities.ListingAccount.delete(acc.id);
    if (value === acc.name) onChange("");
    load();
  };

  return (
    <div className="space-y-1.5">
      <Label>Konto wystawienia {value && <span className="text-emerald-600 font-normal">— {value}</span>}</Label>
      <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
        {accounts.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Brak kont — dodaj pierwsze poniżej.</p>}
        {accounts.map(acc => editId === acc.id ? (
          <div key={acc.id} className="flex items-center gap-1 px-2 py-1">
            <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit(acc)} className="h-7 text-sm" autoFocus />
            <button type="button" onClick={() => saveEdit(acc)} className="p-1 text-emerald-600"><Check className="w-4 h-4" /></button>
            <button type="button" onClick={() => setEditId(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div key={acc.id} onClick={() => onChange(value === acc.name ? "" : acc.name)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${value === acc.name ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50"}`}>
            <span className="flex-1 truncate">{acc.name}</span>
            {value === acc.name && <Check className="w-4 h-4 text-emerald-600" />}
            <button type="button" onClick={e => { e.stopPropagation(); setEditId(acc.id); setEditName(acc.name); }} className="p-1 text-slate-300 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={e => { e.stopPropagation(); remove(acc); }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Nowe konto..." className="h-8 text-sm" />
        <Button type="button" size="sm" onClick={add} className="h-8 bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}