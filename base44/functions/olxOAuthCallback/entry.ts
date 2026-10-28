import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code, redirect_uri } = await req.json();
    if (!code) return Response.json({ error: "code is required" }, { status: 400 });

    const tokenRes = await fetch("https://www.olx.pl/api/open/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: Deno.env.get("OLX_CLIENT_ID"),
        client_secret: Deno.env.get("OLX_CLIENT_SECRET"),
        code,
        redirect_uri,
        scope: "v2 read write",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return Response.json({ error: tokenData.error_description || tokenData.error || "Token exchange failed" }, { status: 400 });

    const connectionData = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expires_in || 0) * 1000).toISOString(),
      installed_by: user.email,
      connected_at: new Date().toISOString(),
    };

    const existing = await base44.asServiceRole.entities.OlxConnection.list("-connected_at", 1);
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.OlxConnection.update(existing[0].id, connectionData);
    } else {
      await base44.asServiceRole.entities.OlxConnection.create(connectionData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});