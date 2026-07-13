import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { sale_id, refund_amount, reason } = await req.json();

    if (!sale_id || !refund_amount || refund_amount <= 0) {
      return Response.json({ error: 'Brak wymaganych parametrów lub nieprawidłowa kwota' }, { status: 400 });
    }

    const sales = await base44.asServiceRole.entities.Sale.filter({ id: sale_id });
    const sale = sales?.[0];
    if (!sale) return Response.json({ error: 'Sprzedaż nie znaleziona' }, { status: 404 });

    if (!sale.stripe_session_id) {
      return Response.json({ error: 'Ta sprzedaż nie ma powiązanej płatności Stripe' }, { status: 400 });
    }

    const alreadyRefunded = sale.refund_amount || 0;
    const maxRefundable = sale.sale_price - alreadyRefunded;
    if (refund_amount > maxRefundable) {
      return Response.json({ error: `Maksymalna kwota zwrotu to ${maxRefundable.toFixed(2)} PLN` }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.retrieve(sale.stripe_session_id);
    if (!session.payment_intent) {
      return Response.json({ error: 'Brak payment intent dla tej sesji' }, { status: 400 });
    }

    const refundAmountCents = Math.round(refund_amount * 100);

    const refund = await stripe.refunds.create({
      payment_intent: session.payment_intent,
      amount: refundAmountCents,
      metadata: {
        sale_id: sale_id,
        reason: reason || '',
        admin: user.email || '',
      },
    });

    const newTotalRefund = alreadyRefunded + refund_amount;
    const isFullRefund = newTotalRefund >= sale.sale_price;

    await base44.asServiceRole.entities.Sale.update(sale_id, {
      refund_amount: newTotalRefund,
      refund_reason: reason || sale.refund_reason || '',
      refund_date: new Date().toISOString().split('T')[0],
      refund_status: isFullRefund ? 'full' : 'partial',
    });

    console.log(`Refund processed: ${refund.id}, sale: ${sale_id}, amount: ${refund_amount} PLN, by: ${user.email}`);

    return Response.json({
      success: true,
      refund_id: refund.id,
      refund_amount: refund_amount,
      total_refunded: newTotalRefund,
      status: isFullRefund ? 'full' : 'partial',
    });
  } catch (error) {
    console.error('Partial refund error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});