import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getAllegroToken } from '../../shared/allegroAuth.ts';

const SHIPPING_RATES = {
  small: "6e05d239-b12a-4941-ab01-5b59fa69256a",
  large: "d9dc3989-31ae-4bfa-ae2f-e3076521375b",
};
const RETURN_POLICY_ID = "5339f3cf-6e5e-4903-87f4-922892772c40";
const IMPLIED_WARRANTY_ID = "5e43a3fd-2f9e-4ff9-9b66-65392a75e916";

async function uploadImageToAllegro(imageUrl, accessToken) {
  const fetchRes = await fetch(imageUrl);
  if (!fetchRes.ok) throw new Error(`Nie udało się pobrać zdjęcia: ${imageUrl}`);
  const blob = await fetchRes.blob();
  const uploadRes = await fetch("https://upload.allegro.pl/sale/images", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
      "Content-Type": blob.type || "image/jpeg",
    },
    body: blob,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Błąd uploadu zdjęcia: ${JSON.stringify(uploadData)}`);
  return uploadData.location;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { category_id, rows, publish_active, shipping_rate_id } = body;
    if (!category_id || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: "category_id i rows są wymagane" }, { status: 400 });
    }

    const accessToken = await getAllegroToken(base44);
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
      "Content-Type": "application/vnd.allegro.public.v1+json",
    };

    // Parametry kategorii — pobieramy raz i mapujemy wartości z CSV
    const paramRes = await fetch(`https://api.allegro.pl/sale/categories/${category_id}/parameters`, { headers });
    const paramData = await paramRes.json();
    const paramDefs = new Map((paramData.parameters || []).map(p => [p.id, p]));

    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Zdjęcia (min. 1 wymagana przez Allegro)
        const images = [];
        for (const url of (row.images || []).slice(0, 8)) {
          try { images.push(await uploadImageToAllegro(url, accessToken)); } catch { /* pomiń uszkodzone */ }
        }
        if (images.length === 0) throw new Error("Brak zdjęć — Allegro wymaga minimum 1 zdjęcia");

        const descriptionText = (row.description || `<p>${row.name}</p>`)
          .replace(/&(?!amp;|nbsp;|quot;|apos;|lt;|gt;|#\d+;)/g, "&amp;");
        const sections = [{ items: [{ type: "TEXT", content: descriptionText }] }];
        images.forEach(u => sections.push({ items: [{ type: "IMAGE", url: u }] }));

        // Parametry: stan (11323) i pozostałe z nagłówków param|<id>|
        const parameters = [];
        const rowParams = row.parameters || {};
        for (const [paramId, rawValue] of Object.entries(rowParams)) {
          const def = paramDefs.get(paramId);
          if (!def) continue;
          const val = String(rawValue ?? "").trim();
          if (!val) continue;
          if (def.dictionary?.length) {
            const norm = val.toLowerCase();
            const m = def.dictionary.find(d => (d.value || "").toLowerCase() === norm)
              || def.dictionary.find(d => (d.value || "").toLowerCase().includes(norm));
            if (m) parameters.push({ id: def.id, valuesIds: [m.id] });
            else throw new Error(`Nieprawidłowa wartość "${val}" dla parametru "${def.name}"`);
            continue;
          }
          if (def.type === "float" || def.type === "integer") {
            const num = parseFloat(val.replace(",", "."));
            if (isNaN(num)) throw new Error(`Parametr "${def.name}" musi być liczbą`);
            parameters.push({ id: def.id, values: [{ value: String(num) }] });
          } else {
            parameters.push({ id: def.id, values: [{ value: val }] });
          }
        }

        const priceNum = parseFloat(String(row.price || "").replace(",", "."));
        if (isNaN(priceNum) || priceNum <= 0) throw new Error("Nieprawidłowa cena w kolumnie 'cena'");

        const offerPayload = {
          name: String(row.name || "").substring(0, 200),
          category: { id: category_id },
          images,
          description: { sections },
          sellingMode: { format: "BUY_NOW", price: { amount: priceNum.toFixed(2), currency: "PLN" } },
          stock: { available: parseInt(row.quantity) || 1, unit: "UNIT" },
          payments: { invoice: "VAT" },
          delivery: { handlingTime: "PT24H", shippingRates: { id: shipping_rate_id || SHIPPING_RATES.small } },
          location: { countryCode: "PL", province: "LODZKIE", city: "Zgierz", postCode: "95-100" },
          afterSalesServices: { impliedWarranty: { id: IMPLIED_WARRANTY_ID }, returnPolicy: { id: RETURN_POLICY_ID } },
          publication: { status: publish_active === false ? "INACTIVE" : "ACTIVE" },
          safetyInformation: { role: "ROLE_FULFILLED_BY_MARKETPLACE" },
        };
        if (row.ean) offerPayload.ean = [String(row.ean).trim()];
        if (parameters.length > 0) offerPayload.parameters = parameters;

        const createRes = await fetch("https://api.allegro.pl/sale/product-offers", {
          method: "POST", headers, body: JSON.stringify(offerPayload),
        });
        const createData = await createRes.json().catch(() => ({}));
        const errs = (createData.errors || []).map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);

        if (!createRes.ok && createRes.status !== 422) {
          throw new Error(errs.join(" | ") || `HTTP ${createRes.status}`);
        }
        if (createData.id) {
          results.push({
            index: i, name: row.name, ok: true, offer_id: createData.id,
            warning: errs.length > 0 ? errs.join(" | ") : undefined,
          });
        } else {
          results.push({ index: i, name: row.name, ok: false, error: errs.join("\n") || "Allegro nie zwróciło ID oferty" });
        }
      } catch (e) {
        results.push({ index: i, name: row.name, ok: false, error: e.message });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});