import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const shopDomain = Deno.env.get("SHOPIFY_SHOP_DOMAIN") || Deno.env.get("SHOPIFY_STORE_DOMAIN");
    const accessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    const apiVersion = Deno.env.get("SHOPIFY_API_VERSION") || "2024-04";

    if (!shopDomain) {
      return Response.json({ error: "Brak sekretu SHOPIFY_SHOP_DOMAIN. Ustaw domenę sklepu (np. my-store.myshopify.com)." }, { status: 400 });
    }

    if (!accessToken) {
      return Response.json({ 
        error: "Brak SHOPIFY_ACCESS_TOKEN. Wejdź w Shopify Admin → Settings → Apps and sales channels → Develop apps → [Twoja aplikacja] → API credentials → skopiuj 'Admin API access token' (zaczyna się od shpat_).",
        connected: false,
        hint: "access_token_missing"
      }, { status: 400 });
    }

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

    if (res.status === 401) {
      return Response.json({ error: "Nieprawidłowy token dostępu (401). Sprawdź SHOPIFY_ACCESS_TOKEN w sekretach — musi zaczynać się od 'shpat_'.", connected: false }, { status: 401 });
    }
    if (res.status === 403) {
      return Response.json({ error: "Brak uprawnień (403). Sprawdź czy aplikacja Shopify ma włączone odpowiednie zakresy API (read_products, write_products).", connected: false }, { status: 403 });
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
      auth_mode: accessToken.startsWith("shpat_") ? "legacy" : "token",
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