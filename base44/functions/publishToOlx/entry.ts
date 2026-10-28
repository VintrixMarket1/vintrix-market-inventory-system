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

function pickPackages(shipping, size, carriers) {
  const want = SIZE_ORDER.indexOf(size);
  return shipping
    .filter((s) => !carriers?.length || carriers.includes(s.id))
    .map((s) => s.parcel_options.filter((o) => SIZE_ORDER.indexOf(o.label) >= want).sort((a, b) => SIZE_ORDER.indexOf(a.label) - SIZE_ORDER.indexOf(b.label))[0])
    .filter(Boolean)
    .map((o) => o.id);
}

const titleOf = (p) => (p.listing_title || p.product_name || "").trim().slice(0, 70);

// Pola kategorii OLX do pokazania w formularzu (bez stanu i dostawy, które ustawiamy automatycznie)
const editableDefs = (defs) => defs.filter((a) => a.code !== "state" && a.validation?.type !== "package");

// Automatyczna propozycja wartości dla pól z listą opcji
function autoValue(a, p, title) {
  if (!a.values?.length) return "";
  const text = `${title} ${p.listing_description || ""}`.toLowerCase();
  const m = a.values.find((v) => v.label && text.includes(v.label.toLowerCase()))
    || (a.validation?.required ? a.values.find((v) => /^(inne|inny|inna|pozostałe|other)/i.test(v.label || v.code)) : null);
  return m?.code || "";
}

// Buduje atrybuty z wartości od użytkownika; zwraca listę braków/błędów
function buildAttributes(defs, p, values) {
  const attributes = [];
  const errors = [];
  const stateDef = defs.find((a) => a.code === "state");
  if (stateDef?.values?.length) attributes.push({ code: "state", value: p.condition === "new" ? "new" : "used" });
  for (const a of editableDefs(defs)) {
    const v = String(values[a.code] ?? "").trim();
    if (!v) { if (a.validation?.required) errors.push(`brak: ${a.label}`); continue; }
    if (a.values?.length && !a.values.some((o) => o.code === v)) { errors.push(`nieobsługiwana wartość: ${a.label}`); continue; }
    if (a.validation?.numeric && isNaN(Number(v))) { errors.push(`${a.label} musi być liczbą`); continue; }
    if (a.validation?.max && !a.validation?.numeric && v.length > a.validation.max) { errors.push(`${a.label}: max ${a.validation.max} znaków`); continue; }
    attributes.push({ code: a.code, value: v });
  }
  return { attributes, errors };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const { product_ids, mode, overrides = {} } = await req.json().catch(() => ({}));
    if (!Array.isArray(product_ids) || !product_ids.length) return Response.json({ error: "product_ids required" }, { status: 400 });

    const token = await getOlxToken(base44);
    if (!token) return Response.json({ error: "not_connected" }, { status: 409 });

    const del = await olxFetch(token, `/delivery/settings`);
    const deliveryCats = new Set(del.body?.data?.categories || []);
    const products = await base44.entities.Product.filter({ id: { $in: product_ids } });
    const results = [];
    const fail = (p, error) => results.push({ id: p.id, name: p.product_name, ok: false, error });

    const precheck = (p) => {
      if (p.olx_listing_id) return `Już wystawiony na OLX (ID ${p.olx_listing_id})`;
      if (p.status === "sold") return "Produkt sprzedany";
      if (titleOf(p).length < 16) return "Tytuł musi mieć min. 16 znaków";
      if (!p.images?.length) return "Brak zdjęć";
      if (!(Number(p.suggested_sale_price) >= 1)) return "Brak ceny (min. 1 zł)";
      return null;
    };

    // Tryb przygotowania: kategoria + pola do uzupełnienia
    if (mode === "prepare") {
      for (const p of products) {
        const err = precheck(p);
        if (err) { fail(p, err); continue; }
        const sug = await olxFetch(token, `/categories/suggestion?q=${encodeURIComponent(titleOf(p))}`);
        const cats = sug.body?.data || [];
        const category = cats.find((c) => deliveryCats.has(Number(c.id))) || cats[0];
        if (!category) { fail(p, "Brak sugerowanej kategorii OLX"); continue; }
        if (!deliveryCats.has(Number(category.id))) { fail(p, `Kategoria OLX ${category.name} nie obsługuje Przesyłki OLX`); continue; }
        const defs = (await olxFetch(token, `/categories/${category.id}/attributes`)).body?.data || [];
        results.push({
          id: p.id, name: p.product_name, ok: true,
          category_id: Number(category.id),
          category_path: [...(category.path || []).map((x) => x.name), category.name].join(" > "),
          fields: editableDefs(defs).map((a) => ({
            code: a.code, label: a.label, required: !!a.validation?.required, numeric: !!a.validation?.numeric,
            max: a.validation?.max ?? null, values: a.values || [], value: autoValue(a, p, titleOf(p)),
          })),
        });
      }
      return Response.json({ results });
    }

    const [conn] = await base44.asServiceRole.entities.OlxConnection.list("-connected_at", 1);
    const loc = await olxFetch(token, `/locations?latitude=${ZGIERZ.lat}&longitude=${ZGIERZ.lon}`);
    const l = loc.body?.data?.[0];
    if (!l?.city?.id) return Response.json({ error: "Nie udało się ustalić lokalizacji Zgierz w OLX", details: loc.body }, { status: 502 });
    const location = { city_id: l.city.id, ...(l.district?.id ? { district_id: l.district.id } : {}) };
    const packageIds = pickPackages(del.body?.data?.shipping || [], conn?.package_size || "M", conn?.carriers);
    if (!packageIds.length) return Response.json({ error: "Brak dostępnych pakietów Przesyłki OLX dla wybranego gabarytu i przewoźników" }, { status: 400 });

    for (const p of products) {
      const err = precheck(p);
      if (err) { fail(p, err); continue; }
      const ov = overrides[p.id];
      if (!ov?.category_id) { fail(p, "Brak danych z formularza OLX"); continue; }
      if (!deliveryCats.has(Number(ov.category_id))) { fail(p, "Kategoria nie obsługuje Przesyłki OLX"); continue; }
      const defs = (await olxFetch(token, `/categories/${ov.category_id}/attributes`)).body?.data || [];
      const { attributes, errors } = buildAttributes(defs, p, ov.attributes || {});
      if (errors.length) { fail(p, errors.join(", ")); continue; }

      const payload = {
        title: titleOf(p),
        description: buildDescription(p),
        category_id: Number(ov.category_id),
        advertiser_type: "business",
        contact: { name: "Patryk", phone: "788901237" },
        location,
        images: p.images.slice(0, 8).map((url) => ({ url })),
        price: { value: Number(p.suggested_sale_price), currency: "PLN", negotiable: false, trade: false },
        attributes,
        external_id: p.internal_code || p.id,
        ad_delivery: { delivery_package_ids: packageIds },
      };
      const res = await olxFetch(token, `/adverts`, { method: "POST", body: JSON.stringify(payload) });
      const advertId = res.body?.data?.id;
      if (!res.ok || !advertId) {
        const e = res.body?.error;
        fail(p, e?.validation?.map((v) => `${v.field}: ${v.title || v.detail}`).join("; ") || e?.detail || e?.title || `HTTP ${res.status}`);
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