import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code, shop } = await req.json();
    if (!code || !shop) return Response.json({ error: "Missing code or shop" }, { status: 400 });

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET in secrets" }, { status: 500 });
    }

    // Exchange authorization code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.json({ error: tokenData.error_description || tokenData.error || "Failed to exchange code for token" }, { status: 400 });
    }

    // Save or update connection in ShopifyConnection entity
    const existing = await base44.asServiceRole.entities.ShopifyConnection.filter({ shop_domain: shop });
    const connectionData = {
      shop_domain: shop,
      access_token: tokenData.access_token,
      scopes: tokenData.scope || "",
      installed_by: user.email,
      connected_at: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.ShopifyConnection.update(existing[0].id, connectionData);
    } else {
      await base44.asServiceRole.entities.ShopifyConnection.create(connectionData);
    }

    return Response.json({ success: true, shop, scopes: tokenData.scope });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});