import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    if (!refreshRes.ok) throw new Error("Token wygasł. Połącz ponownie w ustawieniach.");
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
    const { phrase, category_id, language = "pl-PL" } = body;

    if (!phrase && !category_id) {
      return Response.json({ error: "phrase or category_id is required" }, { status: 400 });
    }

    const accessToken = await getAllegroToken(base44);
    
    // Build URL with query params
    const url = new URL("https://api.allegro.pl/sale/products");
    url.searchParams.set("language", language);
    url.searchParams.set("pageSize", "10");
    if (phrase) url.searchParams.set("phrase", phrase);
    if (category_id) url.searchParams.set("category.id", category_id);

    console.log("Searching Allegro products:", { phrase, category_id, url: url.toString() });

    const res = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });
    
    console.log("Allegro response status:", res.status);
    
    const data = await res.json();
    console.log("Allegro response data:", JSON.stringify(data, null, 2));
    
    if (!res.ok) {
      console.error("Allegro API error:", data);
      return Response.json({ error: JSON.stringify(data) }, { status: res.status });
    }

    const products = (data.products || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      images: p.images?.map(i => i.url) || [],
      parameters: p.parameters || [],
    }));

    return Response.json({ products });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});