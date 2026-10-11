import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAllegroToken(base44) {
  const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
  if (!connections || connections.length === 0) throw new Error("Brak połączenia z Allegro.");
  let conn = connections[0];
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && conn.refresh_token) {
    const credentials = btoa(`${Deno.env.get("ALLEGRO_CLIENT_ID")}:${Deno.env.get("ALLEGRO_CLIENT_SECRET")}`);
    const refreshRes = await fetch("https://allegro.pl/auth/oauth/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) throw new Error(`Token wygasł: ${refreshData.error_description || "Połącz ponownie."}`);
    const updated = {
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
    };
    await base44.asServiceRole.entities.AllegroConnection.update(conn.id, updated);
    conn = { ...conn, ...updated };
  }
  return conn.access_token;
}

async function fetchRetry(url, headers, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(800 * (i + 1));
        continue;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      await sleep(800 * (i + 1));
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const mode = body.mode || "categories";
    const accessToken = await getAllegroToken(base44);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
    };

    if (mode === "categories") {
      // Pobierz CAŁE drzewo kategorii z paginacją (page.id = cursor)
      const all = [];
      let url = "https://api.allegro.pl/sale/categories";
      let pages = 0;
      while (true) {
        const data = await fetchRetry(url, headers);
        pages++;
        for (const c of data.categories || []) {
          all.push({
            id: String(c.id),
            name: c.name,
            parent_id: c.parent?.id ? String(c.parent.id) : null,
            leaf: !!c.leaf,
          });
        }
        if (!data.nextPage) break;
        url = `https://api.allegro.pl/sale/categories?page.id=${encodeURIComponent(data.nextPage)}`;
      }

      // Mapa parentów + pełne ścieżki
      const byId = new Map(all.map((c) => [c.id, c]));
      const pathCache = new Map();
      const buildPath = (id) => {
        if (pathCache.has(id)) return pathCache.get(id);
        const c = byId.get(id);
        if (!c) return id;
        const name = c.parent_id ? `${buildPath(c.parent_id)} > ${c.name}` : c.name;
        pathCache.set(id, name);
        return name;
      };

      // Końcowe podkategorie = kategorie bez dzieci (leaf=true wg API, weryfikacja po drzewie)
      const parentIds = new Set(all.map((c) => c.parent_id).filter(Boolean));
      const leaves = all.filter((c) => !parentIds.has(c.id));

      const result = leaves.map((c) => ({
        id: c.id,
        name: c.name,
        parent_id: c.parent_id,
        path: buildPath(c.id),
      }));

      return Response.json({
        total_categories: all.length,
        total_pages: pages,
        leaves: result,
      });
    }

    if (mode === "parameters") {
      const categoryIds = body.category_ids || [];
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return Response.json({ error: "Brak category_ids" }, { status: 400 });
      }

      const results = {};
      const failed = [];
      let index = 0;

      const worker = async () => {
        while (index < categoryIds.length) {
          const id = categoryIds[index++];
          try {
            const data = await fetchRetry(
              `https://api.allegro.pl/sale/categories/${id}/parameters`,
              headers
            );
            results[id] = (data.parameters || []).map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              required: p.required || false,
              displayed_name: p.displayed_name || null,
              unit: p.unit || null,
              multiple: p.multiple || false,
              ambiguous_value: p.ambiguousValue || false,
              options: p.options || null,
              restrictions: p.restrictions || null,
              dictionary: (p.dictionary || []).map((d) => ({
                id: String(d.id),
                value: d.value,
              })),
            }));
          } catch (e) {
            failed.push(id);
          }
        }
      };

      const CONCURRENCY = 10;
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      return Response.json({ results, failed });
    }

    return Response.json({ error: "Nieznany tryb" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});