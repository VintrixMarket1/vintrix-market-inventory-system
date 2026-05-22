import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SHIPPING_RATES = {
  small: "6e05d239-b12a-4941-ab01-5b59fa69256a",
  large: "d9dc3989-31ae-4bfa-ae2f-e3076521375b",
};
const RETURN_POLICY_ID = "5339f3cf-6e5e-4903-87f4-922892772c40";
const IMPLIED_WARRANTY_ID = "5e43a3fd-2f9e-4ff9-9b66-65392a75e916";

async function getAllegroToken(base44) {
  const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
  if (!connections || connections.length === 0) throw new Error("Brak połączenia z Allegro. Połącz konto w ustawieniach.");
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
    if (!refreshRes.ok) throw new Error(`Token wygasł: ${refreshData.error_description || "Połącz ponownie w ustawieniach."}`);
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

// Resolve only Stan (condition) parameter — the one always safe to include
async function resolveConditionParam(categoryId, resolvedCondition, accessToken) {
  try {
    const paramRes = await fetch(`https://api.allegro.pl/sale/categories/${categoryId}/parameters`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });
    const paramData = await paramRes.json();
    const stanParam = (paramData.parameters || []).find(p => p.id === "11323");
    if (!stanParam?.dictionary?.length) return [];

    const conditionKeywords = {
      new: ["nowy"],
      like_new: ["po zwrocie", "powystawowy", "outlet"],
      used: ["używany"],
    };
    const keywords = conditionKeywords[resolvedCondition] || conditionKeywords.used;
    let matched = null;
    for (const kw of keywords) {
      matched = stanParam.dictionary.find(v => v.name?.toLowerCase().includes(kw));
      if (matched) break;
    }
    if (!matched) matched = stanParam.dictionary.find(v => v.name?.toLowerCase().includes("używany"));
    if (!matched) matched = stanParam.dictionary[0];
    return matched ? [{ id: "11323", valuesIds: [matched.id] }] : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      listing_id,
      allegro_category_id,    // leaf category ID from Allegro tree
      allegro_product_id,     // optional: product from Allegro catalog
      shipping_rate_id,
      condition,
      quantity,
      handling_time,
      location_city,
      location_post_code,
      invoice,
      force_active,
    } = body;

    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });
    if (!allegro_category_id) return Response.json({ error: "allegro_category_id is required — wybierz kategorię z drzewa Allegro" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);

    const listings = await base44.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];
    if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });

    const products = await base44.entities.Product.filter({ id: listing.product_id });
    const product = products[0];
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.allegro.public.v1+json",
      "Content-Type": "application/vnd.allegro.public.v1+json",
    };

    const resolvedCondition = condition || product.condition || "used";
    const resolvedQuantity = parseInt(quantity) || product.stock_quantity || 1;
    const resolvedHandlingTime = handling_time || "PT24H";
    const resolvedCity = location_city || "Zgierz";
    const resolvedPostCode = location_post_code || "95-100";
    const resolvedInvoice = invoice || "VAT";
    const heavyCategories = ["home", "electronics", "sports", "toys"];
    const shippingRateId = shipping_rate_id || (
      heavyCategories.includes(product.category) ? SHIPPING_RATES.large : SHIPPING_RATES.small
    );

    // --- UPDATE existing offer ---
    if (listing.allegro_listing_id) {
      const updatePayload = {
        sellingMode: { price: { amount: listing.listing_price.toFixed(2), currency: "PLN" } },
        stock: { available: resolvedQuantity, unit: "UNIT" },
        publication: { status: "ACTIVE" },
      };
      const updateRes = await fetch(`https://api.allegro.pl/sale/product-offers/${listing.allegro_listing_id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updatePayload),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        return Response.json({ error: `Błąd aktualizacji: ${JSON.stringify(err.errors || err)}` }, { status: 400 });
      }
      await base44.entities.Listing.update(listing.id, { listing_status: "listed" });
      await base44.entities.Product.update(product.id, { status: "listed" });
      return Response.json({ success: true, allegro_listing_id: listing.allegro_listing_id, updated: true });
    }

    // --- Upload images ---
    const imagesToUse = listing.selected_images?.length > 0 ? listing.selected_images : product.images || [];
    const allegroImageUrls = [];
    for (const imgUrl of imagesToUse.slice(0, 8)) {
      try {
        const allegroUrl = await uploadImageToAllegro(imgUrl, accessToken);
        allegroImageUrls.push(allegroUrl);
      } catch (e) {
        console.log("Pominięto zdjęcie:", e.message);
      }
    }

    // Build description — escape & for Allegro HTML validator
    const rawDescription = listing.listing_description || `<p>${listing.listing_title}</p>`;
    const descriptionText = rawDescription.replace(/&(?!amp;|nbsp;|quot;|apos;|lt;|gt;|#\d+;)/g, "&amp;");
    const descriptionSections = [{ items: [{ type: "TEXT", content: descriptionText }] }];
    allegroImageUrls.forEach(imgUrl => {
      descriptionSections.push({ items: [{ type: "IMAGE", url: imgUrl }] });
    });

    // Resolve Stan parameter
    const conditionParams = await resolveConditionParam(allegro_category_id, resolvedCondition, accessToken);

    // Build offer payload
    const offerPayload = {
      name: listing.listing_title,
      category: { id: allegro_category_id },
      images: allegroImageUrls,
      description: { sections: descriptionSections },
      sellingMode: {
        format: "BUY_NOW",
        price: { amount: listing.listing_price.toFixed(2), currency: "PLN" },
      },
      stock: { available: resolvedQuantity, unit: "UNIT" },
      payments: { invoice: resolvedInvoice },
      delivery: {
        handlingTime: resolvedHandlingTime,
        shippingRates: { id: shippingRateId },
      },
      location: { countryCode: "PL", province: "LODZKIE", city: resolvedCity, postCode: resolvedPostCode },
      afterSalesServices: {
        impliedWarranty: { id: IMPLIED_WARRANTY_ID },
        returnPolicy: { id: RETURN_POLICY_ID },
      },
      publication: { status: force_active ? "ACTIVE" : "INACTIVE" },
    };

    // If catalog product is linked — use productSet
    if (allegro_product_id) {
      offerPayload.productSet = [{
        product: { id: allegro_product_id },
        quantity: { value: resolvedQuantity },
        // EU regulation: responsible producer required for all product offers
        responsibleProducer: {
          name: product.brand || "Producent",
          address: {
            street: "ul. Przykładowa 1",
            city: resolvedCity,
            zipCode: resolvedPostCode,
            countryCode: "PL",
          },
        },
        safetyInformation: { type: "ROLE_FULFILLED_BY_MARKETPLACE" },
      }];
    } else if (conditionParams.length > 0) {
      // No catalog product — include only Stan param (safe for most categories)
      offerPayload.parameters = conditionParams;
    }

    if (product.internal_code) {
      offerPayload.external = { id: product.internal_code.substring(0, 50) };
    }

    console.log("Creating offer:", JSON.stringify(offerPayload));

    const createRes = await fetch("https://api.allegro.pl/sale/product-offers", {
      method: "POST",
      headers,
      body: JSON.stringify(offerPayload),
    });

    const createData = await createRes.json();
    console.log("Create status:", createRes.status, JSON.stringify(createData));

    if (!createRes.ok && createRes.status !== 422) {
      const errParts = createData.errors?.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`) || [];
      return Response.json({ error: `Błąd Allegro: ${errParts.join(" | ") || JSON.stringify(createData)}` }, { status: 400 });
    }

    // 422 = offer created but with validation errors (saved as draft)
    if (createRes.status === 422) {
      const errParts = (createData.errors || []).map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);
      const offerId = createData.id;
      if (offerId) {
        await Promise.all([
          base44.entities.Listing.update(listing.id, { allegro_listing_id: offerId }),
          base44.entities.Product.update(product.id, { allegro_listing_id: offerId }),
        ]);
        return Response.json({
          warning: `Oferta zapisana jako szkic (ID: ${offerId}). Dokończ w panelu Allegro. Błędy: ${errParts.join(" | ")}`,
          allegro_listing_id: offerId,
        });
      }
      return Response.json({ error: `Błąd walidacji Allegro: ${errParts.join(" | ") || JSON.stringify(createData)}` }, { status: 400 });
    }

    const allegroOfferId = createData.id;
    const offerErrors = createData.errors || [];

    await Promise.all([
      base44.entities.Listing.update(listing.id, {
        listing_status: offerErrors.length === 0 ? "listed" : "draft",
        allegro_listing_id: allegroOfferId,
      }),
      base44.entities.Product.update(product.id, {
        status: offerErrors.length === 0 ? "listed" : "in_stock",
        allegro_listing_id: allegroOfferId,
      }),
    ]);

    if (offerErrors.length > 0) {
      const errParts = offerErrors.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);
      return Response.json({
        warning: `Oferta zapisana jako szkic (ID: ${allegroOfferId}). Dokończ w panelu Allegro. Błędy: ${errParts.join(" | ")}`,
        allegro_listing_id: allegroOfferId,
      });
    }

    return Response.json({ success: true, allegro_listing_id: allegroOfferId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});