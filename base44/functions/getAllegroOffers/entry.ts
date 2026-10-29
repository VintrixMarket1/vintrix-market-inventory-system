import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getAllegroToken } from '../../shared/allegroAuth.ts';

// Pobiera oferty z asortymentu użytkownika na Allegro (GET /sale/offers)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name = "", publication_status = "", limit = 100, offset = 0 } = body;

    const accessToken = await getAllegroToken(base44);
    const url = new URL("https://api.allegro.pl/sale/offers");
    url.searchParams.set("limit", String(Math.min(limit, 100)));
    url.searchParams.set("offset", String(Math.max(offset, 0)));
    if (name) url.searchParams.set("name", name);
    if (publication_status) url.searchParams.set("publication.status", publication_status);

    const res = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: `Błąd Allegro: ${JSON.stringify(err)}` }, { status: res.status });
    }

    const data = await res.json();
    const offers = (data.offers || []).map(o => ({
      id: o.id,
      name: o.name || "",
      signature: o.external?.id || "",
      category_id: o.category?.id || null,
      status: o.publication?.status || "UNKNOWN",
      price: parseFloat(o.sellingMode?.price?.amount || "0"),
      currency: o.sellingMode?.price?.currency || "PLN",
      stock: o.stock?.available ?? null,
      image: o.primaryImage?.url || null,
      created_at: o.publication?.startedAt || null,
    }));

    return Response.json({ offers, count: offers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});