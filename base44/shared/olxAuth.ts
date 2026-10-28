import { secrets } from "base44:runtime";

export const OLX_API = "https://www.olx.pl/api/partner";

export async function getOlxToken(base44) {
  const list = await base44.asServiceRole.entities.OlxConnection.list("-connected_at", 1);
  const conn = list?.[0];
  if (!conn) return null;
  const expires = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expires - Date.now() > 60000 || !conn.refresh_token) return conn.access_token;

  const res = await fetch("https://www.olx.pl/api/open/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: secrets.get("OLX_CLIENT_ID"),
      client_secret: secrets.get("OLX_CLIENT_SECRET"),
      refresh_token: conn.refresh_token,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) return null;
  await base44.asServiceRole.entities.OlxConnection.update(conn.id, {
    access_token: data.access_token,
    refresh_token: data.refresh_token || conn.refresh_token,
    token_expires_at: new Date(Date.now() + (data.expires_in || 0) * 1000).toISOString(),
  });
  return data.access_token;
}

export async function olxFetch(token, path, init = {}) {
  const res = await fetch(OLX_API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Version: "2.0", "Content-Type": "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}