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
      allegro_category_id,
      allegro_product_id,
      shipping_rate_id,
      condition,
      condition_id,
      quantity,
      handling_time,
      location_city,
      location_post_code,
      invoice,
      force_active,
      producer_name,
      producer_street,
      producer_city,
      producer_zip,
      safety_type,
      safety_url,
      ean,
    } = body;

      // Build safetyInformation - Allegro requires this field when productSet is used
      const resolvedSafetyType = safety_type || "ROLE_FULFILLED_BY_MARKETPLACE";
      // For DOCUMENT_URL, send object with role and documentUrl; for other types, send just the role string
      const safetyInformation = resolvedSafetyType === "DOCUMENT_URL" && safety_url
        ? { role: "DOCUMENT_URL", documentUrl: safety_url }
        : { role: resolvedSafetyType };
      console.log("safetyInformation:", JSON.stringify(safetyInformation));

    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });
    if (!allegro_category_id) return Response.json({ error: "allegro_category_id is required — wybierz kategorię z drzewa Allegro" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);
    console.log("publishToAllegro v2 - listing_id:", listing_id, "allegro_product_id:", allegro_product_id);

    const listings = await base44.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];
    if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
    console.log("listing found, allegro_listing_id:", listing.allegro_listing_id);

    const products = await base44.entities.Product.filter({ id: listing.product_id });
    const product = products[0];
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
    console.log("product found, going to build payload");
    console.log("listing_price:", listing.listing_price, "product.condition:", product.condition);

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
    // Use condition_id if provided (user selected from Allegro), otherwise auto-resolve
    const useProvidedConditionId = !!condition_id;

    // --- UPDATE existing offer ---
    if (listing.allegro_listing_id) {
      // Build productSet with responsibleProducer if catalog product is linked
      let updateProductSet = undefined;
      if (allegro_product_id) {
        const resolvedProducerName = (producer_name && producer_name !== "null") ? producer_name
          : (product.brand && product.brand !== "null" ? product.brand : "Producent nieznany");
        const resolvedStreet = producer_street || "ul. Przykładowa 1";
        const resolvedProdCity = producer_city || resolvedCity;
        const resolvedProdZip = producer_zip || resolvedPostCode;
        let producerId = null;
        try {
          const prodListRes = await fetch("https://api.allegro.pl/sale/responsible-producers", { headers });
          if (prodListRes.ok) {
            const prodListData = await prodListRes.json();
            const existing = (prodListData.responsibleProducers || []).find(p => p.name === resolvedProducerName);
            if (existing) producerId = existing.id;
          }
          if (!producerId) {
            const createProdRes = await fetch("https://api.allegro.pl/sale/responsible-producers", {
              method: "POST", headers,
              body: JSON.stringify({
                name: resolvedProducerName,
                producerData: {
                  tradeName: resolvedProducerName,
                  address: { street: resolvedStreet, city: resolvedProdCity, postalCode: resolvedProdZip, countryCode: "PL" },
                  contact: { formUrl: "https://vintrix.pl/kontakt" },
                },
              }),
            });
            const createProdData = await createProdRes.json();
            console.log("Create producer (update path):", createProdRes.status, JSON.stringify(createProdData));
            if (createProdRes.ok) producerId = createProdData.id;
          }
        } catch (e) { console.log("Producer error (update):", e.message); }
        updateProductSet = [{
          product: { id: allegro_product_id },
          quantity: { value: resolvedQuantity },
          ...(producerId ? { responsibleProducer: { id: producerId } } : {}),
          safetyInformation,
        }];
      }

      const updatePayload = {
        sellingMode: { price: { amount: parseFloat(listing.listing_price || 0).toFixed(2), currency: "PLN" } },
        stock: { available: resolvedQuantity, unit: "UNIT" },
        publication: { status: "ACTIVE" },
        ...(updateProductSet ? { productSet: updateProductSet } : {}),
      };
      console.log("UPDATE payload:", JSON.stringify(updatePayload));
      const updateRes = await fetch(`https://api.allegro.pl/sale/product-offers/${listing.allegro_listing_id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updatePayload),
      });
      const updateData = await updateRes.json().catch(() => ({}));
      console.log("Update status:", updateRes.status, JSON.stringify(updateData));
      if (!updateRes.ok && updateRes.status !== 422) {
        const errParts = updateData.errors?.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`) || [];
        return Response.json({ error: `Błąd aktualizacji: ${errParts.join(" | ") || JSON.stringify(updateData)}` }, { status: 400 });
      }
      const updateErrors = updateData.errors || [];
      // Update is confirmed when Allegro returns 200 without hard errors
      const updateConfirmed = updateRes.ok && updateErrors.length === 0;
      await Promise.all([
        base44.entities.Listing.update(listing.id, { listing_status: updateConfirmed ? "listed" : "draft" }),
        base44.entities.Product.update(product.id, { status: updateConfirmed ? "listed" : "in_stock" }),
      ]);
      if (updateErrors.length > 0) {
        const errParts = updateErrors.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);
        return Response.json({
          warning: `Oferta nadal jako szkic (ID: ${listing.allegro_listing_id}). Błędy: ${errParts.join(" | ")}`,
          allegro_listing_id: listing.allegro_listing_id,
        });
      }
      return Response.json({ success: true, allegro_listing_id: listing.allegro_listing_id, updated: true });
    }

    // --- Upload images ---
    const imagesToUse = listing.selected_images?.length > 0 ? listing.selected_images : product.images || [];
    console.log("Uploading", imagesToUse.length, "images...");
    const allegroImageUrls = [];
    for (const imgUrl of imagesToUse.slice(0, 8)) {
      try {
        const allegroUrl = await uploadImageToAllegro(imgUrl, accessToken);
        allegroImageUrls.push(allegroUrl);
      } catch (e) {
        console.log("Pominięto zdjęcie:", e.message);
      }
    }
    console.log("Uploaded", allegroImageUrls.length, "images");

    // Build description — escape & for Allegro HTML validator
    const rawDescription = listing.listing_description || `<p>${listing.listing_title}</p>`;
    const descriptionText = rawDescription.replace(/&(?!amp;|nbsp;|quot;|apos;|lt;|gt;|#\d+;)/g, "&amp;");
    const descriptionSections = [{ items: [{ type: "TEXT", content: descriptionText }] }];
    allegroImageUrls.forEach(imgUrl => {
      descriptionSections.push({ items: [{ type: "IMAGE", url: imgUrl }] });
    });

    console.log("About to resolve condition param...");
    // Resolve Stan parameter - use provided condition_id if available
    let conditionParams = [];
    if (useProvidedConditionId) {
      conditionParams = [{ id: "11323", valuesIds: [condition_id] }];
      console.log("Using provided condition_id:", condition_id);
    } else {
      conditionParams = await resolveConditionParam(allegro_category_id, resolvedCondition, accessToken);
      console.log("Auto-resolved conditionParams:", JSON.stringify(conditionParams));
    }

    // Build offer payload
    const offerPayload = {
      name: listing.listing_title,
      category: { id: allegro_category_id },
      images: allegroImageUrls,
      description: { sections: descriptionSections },
      sellingMode: {
        format: "BUY_NOW",
        price: { amount: parseFloat(listing.listing_price || 0).toFixed(2), currency: "PLN" },
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

    console.log("offerPayload built, allegro_product_id:", allegro_product_id);
    // If catalog product is linked — use productSet
    if (allegro_product_id) {
      // Allegro requires responsibleProducer to be a pre-registered entity from /sale/responsible-producers
      const resolvedProducerName = (producer_name && producer_name !== "null") ? producer_name
        : (product.brand && product.brand !== "null" ? product.brand : "Producent nieznany");
      const resolvedStreet = producer_street || "ul. Przykładowa 1";
      const resolvedProdCity = producer_city || resolvedCity;
      const resolvedProdZip = producer_zip || resolvedPostCode;

      console.log("Looking up responsible producer:", resolvedProducerName);
      // Check if producer already registered
      let producerId = null;
      try {
        const prodListRes = await fetch("https://api.allegro.pl/sale/responsible-producers", { headers });
        const prodListText = await prodListRes.text();
        console.log("Producer list status:", prodListRes.status, prodListText.substring(0, 300));
        if (prodListRes.ok) {
          const prodListData = JSON.parse(prodListText);
          const existing = (prodListData.responsibleProducers || []).find(p => p.name === resolvedProducerName);
          if (existing) producerId = existing.id;
        }

        // If not found, create it
        if (!producerId) {
          const createProdRes = await fetch("https://api.allegro.pl/sale/responsible-producers", {
            method: "POST",
            headers,
            body: JSON.stringify({
              name: resolvedProducerName,
              producerData: {
                tradeName: resolvedProducerName,
                address: {
                  street: resolvedStreet,
                  city: resolvedProdCity,
                  postalCode: resolvedProdZip,
                  countryCode: "PL",
                },
                contact: {
                  formUrl: "https://vintrix.pl/kontakt",
                },
              },
            }),
          });
          const createProdText = await createProdRes.text();
          console.log("Create responsible producer:", createProdRes.status, createProdText.substring(0, 300));
          if (createProdRes.ok) producerId = JSON.parse(createProdText).id;
        }
        console.log("Resolved producerId:", producerId);
      } catch (prodErr) {
        console.log("Responsible producer error:", prodErr.message);
      }

      offerPayload.productSet = [{
        product: { id: allegro_product_id },
        quantity: { value: resolvedQuantity },
        ...(producerId ? { responsibleProducer: { id: producerId } } : {}),
        safetyInformation: safetyInformation,
      }];
    } else {
      // No catalog product — include safetyInformation at offer level and all required parameters
      offerPayload.safetyInformation = safetyInformation;

      // Fetch all required parameters for this category and build them
      try {
        const paramRes = await fetch(`https://api.allegro.pl/sale/categories/${allegro_category_id}/parameters`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/vnd.allegro.public.v1+json",
          },
        });
        const paramData = await paramRes.json();
        const requiredParams = (paramData.parameters || []).filter(p => p.required);
        console.log("Required params for category:", requiredParams.map(p => `${p.id}:${p.name}`));

        const params = [];
        for (const p of requiredParams) {
          // Stan produktu (11323) — already handled via conditionParams
          if (p.id === "11323") {
            if (conditionParams.length > 0) params.push(...conditionParams);
            continue;
          }
          // EAN/GTIN (225694) — use provided ean if available
          if ((p.name?.toLowerCase().includes("ean") || p.name?.toLowerCase().includes("gtin")) && ean) {
            params.push({ id: p.id, values: [{ value: ean }] });
            continue;
          }
          // Marka / Producent — use brand or producer_name
          if (p.name?.toLowerCase().includes("marka") || p.name?.toLowerCase().includes("producent")) {
            const brandVal = producer_name || product.brand;
            if (brandVal && p.dictionary?.length) {
              const match = p.dictionary.find(v => v.name?.toLowerCase() === brandVal.toLowerCase())
                || p.dictionary.find(v => v.name?.toLowerCase().includes(brandVal.toLowerCase()));
              if (match) { params.push({ id: p.id, valuesIds: [match.id] }); continue; }
            }
            // If open dictionary or no match found — skip (Allegro won't accept wrong value)
          }
          // For other required params with dictionary — pick first value as fallback
          if (p.dictionary?.length && !p.multipleChoices) {
            // Do NOT auto-fill required dictionary params — leave for user to fix in Allegro panel
          }
        }
        // Always include condition params
        if (conditionParams.length > 0 && !params.find(p => p.id === "11323")) {
          params.push(...conditionParams);
        }
        if (params.length > 0) offerPayload.parameters = params;
      } catch (e) {
        console.log("Error fetching required params:", e.message);
        if (conditionParams.length > 0) offerPayload.parameters = conditionParams;
      }

      // Add EAN at offer level if provided (Allegro also accepts it as top-level)
      if (ean) offerPayload.ean = [ean];

      // Add responsible producer at offer level when no catalog product
      if (producer_name) {
        const resolvedProducerName = producer_name;
        const resolvedStreet = producer_street || "ul. Przykładowa 1";
        const resolvedProdCity = producer_city || resolvedCity;
        const resolvedProdZip = producer_zip || resolvedPostCode;
        let producerId = null;
        try {
          const prodListRes = await fetch("https://api.allegro.pl/sale/responsible-producers", { headers });
          if (prodListRes.ok) {
            const prodListData = await prodListRes.json();
            const existing = (prodListData.responsibleProducers || []).find(p => p.name === resolvedProducerName);
            if (existing) producerId = existing.id;
          }
          if (!producerId) {
            const createProdRes = await fetch("https://api.allegro.pl/sale/responsible-producers", {
              method: "POST", headers,
              body: JSON.stringify({
                name: resolvedProducerName,
                producerData: {
                  tradeName: resolvedProducerName,
                  address: { street: resolvedStreet, city: resolvedProdCity, postalCode: resolvedProdZip, countryCode: "PL" },
                  contact: { formUrl: "https://vintrix.pl/kontakt" },
                },
              }),
            });
            if (createProdRes.ok) producerId = (await createProdRes.json()).id;
          }
        } catch (e) { console.log("Producer error (no catalog):", e.message); }
        if (producerId) offerPayload.responsibleProducer = { id: producerId };
      }
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
    console.log("Create status:", createRes.status, JSON.stringify(createData).substring(0, 500));

    if (!createRes.ok && createRes.status !== 422) {
      const errParts = createData.errors?.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`) || [];
      return Response.json({ error: `Błąd Allegro: ${errParts.join(" | ") || JSON.stringify(createData)}` }, { status: 400 });
    }

    // 422 = validation errors; may or may not have saved an offer id
    if (createRes.status === 422) {
      const errParts = (createData.errors || []).map(e => e.userMessage || e.message || e.code);
      const offerId = createData.id;
      if (offerId) {
        await Promise.all([
          base44.entities.Listing.update(listing.id, { allegro_listing_id: offerId }),
          base44.entities.Product.update(product.id, { allegro_listing_id: offerId }),
        ]);
        return Response.json({
          warning: `Oferta zapisana jako szkic (ID: ${offerId}). Dokończ w panelu Allegro.\n${errParts.join("\n")}`,
          allegro_listing_id: offerId,
        });
      }
      // No offer id — nothing was saved, return proper error
      return Response.json({ error: errParts.join("\n") || JSON.stringify(createData) }, { status: 400 });
    }

    const allegroOfferId = createData.id;
    const offerErrors = createData.errors || [];
    // Allegro confirms success when it returns an id with HTTP 200/201 — treat as listed
    // regardless of any warnings in the errors array (those are non-blocking)
    const allegroStatus = createData.publication?.status;
    const isConfirmed = !!allegroOfferId && createRes.status < 300;

    console.log("Offer created, id:", allegroOfferId, "publication status:", allegroStatus, "errors:", offerErrors.length);

    await Promise.all([
      base44.entities.Listing.update(listing.id, {
        listing_status: isConfirmed ? "listed" : "draft",
        allegro_listing_id: allegroOfferId,
      }),
      base44.entities.Product.update(product.id, {
        status: isConfirmed ? "listed" : "in_stock",
        allegro_listing_id: allegroOfferId,
      }),
    ]);

    if (offerErrors.length > 0) {
      const errParts = offerErrors.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);
      return Response.json({
        success: true,
        warning: `Oferta wystawiona (ID: ${allegroOfferId}), ale z ostrzeżeniami: ${errParts.join(" | ")}`,
        allegro_listing_id: allegroOfferId,
      });
    }

    return Response.json({ success: true, allegro_listing_id: allegroOfferId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});