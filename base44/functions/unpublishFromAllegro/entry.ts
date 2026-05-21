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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await req.json();
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);

    const listings = await base44.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];
    if (!listing || !listing.allegro_listing_id) {
      return Response.json({ error: "Brak ID oferty Allegro" }, { status: 400 });
    }

    const endRes = await fetch(`https://api.allegro.pl/sale/offers/${listing.allegro_listing_id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
        "Content-Type": "application/vnd.allegro.public.v1+json",
      },
      body: JSON.stringify({ publication: { status: "ENDED" } }),
    });

    if (!endRes.ok) {
      const err = await endRes.json().catch(() => ({}));
      return Response.json({ error: `Błąd zakończenia oferty: ${JSON.stringify(err.errors || err)}` }, { status: 400 });
    }

    await base44.entities.Listing.update(listing.id, { listing_status: "draft" });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});