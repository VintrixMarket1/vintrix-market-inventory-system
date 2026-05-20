import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: "code is required" }, { status: 400 });

    const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
    const clientSecret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
    const redirectUri = Deno.env.get("ALLEGRO_REDIRECT_URI");

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch("https://allegro.pl/auth/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return Response.json({ error: tokenData.error_description || "Token exchange failed" }, { status: 400 });

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const existing = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
    const connectionData = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      installed_by: user.email,
      connected_at: new Date().toISOString(),
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.AllegroConnection.update(existing[0].id, connectionData);
    } else {
      await base44.asServiceRole.entities.AllegroConnection.create(connectionData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});