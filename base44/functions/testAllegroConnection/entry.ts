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

    const conn = connections[0];

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