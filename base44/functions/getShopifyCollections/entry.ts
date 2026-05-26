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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { baseUrl, token } = await getShopifyConfig(base44);

    // Fetch custom collections
    const customRes = await fetch(`${baseUrl}/custom_collections.json?limit=250`, {
      headers: { "X-Shopify-Access-Token": token },
    });
    const customData = await customRes.json();

    // Fetch smart collections
    const smartRes = await fetch(`${baseUrl}/smart_collections.json?limit=250`, {
      headers: { "X-Shopify-Access-Token": token },
    });
    const smartData = await smartRes.json();

    const collections = [
      ...(customData.custom_collections || []).map(c => ({ id: String(c.id), title: c.title, type: "custom" })),
      ...(smartData.smart_collections || []).map(c => ({ id: String(c.id), title: c.title, type: "smart" })),
    ].sort((a, b) => a.title.localeCompare(b.title));

    return Response.json({ collections });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});