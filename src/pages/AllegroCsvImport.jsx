import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import ExportListsSidebar from "@/components/export/ExportListsSidebar";
import ExportListDetail from "@/components/export/ExportListDetail";

export default function AllegroCsvImport() {
  const [lists, setLists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const page = await base44.entities.ExportList.list({ sort: "-created_date", limit: 200 });
    setLists(page.items || []);
  };

  useEffect(() => { load(); }, []);

  const create = async (name) => {
    const created = await base44.entities.ExportList.create({ name, product_ids: [] });
    await load();
    setSelectedId(created.id);
  };

  const remove = async (id) => {
    await base44.entities.ExportList.delete(id);
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const update = async (data) => {
    setLists(ls => ls.map(l => l.id === selectedId ? { ...l, ...data } : l));
    await base44.entities.ExportList.update(selectedId, data);
  };

  const selected = lists.find(l => l.id === selectedId);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Allegro — listy eksportowe CSV</h1>
        <p className="text-sm text-slate-500 mt-1">Twórz listy, dodawaj do nich wybrane produkty lub całe kategorie i generuj z nich plik CSV.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        <ExportListsSidebar lists={lists} selectedId={selectedId} onSelect={setSelectedId} onCreate={create} onDelete={remove} />
        {selected ? <ExportListDetail list={selected} onUpdate={update} /> : (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center text-sm text-slate-400">
            Wybierz lub utwórz listę eksportową.
          </div>
        )}
      </div>
    </div>
  );
}