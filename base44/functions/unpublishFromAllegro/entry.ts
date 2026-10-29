import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getAllegroToken } from '../../shared/allegroAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id, offer_id } = await req.json();
    if (!listing_id && !offer_id) return Response.json({ error: "listing_id or offer_id is required" }, { status: 400 });
    if (offer_id && user.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 });

    let listing = null;
    let allegroId = offer_id;
    if (listing_id) {
      listing = (await base44.entities.Listing.filter({ id: listing_id }))[0];
      if (!listing || !listing.allegro_listing_id) {
        return Response.json({ error: "Brak ID oferty Allegro" }, { status: 400 });
      }
      allegroId = listing.allegro_listing_id;
    }

    const accessToken = await getAllegroToken(base44);
    const endRes = await fetch(`https://api.allegro.pl/sale/offer-publication-commands/${crypto.randomUUID()}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
        "Content-Type": "application/vnd.allegro.public.v1+json",
      },
      body: JSON.stringify({
        publication: { action: "END" },
        offerCriteria: [{ type: "CONTAINS_OFFERS", offers: [{ id: String(allegroId) }] }],
      }),
    });
    await new Promise((r) => setTimeout(r, 2000));

    if (!endRes.ok) {
      const err = await endRes.json().catch(() => ({}));
      return Response.json({ error: `Błąd zakończenia oferty: ${JSON.stringify(err.errors || err)}` }, { status: 400 });
    }

    if (listing) await base44.entities.Listing.update(listing.id, { listing_status: "draft" });

    const check = await fetch(`https://api.allegro.pl/sale/product-offers/${allegroId}`, {
      headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/vnd.allegro.public.v1+json" },
    });
    const data = check.ok ? await check.json() : {};
    return Response.json({ success: true, status: data.publication?.status || "ENDED" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});