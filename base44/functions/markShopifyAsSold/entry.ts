import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getShopifyConfig(base44) {
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
  if (!shopDomain) throw new Error("Brak SHOPIFY_SHOP_DOMAIN w sekretach.");

  const connections = await base44.asServiceRole.entities.ShopifyConnection.filter({ shop_domain: shopDomain });
  if (!connections || connections.length === 0) {
    throw new Error("Brak połączenia z Shopify. Zaauthoryzuj aplikację na stronie Ustawienia Shopify.");
  }
  const token = connections[0].access_token;
  const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";
  return { domain: shopDomain, token, apiVersion, baseUrl: `https://${shopDomain}/admin/api/${apiVersion}` };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await req.json();
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

    const { baseUrl, token } = await getShopifyConfig(base44);

    const listings = await base44.asServiceRole.entities.Listing.filter({ id: listing_id });
    if (!listings || listings.length === 0) return Response.json({ error: "Listing nie istnieje" }, { status: 404 });
    const listing = listings[0];

    const products = await base44.asServiceRole.entities.Product.filter({ id: listing.product_id });
    if (!products || products.length === 0) return Response.json({ error: "Produkt nie istnieje" }, { status: 404 });
    const product = products[0];

    const shopifyProductId = product.shopify_product_id;
    if (!shopifyProductId) return Response.json({ error: "No Shopify product ID found" }, { status: 400 });

    const res = await fetch(`${baseUrl}/products/${shopifyProductId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ product: { id: shopifyProductId, status: "draft" } }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.errors || "Shopify error" }, { status: res.status });

    await base44.asServiceRole.entities.Listing.update(listing_id, { listing_status: "sold" });
    await base44.asServiceRole.entities.Product.update(product.id, { status: "sold" });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});