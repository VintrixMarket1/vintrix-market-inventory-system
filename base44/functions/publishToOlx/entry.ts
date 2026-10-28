import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getOlxToken, olxFetch } from "../../shared/olxAuth.ts";

// Zgierz, łódzkie
const ZGIERZ = { lat: 51.8555, lon: 19.4064 };

function buildDescription(p) {
  let d = (p.listing_description || p.notes || p.product_name || "").replace(/<[^>]*>/g, "").trim();
  if (d.length < 80) d = `${d}\n\nStan: ${p.condition === "new" ? "nowy" : "używany"}.${p.brand ? `\nMarka: ${p.brand}.` : ""}${p.size ? `\nRozmiar: ${p.size}.` : ""}${p.color ? `\nKolor: ${p.color}.` : ""}\nZapraszam do zakupu, wysyłka lub odbiór osobisty w Zgierzu.`;
  return d.slice(0, 9000);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const { product_ids } = await req.json().catch(() => ({}));
    if (!Array.isArray(product_ids) || !product_ids.length) return Response.json({ error: "product_ids required" }, { status: 400 });

    const token = await getOlxToken(base44);
    if (!token) return Response.json({ error: "not_connected" }, { status: 409 });

    const loc = await olxFetch(token, `/locations?latitude=${ZGIERZ.lat}&longitude=${ZGIERZ.lon}`);
    const l = loc.body?.data?.[0];
    if (!l?.city?.id) return Response.json({ error: "Nie udało się ustalić lokalizacji Zgierz w OLX", details: loc.body }, { status: 502 });
    const location = { city_id: l.city.id, ...(l.district?.id ? { district_id: l.district.id } : {}) };

    const products = await base44.entities.Product.filter({ id: { $in: product_ids } });
    const results = [];
    for (const p of products) {
      const title = (p.listing_title || p.product_name || "").slice(0, 70).padEnd(16, " ").trim();
      const sug = await olxFetch(token, `/categories/suggestion?q=${encodeURIComponent(title)}`);
      const categoryId = sug.body?.data?.[0]?.id;
      if (!categoryId) { results.push({ id: p.id, name: p.product_name, ok: false, error: "Brak sugerowanej kategorii OLX" }); continue; }

      const attrsRes = await olxFetch(token, `/categories/${categoryId}/attributes`);
      const attributes = [];
      const state = (attrsRes.body?.data || []).find((a) => a.code === "state");
      if (state) attributes.push({ code: "state", value: p.condition === "new" ? "new" : "used" });

      const payload = {
        title,
        description: buildDescription(p),
        category_id: categoryId,
        advertiser_type: "business",
        contact: { name: "Vintrix" },
        location,
        images: (p.images || []).slice(0, 8).map((url) => ({ url })),
        price: { value: p.suggested_sale_price || 1, currency: "PLN", negotiable: false, trade: false },
        attributes,
        external_id: p.internal_code || p.id,
      };
      const res = await olxFetch(token, `/adverts`, { method: "POST", body: JSON.stringify(payload) });
      if (res.ok && res.body?.data?.id) {
        await base44.entities.Product.update(p.id, { olx_listing_id: String(res.body.data.id), status: "listed" });
        results.push({ id: p.id, name: p.product_name, ok: true, olx_id: res.body.data.id });
      } else {
        const err = res.body?.error;
        const msg = err?.validation?.map((v) => `${v.field}: ${v.title || v.detail}`).join("; ") || err?.detail || err?.title || `HTTP ${res.status}`;
        results.push({ id: p.id, name: p.product_name, ok: false, error: msg });
      }
    }
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}