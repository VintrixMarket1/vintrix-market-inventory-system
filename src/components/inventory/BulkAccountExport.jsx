import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BulkAccountExport({ selectedIds, onDone }) {
  const [accounts, setAccounts] = useState([]);
  const [lists, setLists] = useState([]);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.ListingAccount.list({ sort: "name", limit: 200 }).then(p => setAccounts(p.items || []));
    base44.entities.ExportList.list({ sort: "-created_date", limit: 200 }).then(p => setLists(p.items || []));
  }, []);

  const setAccount = async (name) => {
    setBusy(true);
    const ids = [...selectedIds];
    await base44.entities.Product.bulkUpdate(ids.map(id => ({ id, listing_account: name })));
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Zaktualizowano", description: `Przypisano konto "${name}" do ${ids.length} produktów.` });
    setBusy(false);
    onDone();
  };

  const addToList = async (listId) => {
    setBusy(true);
    const list = lists.find(l => l.id === listId);
    const merged = [...new Set([...(list.product_ids || []), ...selectedIds])];
    await base44.entities.ExportList.update(listId, { product_ids: merged });
    queryClient.invalidateQueries({ queryKey: ["exportLists"] });
    toast({ title: "Dodano do listy", description: `Lista "${list.name}": ${merged.length} produktów.` });
    setBusy(false);
    onDone();
  };

  const trigger = "h-7 text-xs bg-slate-800 border-slate-600 text-slate-200 w-40";
  return (
    <>
      <div className="flex items-center gap-1.5">
        <UserCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <Select value="" onValueChange={setAccount} disabled={busy}>
          <SelectTrigger className={trigger}><SelectValue placeholder="Konto wystawienia" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {accounts.length === 0 && <div className="px-2 py-1.5 text-xs text-slate-400">Brak kont</div>}
            {accounts.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5">
        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <Select value="" onValueChange={addToList} disabled={busy}>
          <SelectTrigger className={trigger}><SelectValue placeholder="Do listy Allegro CSV" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {lists.length === 0 && <div className="px-2 py-1.5 text-xs text-slate-400">Brak list</div>}
            {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({(l.product_ids || []).length})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}