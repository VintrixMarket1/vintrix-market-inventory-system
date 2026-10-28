import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from "base44:runtime";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const { redirect_uri } = await req.json().catch(() => ({}));
    const params = new URLSearchParams({
      client_id: secrets.get("OLX_CLIENT_ID"),
      response_type: "code",
      scope: "v2 read write",
      state: crypto.randomUUID(),
    });
    if (redirect_uri) params.set("redirect_uri", redirect_uri);
    return Response.json({ url: `https://www.olx.pl/oauth/authorize/?${params.toString()}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}