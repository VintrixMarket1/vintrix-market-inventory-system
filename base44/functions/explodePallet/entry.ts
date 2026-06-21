import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generate doc numbers for multiple types in a single query
async function generateDocNumbers(base44, types) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const existing = await base44.asServiceRole.entities.WarehouseDocument.list("-created_date", 300);
  const maxByType = {};
  for (const doc of existing) {
    const num = doc.document_number || "";
    for (const type of types) {
      const prefix = `${type}/${year}/${month}/`;
      if (num.startsWith(prefix)) {
        const parts = num.split("/");
        const n = parseInt(parts[3]) || 0;
        if (n > (maxByType[type] || 0)) maxByType[type] = n;
      }
    }
  }
  const result = {};
  for (const type of types) {
    const nextNum = String((maxByType[type] || 0) + 1).padStart(3, "0");
    result[type] = `${type}/${year}/${month}/${nextNum}`;
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pallet_id, allocation_method, category_weights } = await req.json();
    if (!pallet_id) return Response.json({ error: 'pallet_id is required' }, { status: 400 });

    // 1. Fetch pallet
    const pallets = await base44.asServiceRole.entities.Pallet.filter({ id: pallet_id });
    if (!pallets || pallets.length === 0) return Response.json({ error: 'Pallet not found' }, { status: 404 });
    const pallet = pallets[0];

    if (pallet.status === 'exploded') return Response.json({ error: 'Paleta została już rozbita' }, { status: 400 });

    const totalValue = pallet.total_value || (pallet.total_cost + (pallet.additional_costs || 0));
    if (!totalValue || totalValue <= 0) return Response.json({ error: 'Paleta nie ma wartości do rozliczenia' }, { status: 400 });

    // 2. Fetch products for this pallet
    const products = await base44.asServiceRole.entities.Product.filter({ pallet_id });
    if (!products || products.length === 0) return Response.json({ error: 'Brak produktów przypisanych do palety' }, { status: 400 });

    // Validate — produkty bez żadnej nazwy są blokowane, ale "Nieznany produkt" jest dozwolony
    const unnamed = products.filter(p => !p.product_name || p.product_name.trim() === '');
    if (unnamed.length > 0) return Response.json({ error: `${unnamed.length} produktów nie ma nazwy. Uzupełnij przed rozbiciem.` }, { status: 400 });

    // 3. Calculate allocation
    const method = allocation_method || 'equal';
    let allocations = {}; // product_id -> purchase_price

    // Expand multi-item products to total units for equal distribution
    const totalUnits = products.reduce((sum, p) => sum + (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1), 0);

    if (method === 'equal') {
      // Equal distribution per unit
      const unitPrice = parseFloat((totalValue / totalUnits).toFixed(2));
      for (const p of products) {
        const units = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        allocations[p.id] = parseFloat((unitPrice * units).toFixed(2));
      }
    } else if (method === 'proportional') {
      // Proportional to suggested_sale_price
      const totalSalePrice = products.reduce((sum, p) => {
        const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        return sum + ((p.suggested_sale_price || 0) * qty);
      }, 0);
      if (totalSalePrice <= 0) return Response.json({ error: 'Brak cen sprzedaży do alokacji proporcjonalnej' }, { status: 400 });
      for (const p of products) {
        const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        const ratio = ((p.suggested_sale_price || 0) * qty) / totalSalePrice;
        allocations[p.id] = parseFloat((totalValue * ratio).toFixed(2));
      }
    } else if (method === 'category_weight') {
      // Weighted by category
      const defaultWeights = {
        electronics: 3, home: 2, sports: 2, clothing: 1.5,
        shoes: 1.5, accessories: 1, books: 0.5, toys: 1, other: 1
      };
      const weights = { ...defaultWeights, ...(category_weights || {}) };
      const weightedTotal = products.reduce((sum, p) => {
        const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        return sum + ((weights[p.category] || 1) * qty);
      }, 0);
      for (const p of products) {
        const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        const w = (weights[p.category] || 1) * qty;
        allocations[p.id] = parseFloat((totalValue * (w / weightedTotal)).toFixed(2));
      }
    }

    // Fix rounding difference — add/subtract from last product
    const allocatedTotal = Object.values(allocations).reduce((s, v) => s + v, 0);
    const diff = parseFloat((totalValue - allocatedTotal).toFixed(2));
    if (diff !== 0) {
      const lastProduct = products[products.length - 1];
      allocations[lastProduct.id] = parseFloat((allocations[lastProduct.id] + diff).toFixed(2));
    }

    // 4. Find existing PZ document
    const allDocs = await base44.asServiceRole.entities.WarehouseDocument.list("-created_date", 200);
    const pzDoc = allDocs.find(d => d.pallet_id === pallet_id && d.document_type === 'PZ');
    const pzNumber = pzDoc?.document_number || pallet.pallet_code;
    const today = new Date().toISOString().split('T')[0];

    // 5. Generate document numbers (single query for all three)
    const docNumbers = await generateDocNumbers(base44, ['RW', 'PW', 'DRP']);
    const rwNumber = docNumbers.RW;
    const pwNumber = docNumbers.PW;
    const drpNumber = docNumbers.DRP;

    // 6. Create RW — paleta schodzi ze stanu
    const rwDoc = await base44.asServiceRole.entities.WarehouseDocument.create({
      document_number: rwNumber,
      document_type: 'RW',
      date: today,
      status: 'confirmed',
      pallet_id,
      counterparty: 'Wewnętrzny — rozbicie palety',
      reference_number: pallet.pallet_code,
      related_pz_number: pzNumber,
      notes: `Rozbicie palety ${pallet.pallet_code} na produkty — dekompletacja`,
      created_by_name: user.full_name || user.email,
      items: [{
        product_id: '',
        product_name: `Paleta ${pallet.pallet_code}`,
        internal_code: pallet.pallet_code,
        quantity: 1,
        unit_price: totalValue,
        total_value: totalValue,
      }],
      total_value: totalValue,
    });

    // 7. Create PW — produkty wchodzą na stan
    const pwItems = products.map(p => {
      const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
      const unitPrice = parseFloat((allocations[p.id] / qty).toFixed(2));
      return {
        product_id: p.id,
        product_name: p.product_name,
        internal_code: p.internal_code || '',
        category: p.category || '',
        condition: p.condition || '',
        quantity: qty,
        unit_price: unitPrice,
        total_value: allocations[p.id],
      };
    });

    const pwDoc = await base44.asServiceRole.entities.WarehouseDocument.create({
      document_number: pwNumber,
      document_type: 'PW',
      date: today,
      status: 'confirmed',
      pallet_id,
      counterparty: 'Wewnętrzny — rozbicie palety',
      reference_number: pallet.pallet_code,
      related_pz_number: pzNumber,
      related_rw_number: rwNumber,
      allocation_method: method,
      notes: `Przyjęcie produktów z palety ${pallet.pallet_code}`,
      created_by_name: user.email || user.full_name,
      items: pwItems,
      total_value: totalValue,
    });

    // 8. Create DRP — Protokół Rozbicia Palety
    const drpDoc = await base44.asServiceRole.entities.WarehouseDocument.create({
      document_number: drpNumber,
      document_type: 'DRP',
      date: today,
      status: 'confirmed',
      pallet_id,
      counterparty: pallet.investor_name,
      reference_number: pallet.invoice_number || pallet.pallet_code,
      related_pz_number: pzNumber,
      related_rw_number: rwNumber,
      related_pw_number: pwNumber,
      allocation_method: method,
      notes: `Protokół rozbicia palety ${pallet.pallet_code}. Metoda alokacji: ${method}. Wartość palety: ${totalValue} PLN. Produkty: ${products.length} szt.`,
      created_by_name: user.email || user.full_name,
      items: pwItems,
      total_value: totalValue,
    });

    // 9. Update pallet status to exploded FIRST — prevents re-explosion on timeout retry
    await base44.asServiceRole.entities.Pallet.update(pallet_id, {
      status: 'exploded',
      product_count: products.length,
      calculated_unit_price: parseFloat((totalValue / totalUnits).toFixed(2)),
      allocation_method: method,
      pz_document_id: pzDoc?.id || '',
      rw_document_id: rwDoc.id,
      pw_document_id: pwDoc.id,
      drp_document_id: drpDoc.id,
      exploded_at: new Date().toISOString(),
      exploded_by: user.email || user.full_name,
      total_value: totalValue,
    });

    // 10. Update each product's purchase_price and status (in parallel batches of 20)
    const BATCH = 20;
    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      await Promise.all(batch.map(p => {
        const qty = p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1;
        const unitPrice = parseFloat((allocations[p.id] / qty).toFixed(2));
        return base44.asServiceRole.entities.Product.update(p.id, {
          purchase_price: unitPrice,
          status: 'in_stock',
        });
      }));
    }

    return Response.json({
      success: true,
      rw_number: rwNumber,
      pw_number: pwNumber,
      drp_number: drpNumber,
      product_count: products.length,
      total_value: totalValue,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});