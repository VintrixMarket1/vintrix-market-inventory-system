import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
const TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
const BASE_URL = `https://${DOMAIN}/admin/api/2024-01`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { listing_id } = await req.json();
    if (!listing_id) return Response.json({ error: "listing_id is required" }, { status: 400 });

    const listing = await base44.entities.Listing.get(listing_id);
    const product = await base44.entities.Product.get(listing.product_id);

    // Build Shopify product payload
    const images = (listing.selected_images || product.images || []).map(src => ({ src }));

    const shopifyPayload = {
      product: {
        title: listing.listing_title,
        body_html: listing.listing_description || "",
        vendor: product.brand || "Unknown",
        product_type: product.category || "other",
        tags: [product.category, product.condition, product.gender].filter(Boolean).join(", "),
        status: "active",
        images,
        variants: [{
          price: String(listing.listing_price),
          inventory_management: "shopify",
          inventory_quantity: product.stock_quantity || 1,
          sku: product.internal_code || "",
          requires_shipping: true,
        }],
      }
    };

    const res = await fetch(`${BASE_URL}/products.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify(shopifyPayload),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.errors || "Shopify error" }, { status: res.status });

    const shopifyProductId = String(data.product.id);

    // Save Shopify product ID back to Product and Listing
    await base44.entities.Product.update(product.id, { shopify_product_id: shopifyProductId, status: "listed" });
    await base44.entities.Listing.update(listing_id, { listing_status: "listed" });

    return Response.json({ success: true, shopify_product_id: shopifyProductId, product: data.product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});