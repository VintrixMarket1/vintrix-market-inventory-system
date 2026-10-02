import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Importuje wybrane oferty Allegro jako produkty w magazynie.
// Cena zakupu = 0 + flaga akcji "check" (do uzupełnienia ręcznie).
// Deduplikacja po ID oferty (allegro_listing_id) i nazwie produktu.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { offers = [] } = await req.json();
    if (!Array.isArray(offers) || offers.length === 0) {
      return Response.json({ error: "offers is required" }, { status: 400 });
    }

    // Zbiory do deduplikacji z istniejących produktów
    const products = await base44.asServiceRole.entities.Product.list("-created_date", 5000);
    const existingIds = new Set();
    const existingNames = new Set();
    for (const p of products) {
      if (p.allegro_listing_id) existingIds.add(String(p.allegro_listing_id));
      if (p.product_name) existingNames.add(p.product_name.trim().toLowerCase());
    }

    const created = [], skipped = [], errors = [];
    const CHUNK = 10; // równolegle po 10 — rekordy tworzone lokalnie, bez limitów API
    for (let i = 0; i < offers.length; i += CHUNK) {
      const chunk = offers.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (o) => {
        try {
          const offerId = String(o.id || "");
          const offerName = String(o.name || "").trim();
          if (!offerId || !offerName) {
            errors.push({ offer_id: offerId || "?", reason: "Brak ID lub nazwy oferty" });
            return;
          }
          if (existingIds.has(offerId) || existingNames.has(offerName.toLowerCase())) {
            skipped.push({ offer_id: offerId, name: offerName });
            return;
          }
          const price = parseFloat(o.price) || 0;
          const status = String(o.status || "");

          await base44.asServiceRole.entities.Product.create({
            product_name: offerName,
            category: "other",
            condition: "like_new",
            purchase_price: 0,
            suggested_sale_price: price,
            images: o.image ? [o.image] : [],
            listing_title: offerName,
            listing_description: "",
            status: status === "ACTIVE" ? "listed" : "in_stock",
            allegro_listing_id: offerId,
            action_flag: true,
            action_type: "check",
            action_note: "Import z Allegro — uzupełnij cenę zakupu i kategorię",
            action_set_by: user.email || "import",
            action_set_date: new Date().toISOString(),
          });
          existingIds.add(offerId);
          existingNames.add(offerName.toLowerCase());
          created.push({ offer_id: offerId, name: offerName });
        } catch (e) {
          errors.push({ offer_id: o.id, reason: e.message });
        }
      }));
    }

    return Response.json({
      created: created.length,
      created_items: created,
      skipped_count: skipped.length,
      skipped,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});