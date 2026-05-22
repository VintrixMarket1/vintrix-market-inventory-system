import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== "create") return Response.json({ skipped: true });

    const sale = data;
    if (!sale?.id) return Response.json({ skipped: true, reason: "no sale data" });

    // Get all enabled settings records that have an access_token stored
    const allSettings = await base44.asServiceRole.entities.GoogleSheetsSettings.list();
    const enabledSettings = allSettings.filter(s => s.enabled && s.spreadsheet_id && s.access_token);

    if (enabledSettings.length === 0) {
      console.log("No enabled Google Sheets settings with access token found.");
      return Response.json({ skipped: true, reason: "no settings configured" });
    }

    const results = [];

    for (const settings of enabledSettings) {
      try {
        const accessToken = settings.access_token;
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
        const ok = appendRes.ok;
        console.log(`Settings ${settings.id}: ok=${ok}`, appendData.error?.message || "");
        results.push({ settings_id: settings.id, ok, detail: appendData.error?.message });
      } catch (e) {
        console.error(`Settings ${settings.id} error:`, e.message);
        results.push({ settings_id: settings.id, ok: false, detail: e.message });
      }
    }

    return Response.json({ synced: results.length, results });
  } catch (error) {
    console.error("onNewSaleSyncSheets error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});