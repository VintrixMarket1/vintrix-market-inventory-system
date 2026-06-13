import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { offerId, shippingOption, customerData } = await req.json();

    if (!offerId || !shippingOption || !customerData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const offer = await base44.asServiceRole.entities.PurchaseOffer.get(offerId);
    if (!offer) {
      return Response.json({ error: 'Offer not found' }, { status: 404 });
    }

    const validStatuses = ['accepted', 'customer_accepted'];
    if (!validStatuses.includes(offer.status)) {
      return Response.json({ error: 'Offer is not in accepted state' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Base product price from accepted offer
    const basePrice = offer.status === 'customer_accepted' ? offer.counter_price : offer.offered_price;

    const lineItems = [
      {
        price_data: {
          currency: 'pln',
          product_data: {
            name: offer.product_name || 'Produkt',
            description: `Oferta zakupu #${offerId.slice(0, 8)}`,
          },
          unit_amount: Math.round(basePrice * 100),
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
        offer_id: offerId,
        product_id: offer.product_id,
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