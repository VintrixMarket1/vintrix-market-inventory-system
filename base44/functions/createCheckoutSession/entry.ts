import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { offerId, directProductId, directPrice, shippingOption, customerData, discountCode } = await req.json();

    if (!shippingOption || !customerData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    let basePrice;
    let productId;
    let productName;

    if (directProductId) {
      // Direct Buy Now flow
      const product = await base44.asServiceRole.entities.Product.get(directProductId);
      if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
      basePrice = directPrice || product.suggested_sale_price || product.purchase_price;
      productId = directProductId;
      productName = product.product_name;
    } else if (offerId) {
      // Offer-based flow
      const offer = await base44.asServiceRole.entities.PurchaseOffer.get(offerId);
      if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });
      const validStatuses = ['accepted', 'customer_accepted'];
      if (!validStatuses.includes(offer.status)) {
        return Response.json({ error: 'Offer is not in accepted state' }, { status: 400 });
      }
      basePrice = offer.status === 'customer_accepted' ? offer.counter_price : offer.offered_price;
      productId = offer.product_id;
      productName = offer.product_name;
    } else {
      return Response.json({ error: 'offerId or directProductId required' }, { status: 400 });
    }

    // --- Walidacja kodu rabatowego po stronie serwera (źródło prawdy) ---
    let discountAmount = 0;
    let discountRecord = null;
    if (discountCode) {
      const normalizedCode = String(discountCode).trim().toUpperCase();
      const records = await base44.asServiceRole.entities.DiscountCode.filter({ code: normalizedCode });
      const rec = records?.[0];
      const today = new Date().toISOString().split('T')[0];
      if (!rec || !rec.is_active) {
        return Response.json({ error: 'Invalid discount code' }, { status: 400 });
      }
      if (rec.expires_at && rec.expires_at < today) {
        return Response.json({ error: 'Discount code expired' }, { status: 400 });
      }
      if (rec.max_uses != null && (rec.used_count || 0) >= rec.max_uses) {
        return Response.json({ error: 'Discount code usage limit reached' }, { status: 400 });
      }
      if (rec.min_order_value != null && basePrice < rec.min_order_value) {
        return Response.json({ error: 'Order value below minimum for this code' }, { status: 400 });
      }
      const raw = rec.discount_type === 'percent' ? (basePrice * rec.value) / 100 : rec.value;
      discountAmount = Math.min(Math.round(raw * 100) / 100, Math.max(0, basePrice - 0.01));
      discountRecord = rec;
    }

    const lineItems = [
      {
        price_data: {
          currency: 'pln',
          product_data: {
            name: productName || 'Produkt',
            description: offerId ? `Oferta zakupu #${offerId.slice(0, 8)}` : 'Zakup bezpośredni',
          },
          unit_amount: Math.round((basePrice - discountAmount) * 100),
        },
        quantity: 1,
      },
    ];

    // Add shipping cost if needed
    if (shippingOption === 'paczkomat') {
      lineItems.push({
        price_data: {
          currency: 'pln',
          product_data: { name: 'Dostawa — Paczkomat InPost' },
          unit_amount: 999,
        },
        quantity: 1,
      });
    } else if (shippingOption === 'kurier') {
      lineItems.push({
        price_data: {
          currency: 'pln',
          product_data: { name: 'Dostawa — Kurier do domu' },
          unit_amount: 1599,
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}?checkout_success=true&offer_id=${offerId}`,
      cancel_url: `${origin}?checkout_cancelled=true`,
      customer_email: customerData.email || user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        offer_id: offerId || '',
        product_id: productId,
        discount_code: discountRecord?.code || '',
        discount_code_id: discountRecord?.id || '',
        discount_amount: String(discountAmount),
        base_price: String(basePrice),
        customer_name: customerData.fullName || '',
        shipping_option: shippingOption,
        shipping_address: shippingOption !== 'personal' ? JSON.stringify({
          street: customerData.street,
          city: customerData.city,
          postal_code: customerData.postalCode,
          paczkomat_id: customerData.paczkomatId || '',
        }) : 'Odbiór osobisty',
      },
    });

    console.log('Checkout session created:', session.id, 'for offer:', offerId);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});