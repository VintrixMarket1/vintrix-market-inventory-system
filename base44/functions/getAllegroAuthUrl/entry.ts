import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
    const redirectUri = Deno.env.get("ALLEGRO_REDIRECT_URI");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "allegro:api:profile:read allegro:api:offers:write allegro:api:offers:read allegro:api:orders:read allegro:api:sale:offers:read allegro:api:sale:offers:write",
    });

    const authUrl = `https://allegro.pl/auth/oauth/authorize?${params.toString()}`;
    return Response.json({ url: authUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});