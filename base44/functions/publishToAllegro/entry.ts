import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// --- Vintrix Market account settings ---
const SHIPPING_RATES = {
  small: "6e05d239-b12a-4941-ab01-5b59fa69256a",
  large: "d9dc3989-31ae-4bfa-ae2f-e3076521375b",
};
const RETURN_POLICY_ID = "5339f3cf-6e5e-4903-87f4-922892772c40";
const IMPLIED_WARRANTY_ID = "5e43a3fd-2f9e-4ff9-9b66-65392a75e916";

// Allegro category IDs — verified leaf nodes via /sale/categories
// Priority: categories where Marka is optional or not required (to avoid catalog product requirement)
// 102864 = Sport > Turystyka > Akcesoria — only Stan required, Marka optional (SAFE CATEGORY)
const CATEGORY_MAP = {
  clothing: "535",     // Moda > Odzież męska > Pozostałe
  shoes: "5544",       // Moda > Obuwie > Damskie > Pozostałe
  accessories: "1489", // Moda > Galanteria > Paski
  electronics: "102864", // safe fallback (electronics often needs catalog product)
  home: "128",         // Dom i Ogród > Wyposażenie > Pozostałe
  toys: "11842",       // Dziecko > Zabawki > Pozostałe
  sports: "102864",    // Sport > Turystyka > Akcesoria (Marka optional)
  books: "102864",     // safe fallback
  other: "102864",     // safe fallback — Stan only required, Marka optional
};

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

