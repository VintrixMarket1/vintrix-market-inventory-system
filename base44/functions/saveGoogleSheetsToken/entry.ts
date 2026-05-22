import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { spreadsheet_id, sheet_name, enabled, settings_id, access_token } = body;

    if (!access_token) {
      return Response.json({ error: "Brak tokenu dostępowego. Połącz konto Google najpierw." }, { status: 400 });
    }

    const payload = {
      user_email: user.email,
      access_token,
      spreadsheet_id: spreadsheet_id || "",
      sheet_name: sheet_name || "Sprzedaż",
      enabled: enabled !== false,
    };

    let result;
    if (settings_id) {
      result = await base44.asServiceRole.entities.GoogleSheetsSettings.update(settings_id, payload);
    } else {
      result = await base44.asServiceRole.entities.GoogleSheetsSettings.create(payload);
    }

    return Response.json({ success: true, settings: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});