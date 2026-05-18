import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const accessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!shopDomain) {
      return Response.json({
        error: "Brak sekretu SHOPIFY_SHOP_DOMAIN. Ustaw domenę sklepu (np. vintrix-market.myshopify.com) w Base44 Dashboard → Settings → Environment Variables.",
        success: false,
      }, { status: 400 });
    }

    if (!accessToken) {
      return Response.json({
        error: "Brak SHOPIFY_ACCESS_TOKEN. Wejdź w Shopify Admin → Settings → Apps and sales channels → Develop apps → [Twoja aplikacja] → API credentials i skopiuj 'Admin API access token' (zaczyna się od shpat_). Następnie dodaj go jako sekret SHOPIFY_ACCESS_TOKEN w Base44 Dashboard → Settings → Environment Variables.",
        success: false,
        hint: "manual_setup_required",
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      auth_mode: accessToken.startsWith("shpat_") ? "legacy" : "token",
      message: "Token dostępu jest skonfigurowany.",
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});