import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getValidToken() {
  const accessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (accessToken) return accessToken;
  throw new Error("No valid Shopify credentials configured. Set SHOPIFY_ACCESS_TOKEN in secrets.");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await req.json();
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

    const DOMAIN = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";
    const BASE_URL = `https://${DOMAIN}/admin/api/${API_VERSION}`;
    const TOKEN = await getValidToken();

    const listing = await base44.entities.Listing.get(listing_id);
    const product = await base44.entities.Product.get(listing.product_id);

    const shopifyProductId = product.shopify_product_id;
    if (!shopifyProductId) return Response.json({ error: "No Shopify product ID — publish first" }, { status: 400 });

    const images = (listing.selected_images || product.images || []).map(src => ({ src }));

    const shopifyPayload = {
      product: {
        id: shopifyProductId,
        title: listing.listing_title,
        body_html: listing.listing_description || "",
        images,
        variants: [{
          price: String(listing.listing_price),
          sku: product.internal_code || "",
          inventory_quantity: product.stock_quantity || 1,
        }],
      }
    };

    const res = await fetch(`${BASE_URL}/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
      body: JSON.stringify(shopifyPayload),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.errors || "Shopify error" }, { status: res.status });

    return Response.json({ success: true, product: data.product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});