import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

/**
 * Stripe webhook handler — checkout.session.completed
 * Registers sale, updates product status to 'sold', creates WZ document.
 */
Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      return Response.json({ received: true });
    }

    const session = event.data.object;
    const metadata = session.metadata || {};

    const productId = metadata.product_id;
    const offerId = metadata.offer_id;
    const customerName = metadata.customer_name || '';
    const shippingOption = metadata.shipping_option || 'personal';

    if (!productId) {
      console.error('No product_id in session metadata');
      return Response.json({ received: true });
    }

    const base44 = createClientFromRequest(req);

    // Fetch product
    const product = await base44.asServiceRole.entities.Product.get(productId);
    if (!product) {
      console.error('Product not found:', productId);
      return Response.json({ received: true });
    }

    const salePrice = session.amount_total ? session.amount_total / 100 : 0;
    // Subtract shipping cost to get product-only price
    let shippingCost = 0;
    if (shippingOption === 'paczkomat') shippingCost = 9.99;
    else if (shippingOption === 'kurier') shippingCost = 15.99;
    const productSalePrice = Math.max(0, salePrice - shippingCost);

    const today = new Date().toISOString().split('T')[0];

    // --- Generate WZ document number ---
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `WZ/${year}/${month}/`;
    const existingDocs = await base44.asServiceRole.entities.WarehouseDocument.list('-created_date', 200);
    const thisMonthWZ = existingDocs.filter(d => d.document_number?.startsWith(prefix));
    let maxNum = 0;
    for (const doc of thisMonthWZ) {
      const parts = doc.document_number.split('/');
      const num = parseInt(parts[3]) || 0;
      if (num > maxNum) maxNum = num;
    }
    const wzNumber = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;

    // --- Find related PZ document number ---
    let relatedPzNumber = null;
    if (product.pallet_id) {
      try {
        const pallets = await base44.asServiceRole.entities.Pallet.filter({ id: product.pallet_id });
        const pallet = pallets?.[0];
        if (pallet?.pz_document_id) {
          const pzDocs = await base44.asServiceRole.entities.WarehouseDocument.filter({ id: pallet.pz_document_id });
          relatedPzNumber = pzDocs?.[0]?.document_number || null;
        }
      } catch (_) {}
    } else {
      try {
        const allPz = await base44.asServiceRole.entities.WarehouseDocument.filter({ document_type: 'PZ' });
        const match = allPz.find(d => d.items?.some(i => i.product_id === productId));
        relatedPzNumber = match?.document_number || null;
      } catch (_) {}
    }

    // --- Create WZ warehouse document ---
    const wzDoc = await base44.asServiceRole.entities.WarehouseDocument.create({
      document_number: wzNumber,
      document_type: 'WZ',
      date: today,
      status: 'confirmed',
      platform: 'internal',
      counterparty: customerName || session.customer_email || 'Klient sklepu internetowego',
      related_pz_number: relatedPzNumber || undefined,
      created_by_name: 'Aplikacja Internetowa',
      items: [
        {
          product_id: productId,
          product_name: product.product_name,
          internal_code: product.internal_code || '',
          category: product.category || '',
          condition: product.condition || '',
          quantity: 1,
          unit_price: product.purchase_price || 0,
          total_value: product.purchase_price || 0,
        },
      ],
      total_value: product.purchase_price || 0,
      notes: `Sprzedaż przez sklep internetowy. Stripe Session: ${session.id}. Dostawa: ${shippingOption}.`,
    });

    // --- Register Sale ---
    const sale = await base44.asServiceRole.entities.Sale.create({
      product_id: productId,
      platform: 'web_store',
      sale_price: productSalePrice,
      purchase_price: product.purchase_price || 0,
      sale_date: today,
      product_name: product.product_name,
      stripe_session_id: session.id,
      customer_name: customerName,
      customer_email: session.customer_email || '',
      shipping_option: shippingOption,
      wz_document_id: wzDoc.id,
      wz_document_number: wzNumber,
    });

    // --- Update product status to sold ---
    await base44.asServiceRole.entities.Product.update(productId, {
      status: 'sold',
    });

    // --- Mark offer as completed if applicable ---
    if (offerId) {
      await base44.asServiceRole.entities.PurchaseOffer.update(offerId, {
        status: 'accepted',
      });
    }

    // --- Notify admin about the sale ---
    await base44.asServiceRole.entities.AdminNotification.create({
      type: 'new_sale',
      title: 'Dokonano sprzedaży',
      message: `Sprzedano "${product.product_name}" za ${productSalePrice} PLN. Klient: ${customerName || session.customer_email || 'Anonim'}.`,
      product_id: productId,
      product_name: product.product_name,
      customer_name: customerName || session.customer_email || '',
      customer_email: session.customer_email || '',
      reference_id: sale.id,
      is_read: false,
    });

    console.log(`Sale registered: ${sale.id}, product: ${productId}, WZ: ${wzNumber}`);
    return Response.json({ received: true, sale_id: sale.id, wz: wzNumber });

  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});