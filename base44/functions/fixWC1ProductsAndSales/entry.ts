import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WC1_PALLET_ID = '6a2df3c4252421efdb6597c8';
const CORRECT_PRICE = 6.16;

// Uruchom z offset żeby podzielić na partie
// offset=0 → produkty 0-49, offset=50 → 50-99 itd.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'products'; // 'products' or 'sales'
    const offset = body.offset || 0;
    const batchSize = 15;

    if (mode === 'products') {
      // Pobierz wszystkie produkty z WC1 z danym offsetem
      const allBatch = await base44.asServiceRole.entities.Product.filter({ pallet_id: WC1_PALLET_ID }, null, 500);
      const toFix = allBatch.filter(p => Math.abs((p.purchase_price || 0) - CORRECT_PRICE) > 0.01);
      const batch = toFix.slice(offset, offset + batchSize);

      console.log(`Total needing fix: ${toFix.length}, processing offset ${offset}, batch: ${batch.length}`);

      let fixed = 0;
      for (const p of batch) {
        await base44.asServiceRole.entities.Product.update(p.id, { purchase_price: CORRECT_PRICE });
        fixed++;
        await new Promise(r => setTimeout(r, 500));
      }

      return Response.json({
        success: true,
        mode: 'products',
        total_needing_fix: toFix.length,
        offset,
        batch_size: batch.length,
        fixed,
        has_more: offset + batchSize < toFix.length,
        next_offset: offset + batchSize
      });
    }

    if (mode === 'sales') {
      // Pobierz wszystkie produkty WC1 żeby mieć IDs
      const wc1Products = await base44.asServiceRole.entities.Product.filter({ pallet_id: WC1_PALLET_ID }, null, 500);
      const wc1Ids = new Set(wc1Products.map(p => p.id));

      const allSales = await base44.asServiceRole.entities.Sale.list('-sale_date', 500);
      const toFix = allSales.filter(s => wc1Ids.has(s.product_id) && Math.abs((s.purchase_price || 0) - CORRECT_PRICE) > 0.01);
      console.log(`Sales needing fix: ${toFix.length}`);

      let fixed = 0;
      for (const s of toFix) {
        await base44.asServiceRole.entities.Sale.update(s.id, { purchase_price: CORRECT_PRICE });
        fixed++;
        await new Promise(r => setTimeout(r, 500));
      }

      return Response.json({ success: true, mode: 'sales', fixed });
    }

    return Response.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    console.error(error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});