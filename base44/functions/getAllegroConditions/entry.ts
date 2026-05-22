import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { category_id } = await req.json();
    if (!category_id) return Response.json({ error: "category_id is required" }, { status: 400 });

    const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
    if (!connections || connections.length === 0) {
      return Response.json({ error: "Brak połączenia z Allegro" }, { status: 400 });
    }

    let conn = connections[0];
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
    const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
    
    if (needsRefresh && conn.refresh_token) {
      const credentials = btoa(`${Deno.env.get("ALLEGRO_CLIENT_ID")}:${Deno.env.get("ALLEGRO_CLIENT_SECRET")}`);
      const refreshRes = await fetch("https://allegro.pl/auth/oauth/token", {
        method: "POST",
        headers: { 
          "Authorization": `Basic ${credentials}`, 
          "Content-Type": "application/x-www-form-urlencoded" 
        },
        body: new URLSearchParams({ 
          grant_type: "refresh_token", 
          refresh_token: conn.refresh_token 
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) {
        return Response.json({ error: "Token wygasł" }, { status: 400 });
      }
      const updated = {
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      };
      await base44.asServiceRole.entities.AllegroConnection.update(conn.id, updated);
      conn = { ...conn, ...updated };
    }

    const accessToken = conn.access_token;

    // Fetch category parameters to get "Stan" (condition)
    const paramRes = await fetch(`https://api.allegro.pl/sale/categories/${category_id}/parameters`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });

    if (!paramRes.ok) {
      const errorData = await paramRes.json().catch(() => ({}));
      return Response.json({ error: `Błąd pobierania parametrów: ${errorData.message || paramRes.status}` }, { status: 400 });
    }

    const paramData = await paramRes.json();
    const conditionParam = (paramData.parameters || []).find(p => p.id === "11323");

    if (!conditionParam) {
      return Response.json({ conditions: [] });
    }

    const conditions = conditionParam.dictionary.map(item => ({
      id: item.id,
      name: item.name,
    }));

    return Response.json({ conditions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});