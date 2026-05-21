import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Upload image to Allegro by fetching it first, then sending as binary
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await req.json();
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

    const accessToken = await getAllegroToken(base44);

    const listings = await base44.entities.Listing.filter({ id: listing_id });
    const listing = listings[0];
    if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });

    const products = await base44.entities.Product.filter({ id: listing.product_id });
    const product = products[0];
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

    // If updating existing offer
    if (listing.allegro_listing_id) {
      const updateRes = await fetch(`https://api.allegro.pl/sale/product-offers/${listing.allegro_listing_id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.allegro.public.v1+json",
          "Content-Type": "application/vnd.allegro.public.v1+json",
        },
        body: JSON.stringify({
          sellingMode: {
            price: { amount: listing.listing_price.toFixed(2), currency: "PLN" },
          },
          stock: { available: product.stock_quantity || 1, unit: "UNIT" },
          publication: { status: "ACTIVE" },
        }),
      });
      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        return Response.json({ error: `Błąd aktualizacji: ${JSON.stringify(err.errors || err)}` }, { status: 400 });
      }
      await base44.entities.Listing.update(listing.id, { listing_status: "listed" });
      await base44.entities.Product.update(product.id, { status: "listed" });
      return Response.json({ success: true, allegro_listing_id: listing.allegro_listing_id, updated: true });
    }

    // Upload images to Allegro CDN first (max 8)
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

    // Map category
    const categoryMap = {
      clothing: "5",
      shoes: "110778",
      accessories: "4",
      electronics: "88",
      home: "14",
      toys: "6",
      sports: "94",
      books: "7",
      other: "257517",
    };
    const categoryId = categoryMap[product.category] || "257517";

    // Build description
    const descriptionText = listing.listing_description
      ? listing.listing_description
      : `<p>${listing.listing_title}</p>`;

    const descriptionSections = [
      { items: [{ type: "TEXT", content: descriptionText }] },
    ];
    allegroImageUrls.forEach((imgUrl) => {
      descriptionSections.push({ items: [{ type: "IMAGE", url: imgUrl }] });
    });

    // Build /sale/product-offers payload — minimal, no mandatory parameters beyond required fields
    const offerPayload = {
      name: listing.listing_title,
      category: { id: categoryId },
      images: allegroImageUrls,
      description: {
        sections: descriptionSections,
      },
      sellingMode: {
        format: "BUY_NOW",
        price: {
          amount: listing.listing_price.toFixed(2),
          currency: "PLN",
        },
      },
      stock: {
        available: product.stock_quantity || 1,
        unit: "UNIT",
      },
      payments: {
        invoice: "NO_INVOICE",
      },
      delivery: {
        handlingTime: "PT24H",
      },
      location: {
        countryCode: "PL",
      },
      publication: {
        status: "ACTIVE",
      },
    };

    console.log("Sending to Allegro product-offers:", JSON.stringify(offerPayload));

    const createRes = await fetch("https://api.allegro.pl/sale/product-offers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.allegro.public.v1+json",
        "Content-Type": "application/vnd.allegro.public.v1+json",
      },
      body: JSON.stringify(offerPayload),
    });

    const createData = await createRes.json();
    console.log("Allegro product-offers status:", createRes.status);
    console.log("Allegro product-offers response:", JSON.stringify(createData));

    if (!createRes.ok) {
      const errParts = createData.errors?.map(e => `[${e.path || e.code}] ${e.userMessage || e.message || e.code}`) || [];
      const errMsg = errParts.length > 0 ? errParts.join(" | ") : JSON.stringify(createData);
      return Response.json({ error: `Błąd Allegro: ${errMsg}` }, { status: 400 });
    }

    const allegroOfferId = createData.id;

    await Promise.all([
      base44.entities.Listing.update(listing.id, { listing_status: "listed", allegro_listing_id: allegroOfferId }),
      base44.entities.Product.update(product.id, { status: "listed", allegro_listing_id: allegroOfferId }),
    ]);

    return Response.json({ success: true, allegro_listing_id: allegroOfferId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});