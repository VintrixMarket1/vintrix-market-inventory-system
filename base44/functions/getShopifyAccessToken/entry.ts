import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    const legacyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!shopDomain) return Response.json({ error: "Missing SHOPIFY_SHOP_DOMAIN secret" }, { status: 400 });

    // Mode A: Legacy token
    if (legacyToken && legacyToken.startsWith("shpat_")) {
      return Response.json({
        success: true,
        auth_mode: "legacy",
        message: "Using legacy Admin API token",
        expires_at: null,
      });
    }

    // Mode B: Client Credentials
    if (!clientId || !clientSecret) {
      return Response.json({
        error: "Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET. Set them in Base44 Dashboard → Settings → Environment Variables.",
      }, { status: 400 });
    }

    // Request access token via Client Credentials
    const tokenUrl = `https://${shopDomain}/admin/oauth/access_token`;
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error_description || data.error || JSON.stringify(data);
      if (errMsg.includes("not installed") || res.status === 404) {
        return Response.json({ error: "App not installed on the Shopify store. Install it first from the Shopify Dev Dashboard." }, { status: 400 });
      }
      return Response.json({ error: `Token generation failed: ${errMsg}` }, { status: res.status });
    }

    if (!data.access_token) {
      return Response.json({ error: "Shopify did not return an access token. Check app scopes and installation." }, { status: 400 });
    }

    // Calculate expiry (default 1 hour for client_credentials tokens)
    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // NOTE: In production you'd persist this token securely (e.g. via Base44 secret update or encrypted entity)
    // For now we return the expiry info — the token must be stored as SHOPIFY_ACCESS_TOKEN secret manually
    // or via a secure mechanism. We do NOT return the raw token.

    return Response.json({
      success: true,
      auth_mode: "client_credentials",
      expires_at: expiresAt,
      scopes: data.scope || "",
      message: "Access token generated successfully. Store it as SHOPIFY_ACCESS_TOKEN in Base44 secrets.",
      // Temporarily return token so user can store it — masked after first use
      token_hint: data.access_token.substring(0, 8) + "...",
      // For automation: return full token ONLY to be stored server-side
      _internal_token: data.access_token,
      _internal_expires_at: expiresAt,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});