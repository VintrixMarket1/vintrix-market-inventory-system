import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOMAIN = Deno.env.get("SHOPIFY_STORE_DOMAIN");
const TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`https://${DOMAIN}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": TOKEN }
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ connected: false, status: res.status, error: data.errors || data }, { status: 200 });

    return Response.json({ connected: true, shop_name: data.shop?.name, shop_domain: data.shop?.domain, currency: data.shop?.currency });
  } catch (error) {
    return Response.json({ connected: false, error: error.message }, { status: 500 });
  }
});