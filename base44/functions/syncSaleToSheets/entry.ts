import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "6a0fa2240a5480da2009fd07";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { sale_id, spreadsheet_id, sheet_name } = body;

    if (!sale_id) return Response.json({ error: "sale_id is required" }, { status: 400 });
    if (!spreadsheet_id) return Response.json({ error: "spreadsheet_id is required" }, { status: 400 });

    // Get the app user's Google Sheets token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Fetch the sale
    const sales = await base44.asServiceRole.entities.Sale.filter({ id: sale_id });
    const sale = sales[0];
    if (!sale) return Response.json({ error: "Sale not found" }, { status: 404 });

    const targetSheet = sheet_name || "Sprzedaż";
    const range = `${targetSheet}!A:A`;

    // Check if header row exists
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(targetSheet + "!A1:I1")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const checkData = await checkRes.json();
    const hasHeader = checkData.values && checkData.values.length > 0 && checkData.values[0][0] === "Data";

    const rowsToAppend = [];

    // Add header if missing
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rowsToAppend }),
      }
    );

    const appendData = await appendRes.json();
    if (!appendRes.ok) {
      return Response.json({ error: `Błąd Google Sheets: ${appendData.error?.message || JSON.stringify(appendData)}` }, { status: 400 });
    }

    return Response.json({ success: true, updatedRows: rowsToAppend.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});