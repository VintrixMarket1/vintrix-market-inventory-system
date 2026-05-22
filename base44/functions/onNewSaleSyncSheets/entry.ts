import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "6a0fa2240a5480da2009fd07";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== "create") return Response.json({ skipped: true });

    const sale = data;
    if (!sale?.id) return Response.json({ skipped: true, reason: "no sale data" });

    // Get all users who have connected their Google Sheets account
    // We'll use service role to get the sale creator's settings
    const allSettings = await base44.asServiceRole.entities.GoogleSheetsSettings.list();
    if (!allSettings || allSettings.length === 0) {
      return Response.json({ skipped: true, reason: "no Google Sheets settings configured" });
    }

    const results = [];

    for (const settings of allSettings) {
      if (!settings.spreadsheet_id || !settings.enabled) continue;

      try {
        // Get the user's access token
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

        const targetSheet = settings.sheet_name || "Sprzedaż";
        const range = `${targetSheet}!A:A`;

        // Check header
        const checkRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheet_id}/values/${encodeURIComponent(targetSheet + "!A1:I1")}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const checkData = await checkRes.json();
        const hasHeader = checkData.values?.[0]?.[0] === "Data";

        const rowsToAppend = [];
        if (!hasHeader) {
          rowsToAppend.push(["Data", "Produkt", "Platforma", "Cena sprzedaży (PLN)", "Cena zakupu (PLN)", "Zysk (PLN)", "Marża (%)", "ID sprzedaży", "ID produktu"]);
        }

        const salePrice = parseFloat(sale.sale_price) || 0;
        const purchasePrice = parseFloat(sale.purchase_price) || 0;
        const profit = salePrice - purchasePrice;
        const margin = purchasePrice > 0 ? ((profit / purchasePrice) * 100).toFixed(2) : "";

        rowsToAppend.push([
          sale.sale_date || new Date().toISOString().split("T")[0],
          sale.product_name || "",
          sale.platform || "",
          salePrice.toFixed(2),
          purchasePrice.toFixed(2),
          profit.toFixed(2),
          margin,
          sale.id,
          sale.product_id || "",
        ]);

        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheet_id}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: rowsToAppend }),
          }
        );

        const appendData = await appendRes.json();
        results.push({ settings_id: settings.id, ok: appendRes.ok, detail: appendData.error?.message });
      } catch (e) {
        results.push({ settings_id: settings.id, ok: false, detail: e.message });
      }
    }

    return Response.json({ synced: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});