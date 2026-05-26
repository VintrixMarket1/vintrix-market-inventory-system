import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getShopifyConfig(base44) {
  const connections = await base44.asServiceRole.entities.ShopifyConnection.list("-connected_at", 1);
  if (!connections || connections.length === 0 || !connections[0].access_token) {
    throw new Error("Brak połączenia z Shopify.");
  }
  const shopDomain = connections[0].shop_domain;
  const token = connections[0].access_token;
  const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";
  return { domain: shopDomain, token, apiVersion, baseUrl: `https://${shopDomain}/admin/api/${apiVersion}` };
}

async function addProductToCollection(baseUrl, token, shopifyProductId, collectionId) {
  await fetch(`${baseUrl}/collects.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ collect: { product_id: shopifyProductId, collection_id: collectionId } }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { product_ids, collection_ids } = await req.json();
    if (!product_ids || product_ids.length === 0) {
      return Response.json({ error: "product_ids is required" }, { status: 400 });
    }

    const { baseUrl, token } = await getShopifyConfig(base44);

    const results = [];
    for (const productId of product_ids) {
      try {
        const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
        if (!products || products.length === 0) {
          results.push({ product_id: productId, success: false, error: "Produkt nie istnieje" });
          continue;
        }
        const product = products[0];

        // Find or create a Shopify listing for this product
        let listingDescription = product.listing_description || "";
        let listingTitle = product.listing_title || product.product_name;
        let listingPrice = product.suggested_sale_price || product.purchase_price || 0;
        let images = (product.images || []).map(src => ({ src }));

        const shopifyPayload = {
          product: {
            title: listingTitle,
            body_html: listingDescription,
            vendor: product.brand || "Unknown",
            product_type: product.category || "other",
            tags: [product.category, product.condition, product.gender].filter(Boolean).join(", "),
            status: "active",
            images,
            variants: [{
              price: String(listingPrice),
              inventory_management: "shopify",
              inventory_quantity: product.stock_quantity || 1,
              sku: product.internal_code || "",
              requires_shipping: true,
            }],
          }
        };

        const res = await fetch(`${baseUrl}/products.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
          body: JSON.stringify(shopifyPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          results.push({ product_id: productId, success: false, error: JSON.stringify(data.errors) });
          continue;
        }

        const shopifyProductId = String(data.product.id);
        await base44.asServiceRole.entities.Product.update(productId, { shopify_product_id: shopifyProductId, status: "listed" });

        // Assign to collections (only custom collections support collects API)
        if (collection_ids && collection_ids.length > 0) {
          for (const collectionId of collection_ids) {
            await addProductToCollection(baseUrl, token, shopifyProductId, collectionId);
          }
        }

        results.push({ product_id: productId, success: true, shopify_product_id: shopifyProductId });
      } catch (err) {
        results.push({ product_id: productId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return Response.json({ success: true, results, successCount, totalCount: product_ids.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});