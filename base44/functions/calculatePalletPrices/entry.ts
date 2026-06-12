import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pallet_id } = await req.json();
    if (!pallet_id) {
      return Response.json({ error: 'pallet_id is required' }, { status: 400 });
    }

    // Fetch pallet
    const pallets = await base44.asServiceRole.entities.Pallet.filter({ id: pallet_id });
    if (!pallets || pallets.length === 0) {
      return Response.json({ error: 'Pallet not found' }, { status: 404 });
    }
    const pallet = pallets[0];

    if (!pallet.total_cost || pallet.total_cost <= 0) {
      return Response.json({ error: 'Pallet has no valid total_cost' }, { status: 400 });
    }

    // Fetch all products assigned to this pallet
    const products = await base44.asServiceRole.entities.Product.filter({ pallet_id });

    if (!products || products.length === 0) {
      return Response.json({ error: 'No products found for this pallet' }, { status: 400 });
    }

    // Count total units: multi-item products use stock_quantity, others count as 1
    const totalUnits = products.reduce((sum, p) => {
      return sum + (p.is_multi_item && p.stock_quantity > 0 ? p.stock_quantity : 1);
    }, 0);

    const unitPrice = parseFloat((pallet.total_cost / totalUnits).toFixed(2));

    // Update each product's purchase_price sequentially to avoid rate limits
    for (const p of products) {
      await base44.asServiceRole.entities.Product.update(p.id, { purchase_price: unitPrice });
    }

    // Update pallet with calculated values and set status to processed
    await base44.asServiceRole.entities.Pallet.update(pallet_id, {
      product_count: products.length,
      calculated_unit_price: unitPrice,
      status: 'processed',
    });

    return Response.json({
      success: true,
      pallet_code: pallet.pallet_code,
      total_cost: pallet.total_cost,
      product_count: totalUnits,
      calculated_unit_price: unitPrice,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});