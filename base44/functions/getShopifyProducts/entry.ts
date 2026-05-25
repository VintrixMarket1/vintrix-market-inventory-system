import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50;
    const cursor = body.cursor || null;

    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";
    const connections = await base44.asServiceRole.entities.ShopifyConnection.list("-connected_at", 1);
    if (!connections || connections.length === 0 || !connections[0].access_token) {
      return Response.json({ error: "Brak połączenia z Shopify", connected: false }, { status: 400 });
    }

    const shopDomain = connections[0].shop_domain;
    const accessToken = connections[0].access_token;

    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const query = `
      query {
        products(first: ${limit}${afterClause}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            vendor
            productType
            status
            createdAt
            images(first: 5) {
              nodes { url }
            }
            variants(first: 1) {
              nodes {
                price
                sku
                inventoryQuantity
              }
            }
            description
          }
        }
      }
    `;

    const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return Response.json({ error: `Błąd Shopify API: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    if (data.errors) {
      return Response.json({ error: data.errors[0]?.message || "Błąd GraphQL" }, { status: 400 });
    }

    const products = data.data?.products?.nodes || [];
    const pageInfo = data.data?.products?.pageInfo || {};

    const mapped = products.map(p => ({
      shopify_id: p.id,
      title: p.title,
      vendor: p.vendor,
      product_type: p.productType,
      status: p.status,
      price: p.variants?.nodes?.[0]?.price || null,
      sku: p.variants?.nodes?.[0]?.sku || null,
      inventory: p.variants?.nodes?.[0]?.inventoryQuantity || 0,
      images: (p.images?.nodes || []).map(img => img.url),
      description: p.description,
      created_at: p.createdAt,
    }));

    return Response.json({ products: mapped, pageInfo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});