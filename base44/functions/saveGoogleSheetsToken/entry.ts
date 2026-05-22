import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "6a0fa2240a5480da2009fd07";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get the current user's OAuth token from the connector
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Save/update settings with the token
    const body = await req.json();
    const { spreadsheet_id, sheet_name, enabled, settings_id } = body;

    const payload = {
      user_email: user.email,
      access_token: accessToken,
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