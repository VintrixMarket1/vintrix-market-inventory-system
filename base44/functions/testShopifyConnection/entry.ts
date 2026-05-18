import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getValidToken() {
  const legacyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  const expiresAt = Deno.env.get("SHOPIFY_ACCESS_TOKEN_EXPIRES_AT");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");

  // Mode A: Legacy permanent token (starts with shpat_)
  if (legacyToken && legacyToken.startsWith("shpat_")) {
    return { accessToken: legacyToken, authMode: "legacy" };
  }

  // Mode B: Client credentials token (check expiry)
  if (legacyToken && expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return { accessToken: legacyToken, authMode: "client_credentials" };
    }
  }

  // Refresh via client credentials
  if (clientId && clientSecret && shopDomain) {
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      return { accessToken: data.access_token, authMode: "client_credentials" };
    }
    throw new Error(`Token refresh failed: ${data.error_description || data.error || "Unknown error"}`);
  }

  throw new Error("No valid Shopify credentials. Set SHOPIFY_ACCESS_TOKEN (legacy) or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET in Base44 secrets.");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2026-04";

    if (!shopDomain) {
      return Response.json({ error: "Missing SHOPIFY_SHOP_DOMAIN secret" }, { status: 400 });
    }

    const { accessToken, authMode } = await getValidToken();

    const query = `query { shop { name myshopifyDomain plan { displayName } } }`;

    const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) return Response.json({ error: "Invalid access token. Regenerate using Client ID + Client Secret." }, { status: 401 });
      if (res.status === 403) return Response.json({ error: "Missing required Shopify access scopes. Check app permissions in Shopify Dev Dashboard." }, { status: 403 });
      return Response.json({ error: `Shopify API request failed: ${res.status}` }, { status: res.status });
    }

    if (data.errors) {
      return Response.json({ error: data.errors[0]?.message || "GraphQL error" }, { status: 400 });
    }

    const shop = data.data?.shop;
    return Response.json({
      success: true,
      connected: true,
      auth_mode: authMode,
      shop_name: shop?.name,
      shop_domain: shop?.myshopifyDomain,
      plan: shop?.plan?.displayName,
      api_version: apiVersion,
      tested_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, connected: false }, { status: 500 });
  }
});