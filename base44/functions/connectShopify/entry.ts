import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { shop_domain, client_id, client_secret, api_version, legacy_token } = await req.json();

    // Validate shop domain
    if (!shop_domain) return Response.json({ error: "Missing Shopify store domain" }, { status: 400 });
    const cleanDomain = shop_domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanDomain.endsWith('.myshopify.com')) {
      return Response.json({ error: "Invalid shop domain. Must end with .myshopify.com" }, { status: 400 });
    }

    // Validate credentials
    if (!legacy_token && (!client_id || !client_secret)) {
      return Response.json({ error: "Provide either Client ID + Client Secret (Mode B) or a legacy Admin API token (Mode A)" }, { status: 400 });
    }

    // Store config via service role
    const configData = {
      shop_domain: cleanDomain,
      api_version: api_version || "2026-04",
      auth_mode: legacy_token ? "legacy" : "client_credentials",
      configured_at: new Date().toISOString(),
    };

    // Save to a ShopifyConfig entity or just return success
    // Secrets themselves must be set via Base44 Dashboard — we just validate here
    return Response.json({
      success: true,
      shop_domain: cleanDomain,
      api_version: configData.api_version,
      auth_mode: configData.auth_mode,
      message: "Configuration validated. Please ensure secrets are set in Base44 Dashboard.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});