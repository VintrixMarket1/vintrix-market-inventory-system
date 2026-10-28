import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getOlxToken, olxFetch } from "../../shared/olxAuth.ts";

// Zgierz, łódzkie
const ZGIERZ = { lat: 51.8555, lon: 19.4064 };
const SIZE_ORDER = ["S", "M", "L", "XL"];

function buildDescription(p) {
  let d = (p.listing_description || p.notes || p.product_name || "").replace(/<[^>]*>/g, "").trim();
  if (d.length < 80) d = `${d}\n\nStan: ${p.condition === "new" ? "nowy" : "używany"}.${p.brand ? `\nMarka: ${p.brand}.` : ""}${p.size ? `\nRozmiar: ${p.size}.` : ""}${p.color ? `\nKolor: ${p.color}.` : ""}\nZapraszam do zakupu, wysyłka Przesyłką OLX lub odbiór osobisty w Zgierzu.`;
  return d.slice(0, 9000);
}

// Pakiety wybranych przewoźników w danym gabarycie (lub najbliższym większym)
function pickPackages(shipping, size, carriers) {
  const want = SIZE_ORDER.indexOf(size);
  return shipping
    .filter((s) => !carriers?.length || carriers.includes(s.id))
    .map((s) => s.parcel_options.filter((o) => SIZE_ORDER.indexOf(o.label) >= want).sort((a, b) => SIZE_ORDER.indexOf(a.label) - SIZE_ORDER.indexOf(b.label))[0])
    .filter(Boolean)
    .map((o) => o.id);
}

function fillAttributes(defs, p, title) {
  const attributes = [];
  const missing = [];
  const text = `${title} ${p.listing_description || ""} ${p.brand || ""} ${p.color || ""} ${p.size || ""}`.toLowerCase();
  for (const a of defs) {
    if (a.code === "state") {
      if (a.values?.length) attributes.push({ code: "state", value: p.condition === "new" ? "new" : "used" });
      continue;
    }
    if (!a.validation?.required) continue;
    if (!a.values?.length) { missing.push(a.label || a.code); continue; }
    const match = a.values.find((v) => v.label && text.includes(v.label.toLowerCase()))
      || a.values.find((v) => /^(inne|inny|inna|pozostałe|other)/i.test(v.label || v.code));
    if (!match) { missing.push(a.label || a.code); continue; }
    attributes.push({ code: a.code, value: match.code });
  }
  return { attributes, missing };
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
    const [conn] = await base44.asServiceRole.entities.OlxConnection.list("-connected_at", 1);

    const [loc, del] = await Promise.all([
      olxFetch(token, `/locations?latitude=${ZGIERZ.lat}&longitude=${ZGIERZ.lon}`),
      olxFetch(token, `/delivery/settings`),
    ]);
    const l = loc.body?.data?.[0];
    if (!l?.city?.id) return Response.json({ error: "Nie udało się ustalić lokalizacji Zgierz w OLX", details: loc.body }, { status: 502 });
    const location = { city_id: l.city.id, ...(l.district?.id ? { district_id: l.district.id } : {}) };
    const deliveryCats = new Set(del.body?.data?.categories || []);
    const packageIds = pickPackages(del.body?.data?.shipping || [], conn?.package_size || "M", conn?.carriers);
    if (!packageIds.length) return Response.json({ error: "Brak dostępnych pakietów Przesyłki OLX dla wybranego gabarytu i przewoźników" }, { status: 400 });

    const products = await base44.entities.Product.filter({ id: { $in: product_ids } });
    const results = [];
    const fail = (p, error) => results.push({ id: p.id, name: p.product_name, ok: false, error });

    for (const p of products) {
      if (p.olx_listing_id) { fail(p, `Już wystawiony na OLX (ID ${p.olx_listing_id})`); continue; }
      if (p.status === "sold") { fail(p, "Produkt sprzedany"); continue; }
      const title = (p.listing_title || p.product_name || "").trim().slice(0, 70);
      if (title.length < 16) { fail(p, "Tytuł musi mieć min. 16 znaków"); continue; }
      if (!p.images?.length) { fail(p, "Brak zdjęć"); continue; }
      const price = Number(p.suggested_sale_price);
      if (!price || price < 1) { fail(p, "Brak ceny (min. 1 zł)"); continue; }

      const sug = await olxFetch(token, `/categories/suggestion?q=${encodeURIComponent(title)}`);
      const cats = sug.body?.data || [];
      const category = cats.find((c) => deliveryCats.has(Number(c.id))) || cats[0];
      if (!category) { fail(p, "Brak sugerowanej kategorii OLX"); continue; }
      if (!deliveryCats.has(Number(category.id))) { fail(p, `Kategoria OLX ${category.id} nie obsługuje Przesyłki OLX`); continue; }

      const attrsRes = await olxFetch(token, `/categories/${category.id}/attributes`);
      const { attributes, missing } = fillAttributes(attrsRes.body?.data || [], p, title);
      if (missing.length) { fail(p, `Nie można dopasować wymaganych pól OLX: ${missing.join(", ")}`); continue; }

      const payload = {
        title,
        description: buildDescription(p),
        category_id: Number(category.id),
        advertiser_type: "business",
        contact: { name: "Patryk", phone: "788901237" },
        location,
        images: p.images.slice(0, 8).map((url) => ({ url })),
        price: { value: price, currency: "PLN", negotiable: false, trade: false },
        attributes,
        external_id: p.internal_code || p.id,
        ad_delivery: { delivery_package_ids: packageIds },
      };
      const res = await olxFetch(token, `/adverts`, { method: "POST", body: JSON.stringify(payload) });
      const advertId = res.body?.data?.id;
      if (!res.ok || !advertId) {
        const err = res.body?.error;
        fail(p, err?.validation?.map((v) => `${v.field}: ${v.title || v.detail}`).join("; ") || err?.detail || err?.title || `HTTP ${res.status}`);
        continue;
      }
      await base44.entities.Product.update(p.id, { olx_listing_id: String(advertId), status: "listed" });
      const check = await olxFetch(token, `/adverts/${advertId}`);
      const deliveryOk = (check.body?.data?.ad_delivery?.delivery_package_ids || []).length > 0;
      results.push({ id: p.id, name: p.product_name, ok: true, olx_id: advertId, url: check.body?.data?.url, delivery_ok: deliveryOk });
    }
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}