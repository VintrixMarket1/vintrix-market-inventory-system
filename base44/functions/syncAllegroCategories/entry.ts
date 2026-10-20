import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getAllegroToken } from '../../shared/allegroAuth.ts';

async function fetchChildren(parentId, accessToken) {
  const url = parentId
    ? `https://api.allegro.pl/sale/categories?parent.id=${parentId}`
    : "https://api.allegro.pl/sale/categories";
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
    },
  });
  if (!res.ok) throw new Error(`Allegro API ${res.status} przy pobieraniu kategorii`);
  const data = await res.json();
  return data.categories || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAllegroToken(base44);
    const body = await req.json().catch(() => ({}));

    // RESET: czyszczony jest stan synchronizacji, a działy (root) wstawiane jako oczekujące
    if (body.action === "reset") {
      await base44.entities.AllegroSyncState.deleteMany({ pending: true });
      const roots = await fetchChildren(null, accessToken);
      await base44.entities.AllegroSyncState.bulkCreate(
        roots.map(c => ({ node_id: c.id, full_path: c.name, pending: true }))
      );
      return Response.json({ reset: true, dzials: roots.length });
    }

    // RUN: przetwarzaj oczekujące węzły do upływu limitu czasu, zapisuj liście do AllegroCategory
    const deadline = Date.now() + 110_000;
    const BATCH = 10;
    let processed = 0;
    let leavesSaved = 0;
    let done = false;

    while (Date.now() < deadline) {
      const page = await base44.entities.AllegroSyncState.filter({ pending: true }, { limit: BATCH });
      const items = (page.items || page) || [];
      if (items.length === 0) { done = true; break; }

      const childrenLists = await Promise.all(
        items.map(n => fetchChildren(n.node_id, accessToken).catch(() => []))
      );

      const newPending = [];
      const leafRows = [];
      for (let i = 0; i < items.length; i++) {
        for (const c of childrenLists[i]) {
          const path = `${items[i].full_path} > ${c.name}`;
          if (c.leaf) {
            leafRows.push({ dzial: items[i].full_path.split(" > ")[0], full_path: path, category_id: c.id });
          } else {
            newPending.push({ node_id: c.id, full_path: path, pending: true });
          }
        }
      }
      if (newPending.length > 0) {
        await base44.entities.AllegroSyncState.bulkCreate(newPending);
      }
      if (leafRows.length > 0) {
        for (let i = 0; i < leafRows.length; i += 500) {
          await base44.asServiceRole.entities.AllegroCategory.upsert(
            leafRows.slice(i, i + 500), { key: "category_id" }
          );
          leavesSaved += leafRows.slice(i, i + 500).length;
        }
      }
      await base44.entities.AllegroSyncState.deleteMany({
        node_id: { $in: items.map(n => n.node_id) },
      });
      processed += items.length;
    }

    const check = await base44.entities.AllegroSyncState.filter({ pending: true }, { limit: 1 });
    const remaining = ((check.items || check) || []).length;
    return Response.json({
      done: remaining === 0,
      processed,
      leaves_saved: leavesSaved,
      remaining,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});