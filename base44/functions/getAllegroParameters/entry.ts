import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getAllegroToken(base44) {
  const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
  if (!connections || connections.length === 0) throw new Error("Brak połączenia z Allegro.");
  let conn = connections[0];
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && conn.refresh_token) {
    const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
    const clientSecret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const refreshRes = await fetch("https://allegro.pl/auth/oauth/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) throw new Error(`Token wygasł`);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { category_id } = body;

    const accessToken = await getAllegroToken(base44);

    if (category_id) {
      const res = await fetch(`https://api.allegro.pl/sale/categories/${category_id}/parameters`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      });
      const data = await res.json();
      const simplified = (data.parameters || []).map(p => ({
        id: p.id,
        name: p.name,
        required: p.required,
        type: p.type,
        values: p.dictionary?.map(d => ({ id: d.id, name: d.value })) || [],
      }));
      return Response.json({ parameters: simplified });
    } else {
      // List root categories
      const res = await fetch(`https://api.allegro.pl/sale/categories`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
        },
      });
      const data = await res.json();
      return Response.json({ categories: data.categories || data });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});