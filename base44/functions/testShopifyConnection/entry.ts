import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";

    // Get the most recently saved connection (don't rely on SHOPIFY_SHOP_DOMAIN matching exactly)
    const connections = await base44.asServiceRole.entities.ShopifyConnection.list("-connected_at", 1);
    if (!connections || connections.length === 0 || !connections[0].access_token) {
      return Response.json({
        connected: false,
        error: "Brak tokena dostępu. Kliknij 'Połącz ze Shopify', aby zaauthoryzować aplikację.",
        hint: "oauth_required"
      }, { status: 400 });
    }

    const shopDomain = connections[0].shop_domain;

    const accessToken = connections[0].access_token;
    const query = `query { shop { name myshopifyDomain plan { displayName } } }`;

    const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    if (res.status === 401) {
      return Response.json({ error: "Token wygasł lub jest nieprawidłowy (401). Ponownie zaauthoryzuj aplikację.", connected: false }, { status: 401 });
    }
    if (!res.ok) {
      return Response.json({ error: `Błąd Shopify API: ${res.status} ${res.statusText}`, connected: false }, { status: res.status });
    }
    if (data.errors) {
      return Response.json({ error: data.errors[0]?.message || "Błąd GraphQL", connected: false }, { status: 400 });
    }

    const shop = data.data?.shop;
    return Response.json({
      success: true,
      connected: true,
      shop_name: shop?.name,
      shop_domain: shop?.myshopifyDomain,
      plan: shop?.plan?.displayName,
      api_version: apiVersion,
      scopes: connections[0].scopes,
      connected_at: connections[0].connected_at,
      tested_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, connected: false }, { status: 500 });
  }
});