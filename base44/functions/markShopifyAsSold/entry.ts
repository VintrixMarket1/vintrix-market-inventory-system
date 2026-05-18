import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getValidToken() {
  const legacyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  const expiresAt = Deno.env.get("SHOPIFY_ACCESS_TOKEN_EXPIRES_AT");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");

  if (legacyToken && legacyToken.startsWith("shpat_")) return legacyToken;
  if (legacyToken && expiresAt && Date.now() < new Date(expiresAt).getTime() - 5 * 60 * 1000) return legacyToken;
  if (clientId && clientSecret && shopDomain) {
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) return data.access_token;
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }
  throw new Error("No valid Shopify credentials configured.");
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
    if (!shopifyProductId) return Response.json({ error: "No Shopify product ID found" }, { status: 400 });

    const res = await fetch(`${BASE_URL}/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
      body: JSON.stringify({ product: { id: shopifyProductId, status: "draft" } }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.errors || "Shopify error" }, { status: res.status });

    await base44.entities.Listing.update(listing_id, { listing_status: "sold" });
    await base44.entities.Product.update(product.id, { status: "sold" });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});