async function getAllegroToken(base44) {
  const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
  if (!connections || connections.length === 0) throw new Error("Brak połączenia z Allegro. Połącz konto w ustawieniach.");

  let conn = connections[0];
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (needsRefresh && conn.refresh_token) {
    const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
    const clientSecret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
    const credentials = btoa(`${clientId}:${clientSecret}`);
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

// Resolve parameters for a category — only include non-catalog params
// Catalog params (like Marka 248811) that are "required" must go through productSet,
// but if Marka is optional we can include it in offer.parameters safely
async function resolveCategoryParams(categoryId, resolvedCondition, product, accessToken) {
  const params = [];
  try {
    const paramRes = await fetch(`https://api.allegro.pl/sale/categories/${categoryId}/parameters`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });
    const paramData = await paramRes.json();
    const parameters = paramData.parameters || [];

    // Stan (condition) — id 11323, always include
    const stanParam = parameters.find(p => p.id === "11323");
    if (stanParam?.dictionary?.length > 0) {
      const vals = stanParam.dictionary;
      const conditionMap = {
        new: ["nowy"],
        like_new: ["po zwrocie", "outlet", "nowy bez", "powystawowy"],
        used: ["używany", "uzywany"],
      };
      const keywords = conditionMap[resolvedCondition] || conditionMap.used;
      let matched = null;
      for (const kw of keywords) {
        matched = vals.find(v => v.name?.toLowerCase().includes(kw));
        if (matched) break;
      }
      if (!matched) matched = vals.find(v => v.name?.toLowerCase().includes("używany"));
      if (!matched) matched = vals[0];
      if (matched) params.push({ id: "11323", valuesIds: [matched.id] });
    }

    // Marka — ONLY include if NOT required (optional). Required Marka needs productSet (catalog product)
    const markaParam = parameters.find(p => p.id === "248811");
    if (markaParam && !markaParam.required && markaParam.dictionary?.length > 0) {
      const brandName = (product.brand || "").toLowerCase().trim();
      const vals = markaParam.dictionary;
      let matched = null;
      if (brandName) {
        matched = vals.find(v => v.name?.toLowerCase() === brandName);
        if (!matched) matched = vals.find(v => v.name?.toLowerCase().includes(brandName));
      }
      if (!matched) matched = vals.find(v => v.name?.toLowerCase() === "bez marki");
      if (matched) params.push({ id: "248811", valuesIds: [matched.id] });
    }

    // Płeć (gender) — id 15851, optional, include when available
    const plecParam = parameters.find(p => p.id === "15851");
    if (plecParam?.dictionary?.length > 0) {
      const genderMap = {
        men: ["mężczyzna"],
        women: ["kobieta"],
        kids: ["dziecko"],
        unisex: ["uniseks", "unisex"],
      };
      const gender = product.gender || "unisex";
      const keywords = genderMap[gender] || genderMap.unisex;
      const vals = plecParam.dictionary;
      let matched = null;
      for (const kw of keywords) {
        matched = vals.find(v => v.name?.toLowerCase().includes(kw));
        if (matched) break;
      }
      if (matched) params.push({ id: "15851", valuesIds: [matched.id] });
    }

    // Kod producenta (string) — include if required
    const kpParam = parameters.find(p => p.id === "224017" && p.required);
    if (kpParam) {
      const sku = product.internal_code || product.barcode || "BRAK";
      params.push({ id: "224017", values: [sku.substring(0, 50)] });
    }

    // Wiek dziecka — id 3475 (toys), use "0 +" as safe default
    const wiekParam = parameters.find(p => p.id === "3475" && p.required);
    if (wiekParam?.dictionary?.length > 0) {
      const defaultAge = wiekParam.dictionary.find(v => v.name === "0 +") || wiekParam.dictionary[0];
      if (defaultAge) params.push({ id: "3475", valuesIds: [defaultAge.id] });
    }

  } catch (e) {
    console.log("Nie udało się pobrać parametrów kategorii:", e.message);
  }
  return params;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      listing_id,
      shipping_rate_id,
      condition,
      category,
      quantity,
      handling_time,
      location_city,
      location_post_code,
      invoice,
      force_active,
    } = body;
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

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

    // --- UPDATE existing offer ---
    if (listing.allegro_listing_id) {
      const updatePayload = {
        sellingMode: {
          price: { amount: listing.listing_price.toFixed(2), currency: "PLN" },
        },
        stock: { available: product.stock_quantity || 1, unit: "UNIT" },
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
        console.log("Pominięto zdjęcie:", imgUrl, e.message);
      }
    }

    const productCategory = category || product.category || "other";
    const resolvedCategoryId = CATEGORY_MAP[productCategory] || "102864";
    const resolvedQuantity = quantity || product.stock_quantity || 1;
    const resolvedHandlingTime = handling_time || "PT24H";
    const resolvedCity = location_city || "Zgierz";
    const resolvedPostCode = location_post_code || "95-100";
    const resolvedInvoice = invoice || "VAT";
    const resolvedCondition = condition || product.condition || "used";
    const heavyCategories = ["home", "electronics", "sports", "toys"];
    const shippingRateId = shipping_rate_id || (
      heavyCategories.includes(productCategory) ? SHIPPING_RATES.large : SHIPPING_RATES.small
    );

    // Build description
    const descriptionText = listing.listing_description || `<p>${listing.listing_title}</p>`;
    const descriptionSections = [
      { items: [{ type: "TEXT", content: descriptionText }] },
    ];
    allegroImageUrls.forEach((imgUrl) => {
      descriptionSections.push({ items: [{ type: "IMAGE", url: imgUrl }] });
    });

    // Resolve category parameters dynamically
    const resolvedParams = await resolveCategoryParams(resolvedCategoryId, resolvedCondition, product, accessToken);

    const offerPayload = {
      name: listing.listing_title,
      category: { id: resolvedCategoryId },
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
      ...(resolvedParams.length > 0 ? { parameters: resolvedParams } : {}),
      location: { countryCode: "PL", province: "LODZKIE", city: resolvedCity, postCode: resolvedPostCode },
      afterSalesServices: {
        impliedWarranty: { id: IMPLIED_WARRANTY_ID },
        returnPolicy: { id: RETURN_POLICY_ID },
      },
      publication: { status: force_active ? "ACTIVE" : "INACTIVE" },
    };

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

    if (!createRes.ok) {
      const errParts = createData.errors?.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`) || [];
      return Response.json({ error: `Błąd Allegro: ${errParts.join(" | ") || JSON.stringify(createData)}` }, { status: 400 });
    }

    const allegroOfferId = createData.id;
    const hasErrors = createData.errors?.length > 0;

    if (hasErrors) {
      const errParts = createData.errors.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`);
      await Promise.all([
        base44.entities.Listing.update(listing.id, { allegro_listing_id: allegroOfferId }),
        base44.entities.Product.update(product.id, { allegro_listing_id: allegroOfferId }),
      ]);
      return Response.json({
        warning: `Oferta zapisana jako szkic (ID: ${allegroOfferId}). Dokończ w panelu Allegro. Błędy: ${errParts.join(" | ")}`,
        allegro_listing_id: allegroOfferId,
      });
    }

    await Promise.all([
      base44.entities.Listing.update(listing.id, { listing_status: "listed", allegro_listing_id: allegroOfferId }),
      base44.entities.Product.update(product.id, { status: "listed", allegro_listing_id: allegroOfferId }),
    ]);

    return Response.json({ success: true, allegro_listing_id: allegroOfferId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});