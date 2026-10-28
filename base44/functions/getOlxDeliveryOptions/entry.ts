import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getOlxToken, olxFetch } from "../../shared/olxAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const token = await getOlxToken(base44);
    if (!token) return Response.json({ error: "not_connected" }, { status: 409 });
    const res = await olxFetch(token, "/delivery/settings");
    const carriers = (res.body?.data?.shipping || []).map((s) => ({ id: s.id, title: s.title, sizes: s.parcel_options.map((o) => o.label) }));
    return Response.json({ carriers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}