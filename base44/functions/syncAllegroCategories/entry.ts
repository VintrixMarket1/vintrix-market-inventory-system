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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, tries = 8) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries - 1 || !/rate limit/i.test(e?.message || "")) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}

// UWAGA (środowisko funkcji): zapytania z opcjami ({ limit, sort... }) zwracają puste
// wyniki — wywołuj filter/deleteMany/updateMany BEZ obiektu opcji. Flaga kolejki to
// pole tekstowe `status` ("pending" | "done"); batchowanie robimy po stronie JS.
// SDK w funkcjach nie ma upsert/count — liście zapisujemy bulkCreate (dedupe w pamięci).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const accessToken = await getAllegroToken(base44);
    const body = await req.json().catch(() => ({}));

    // RESET: czyszczenie kolejki i dotychczasowego cache kategorii, wstawienie działów (root)
    if (body.action === "reset") {
      await withRetry(() => base44.entities.AllegroSyncState.deleteMany({ status: "pending" }));
      await withRetry(() => base44.entities.AllegroSyncState.deleteMany({ status: "done" }));
      const roots = await withRetry(() => fetchChildren(null, accessToken), 3);
      // Usuń stary cache kategorii (po działach — dokładne dopasowania)
      for (const c of roots) {
        await withRetry(() => base44.asServiceRole.entities.AllegroCategory.deleteMany({ dzial: c.name }));
      }
      await withRetry(() => base44.entities.AllegroSyncState.bulkCreate(
        roots.map(c => ({ node_id: c.id, full_path: c.name, status: "pending" }))
      ));
      return Response.json({ reset: true, dzials: roots.length });
    }

    // RUN: przetwarzaj oczekujące węzły do upływu limitu czasu, zapisuj liście do AllegroCategory
    const deadline = Date.now() + 110_000;
    const BATCH = 10;
    let processed = 0;
    let leavesSaved = 0;
    let done = false;
    const seenLeafIds = new Set();

    while (Date.now() < deadline) {
      const page = await withRetry(() => base44.entities.AllegroSyncState.filter({ status: "pending" }));
      const all = (page.items || page) || [];
      if (all.length === 0) { done = true; break; }
      const items = all.slice(0, BATCH);

      let childrenLists;
      try {
        childrenLists = await Promise.all(
          items.map(n => withRetry(() => fetchChildren(n.node_id, accessToken), 3))
        );
      } catch (e) {
        // Nie oznaczaj węzłów jako przetworzonych — kolejne wywołanie wznowi od tego miejsca
        if (/rate limit/i.test(e?.message || "")) {
          await sleep(5000);
          continue;
        }
        throw e;
      }

      const newPending = [];
      const leafRows = [];
      for (let i = 0; i < items.length; i++) {
        for (const c of childrenLists[i]) {
          const path = `${items[i].full_path} > ${c.name}`;
          if (c.leaf) {
            if (!seenLeafIds.has(c.id)) {
              seenLeafIds.add(c.id);
              leafRows.push({ dzial: items[i].full_path.split(" > ")[0], full_path: path, category_id: c.id });
            }
          } else {
            newPending.push({ node_id: c.id, full_path: path, status: "pending" });
          }
        }
      }
      if (newPending.length > 0) {
        await withRetry(() => base44.entities.AllegroSyncState.bulkCreate(newPending));
      }
      if (leafRows.length > 0) {
        for (let i = 0; i < leafRows.length; i += 500) {
          await withRetry(() => base44.asServiceRole.entities.AllegroCategory.bulkCreate(leafRows.slice(i, i + 500)));
          leavesSaved += leafRows.slice(i, i + 500).length;
        }
      }
      // Oznacz przetworzone węzły jako "done" (dokładne dopasowanie po node_id)
      // Jedno zbiorcze oznaczenie węzłów jako przetworzonych (mniej wywołań = mniej limitów)
      await withRetry(() => base44.entities.AllegroSyncState.bulkUpdate(
        items.map(n => ({ id: n.id, status: "done" }))
      ));
      processed += items.length;
    }

    const check = await base44.entities.AllegroSyncState.filter({ status: "pending" });
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