import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const connections = await base44.asServiceRole.entities.AllegroConnection.list("-connected_at", 1);
    if (!connections || connections.length === 0 || !connections[0].access_token) {
      return Response.json({ connected: false, error: "Brak połączenia z Allegro" });
    }

    let conn = connections[0];

    // Refresh token if expired or about to expire (within 5 minutes)
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
    const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

    if (needsRefresh && conn.refresh_token) {
      const clientId = Deno.env.get("ALLEGRO_CLIENT_ID");
      const clientSecret = Deno.env.get("ALLEGRO_CLIENT_SECRET");
      const credentials = btoa(`${clientId}:${clientSecret}`);

      const refreshRes = await fetch("https://allegro.pl/auth/oauth/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        }),
      });

      if (refreshRes.ok) {
        const tokenData = await refreshRes.json();
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        const updated = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
        };
        await base44.asServiceRole.entities.AllegroConnection.update(conn.id, updated);
        conn = { ...conn, ...updated };
      } else {
        return Response.json({ connected: false, error: "Token wygasł i nie można go odświeżyć. Połącz ponownie." });
      }
    }

    const meRes = await fetch("https://api.allegro.pl/me", {
      headers: {
        "Authorization": `Bearer ${conn.access_token}`,
        "Accept": "application/vnd.allegro.public.v1+json",
      },
    });

    if (!meRes.ok) {
      return Response.json({ connected: false, error: "Token nieważny lub wygasł" });
    }

    const me = await meRes.json();
    return Response.json({
      connected: true,
      login: me.login,
      email: me.email,
      connected_at: conn.connected_at,
      token_expires_at: conn.token_expires_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});