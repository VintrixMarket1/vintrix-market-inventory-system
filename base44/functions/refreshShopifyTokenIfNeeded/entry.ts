import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns { accessToken, needsRefresh, authMode } or throws
export async function getValidShopifyToken() {
  const legacyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  const expiresAt = Deno.env.get("SHOPIFY_ACCESS_TOKEN_EXPIRES_AT");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");

  // Mode A: Legacy permanent token
  if (legacyToken && legacyToken.startsWith("shpat_")) {
    return { accessToken: legacyToken, needsRefresh: false, authMode: "legacy" };
  }

  // Mode B: Check expiry
  if (legacyToken && expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (expiry - now > fiveMinutes) {
      return { accessToken: legacyToken, needsRefresh: false, authMode: "client_credentials" };
    }
  }

  // Need new token
  if (!clientId || !clientSecret || !shopDomain) {
    throw new Error("Missing Shopify credentials. Set SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_SHOP_DOMAIN in Base44 secrets.");
  }

  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    needsRefresh: true,
    authMode: "client_credentials",
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
  };
}

// Also expose as callable backend function
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const result = await getValidShopifyToken();
    return Response.json({
      success: true,
      auth_mode: result.authMode,
      needs_refresh: result.needsRefresh,
      expires_at: result.expiresAt || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});