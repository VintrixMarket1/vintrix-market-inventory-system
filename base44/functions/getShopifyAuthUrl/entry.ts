import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { redirect_uri } = await req.json();

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN");

    if (!clientId) return Response.json({ error: "Missing SHOPIFY_CLIENT_ID in secrets" }, { status: 500 });
    if (!shopDomain) return Response.json({ error: "Missing SHOPIFY_SHOP_DOMAIN in secrets" }, { status: 500 });

    const scopes = "read_products,write_products,read_inventory,write_inventory,read_locations,read_orders";
    const state = crypto.randomUUID();
    const redirectUri = redirect_uri || "https://app.base44.com/ShopifyCallback";

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return Response.json({ auth_url: authUrl, state });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});