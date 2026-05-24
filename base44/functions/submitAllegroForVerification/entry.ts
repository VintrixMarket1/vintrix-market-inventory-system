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

    const { offer_id, listing_id, description } = await req.json();
    if (!offer_id) return Response.json({ error: "offer_id is required" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
      "Content-Type": "application/vnd.allegro.public.v1+json",
    };

    // Patch offer with updated description and set to ACTIVE (triggers re-verification)
    const patchPayload = {
      publication: { status: "ACTIVE" },
    };

    // If new description provided, update it
    if (description) {
      const cleanDesc = description.replace(/&(?!amp;|nbsp;|quot;|apos;|lt;|gt;|#\d+;)/g, "&amp;");
      patchPayload.description = {
        sections: [{ items: [{ type: "TEXT", content: cleanDesc }] }],
      };
      // Update listing in DB too
      if (listing_id) {
        await base44.entities.Listing.update(listing_id, { listing_description: description });
      }
    }

    const patchRes = await fetch(`https://api.allegro.pl/sale/product-offers/${offer_id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patchPayload),
    });
    const patchData = await patchRes.json().catch(() => ({}));
    console.log("Submit for verification:", patchRes.status, JSON.stringify(patchData).substring(0, 300));

    if (!patchRes.ok && patchRes.status !== 422) {
      const errParts = patchData.errors?.map(e => e.userMessage || e.message || e.code) || [];
      return Response.json({ error: `Błąd: ${errParts.join(" | ") || JSON.stringify(patchData)}` }, { status: 400 });
    }

    const errors = patchData.errors || [];
    if (errors.length > 0) {
      return Response.json({
        warning: true,
        message: `Wysłano do weryfikacji, ale są ostrzeżenia: ${errors.map(e => e.userMessage || e.message).join(", ")}`,
        errors,
      });
    }

    return Response.json({ success: true, message: "Oferta wysłana do ponownej weryfikacji." });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});