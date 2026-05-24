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
    if (!refreshRes.ok) throw new Error(`Token wygasł: ${refreshData.error_description}`);
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

    const { offer_id } = await req.json();
    if (!offer_id) return Response.json({ error: "offer_id is required" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
    };

    // Fetch offer details
    const offerRes = await fetch(`https://api.allegro.pl/sale/product-offers/${offer_id}`, { headers });
    const offerData = await offerRes.json();

    if (!offerRes.ok) {
      return Response.json({ error: `Nie udało się pobrać oferty: ${JSON.stringify(offerData)}` }, { status: 400 });
    }

    // Fetch verification status (checks/errors)
    const verificationRes = await fetch(`https://api.allegro.pl/sale/offers/${offer_id}`, { headers });
    const verificationData = verificationRes.ok ? await verificationRes.json() : {};

    const publicationStatus = offerData.publication?.status || verificationData.publication?.status || "UNKNOWN";
    const errors = offerData.validation?.errors || verificationData.validation?.errors || [];
    const warnings = offerData.validation?.warnings || verificationData.validation?.warnings || [];

    return Response.json({
      offer_id,
      publication_status: publicationStatus,
      errors: errors.map(e => ({
        code: e.code,
        message: e.userMessage || e.message || e.code,
        path: e.path,
      })),
      warnings: warnings.map(w => ({
        code: w.code,
        message: w.userMessage || w.message || w.code,
        path: w.path,
      })),
      name: offerData.name,
      category: offerData.category?.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});