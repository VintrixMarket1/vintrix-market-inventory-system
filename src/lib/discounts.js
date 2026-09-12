// Wspólne helpery cen promocyjnych i kodów rabatowych (karta produktu + kasa)

// Zwraca informacje o promocji produktu lub null, gdy promocja nieaktywna
export function getPromoInfo(product) {
  const regular = product?.regular_price;
  const price = product?.suggested_sale_price;
  if (!regular || !price || regular <= price) return null;
  if (product.promo_end_date) {
    const end = new Date(product.promo_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) return null;
  }
  return { regularPrice: regular, pct: Math.round((1 - price / regular) * 100) };
}

// Waliduje rekord kodu rabatowego dla danej ceny bazowej (klient — tylko do wyświetlenia;
// serwer ponawia walidację w createCheckoutSession)
export function evaluateDiscount(discount, basePrice) {
  if (!discount || !discount.is_active) return { ok: false, errorKey: "co_discount_invalid" };
  const today = new Date().toISOString().split("T")[0];
  if (discount.expires_at && discount.expires_at < today) return { ok: false, errorKey: "co_discount_expired" };
  if (discount.max_uses != null && (discount.used_count || 0) >= discount.max_uses) {
    return { ok: false, errorKey: "co_discount_limit" };
  }
  if (discount.min_order_value != null && basePrice < discount.min_order_value) {
    return { ok: false, errorKey: "co_discount_min", minValue: discount.min_order_value };
  }
  const raw = discount.discount_type === "percent" ? (basePrice * discount.value) / 100 : discount.value;
  const discountAmount = Math.min(Math.round(raw * 100) / 100, Math.max(0, basePrice));
  return { ok: true, discountAmount };
}