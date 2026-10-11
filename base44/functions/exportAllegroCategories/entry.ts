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

async function fetchRetry(url, headers, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        // Szanuj limity API — dłuższe wycofanie przy 429
        await sleep(res.status === 429 ? 1500 * (i + 1) : 800 * (i + 1));
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
    const mode = body.mode || "children";
    const accessToken = await getAllegroToken(base44);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
    };

    // Tryb "children": kategorie główne (bez parent_id) lub podkategorie danej kategorii
    if (mode === "children") {
      const parentId = body.parent_id;
      const url = parentId
        ? `https://api.allegro.pl/sale/categories?parent.id=${encodeURIComponent(parentId)}`
        : `https://api.allegro.pl/sale/categories`;
      const data = await fetchRetry(url, headers);
      const categories = (data.categories || []).map((c) => ({
        id: String(c.id),
        name: c.name,
        parent_id: c.parent?.id ? String(c.parent.id) : null,
        leaf: !!c.leaf,
      }));
      return Response.json({ categories, total: categories.length });
    }

    // Tryb "parameters": parametry dla partii kategorii końcowych
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
            // Minimalne dane parametrów — bez słowników marek i innych zbędnych wartości
            results[id] = (data.parameters || []).map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              required: p.required || false,
              requiredForProduct: p.requiredForProduct || false,
              requiredIf: p.requiredIf || null,
              is_ean_gtin: /ean|gtin/i.test(p.name || ""),
            }));
          } catch (e) {
            failed.push({ id, error: e?.message || String(e) });
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