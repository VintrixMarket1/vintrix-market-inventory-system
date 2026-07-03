import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Package, Truck, MapPin, Store, Loader2, ShoppingCart, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function CheckoutModal({ offer, onClose }) {
  const { t } = useLang();
  const [step, setStep] = useState("form");
  const [shippingOption, setShippingOption] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    street: "", city: "", postalCode: "",
    paczkomatId: "", invoiceNip: "", invoiceCompany: "",
  });

  const SHIPPING_OPTIONS = [
    { id: "personal", label: t("co_personal_pickup"), description: t("co_personal_pickup_desc"), price: 0, icon: Store },
    { id: "paczkomat", label: t("co_inpost"), description: t("co_inpost_desc"), price: 9.99, icon: Package },
    { id: "kurier", label: t("co_courier"), description: t("co_courier_desc"), price: 15.99, icon: Truck },
  ];

  const acceptedPrice = offer.status === "customer_accepted" ? offer.counter_price : offer.offered_price;
  const selectedShipping = SHIPPING_OPTIONS.find(o => o.id === shippingOption);
  const totalPrice = acceptedPrice + selectedShipping.price;

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const isFormValid = () => {
    if (!form.fullName || !form.email) return false;
    if (shippingOption === "kurier" && (!form.street || !form.city || !form.postalCode)) return false;
    if (shippingOption === "paczkomat" && !form.paczkomatId) return false;
    return true;
  };

  const handleCheckout = async () => {
    if (window.self !== window.top) {
      alert(t("co_iframe_error"));
      return;
    }
    setLoading(true);
    setError("");
    const isDirect = offer.id?.startsWith("direct_");
    const payload = isDirect
      ? { directProductId: offer.product_id, directPrice: offer.offered_price, shippingOption, customerData: form }
      : { offerId: offer.id, shippingOption, customerData: form };
    const response = await base44.functions.invoke("createCheckoutSession", payload);
    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      setError(response.data?.error || t("co_error"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">{t("co_title")}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">{t("co_accepted_offer")}</p>
            <p className="font-bold text-slate-900">{offer.product_name}</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{acceptedPrice} PLN</p>
          </div>

          {/* Contact data */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">{t("co_contact_data")}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("co_full_name")}</Label>
                <Input name="fullName" value={form.fullName} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_email")}</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_phone")}</Label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_nip")}</Label>
                  <Input name="invoiceNip" value={form.invoiceNip} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_company")}</Label>
                  <Input name="invoiceCompany" value={form.invoiceCompany} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">{t("co_shipping_method")}</h3>
            <div className="space-y-2">
              {SHIPPING_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setShippingOption(opt.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      shippingOption === opt.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${shippingOption === opt.id ? "bg-emerald-100" : "bg-slate-100"}`}>
                      <Icon className={`w-4 h-4 ${shippingOption === opt.id ? "text-emerald-600" : "text-slate-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.description}</p>
                    </div>
                    <div className="shrink-0 font-bold text-sm">
                      {opt.price === 0 ? (
                        <span className="text-emerald-600">{t("co_free")}</span>
                      ) : (
                        <span className="text-slate-700">{opt.price.toFixed(2)} PLN</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Address fields based on shipping choice */}
          {shippingOption === "kurier" && (
            <div className="space-y-3 bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> {t("co_delivery_address")}
              </h3>
              <div className="space-y-1">
                <Label className="text-xs">{t("co_street")}</Label>
                <Input name="street" value={form.street} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_postal_code")}</Label>
                  <Input name="postalCode" value={form.postalCode} onChange={handleChange} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("co_city")}</Label>
                  <Input name="city" value={form.city} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {shippingOption === "paczkomat" && (
            <div className="space-y-1 bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
                <Package className="w-4 h-4 text-slate-500" /> {t("co_parcel_locker")}
              </h3>
              <Label className="text-xs">{t("co_locker_id")}</Label>
              <Input name="paczkomatId" value={form.paczkomatId} onChange={handleChange} placeholder="WAW123M" />
              <p className="text-xs text-slate-400 mt-1">{t("co_locker_hint")}</p>
            </div>
          )}

          {/* Order total */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t("co_product")}</span>
              <span className="font-semibold">{acceptedPrice.toFixed(2)} PLN</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t("co_delivery")} ({selectedShipping.label})</span>
              <span className="font-semibold">
                {selectedShipping.price === 0 ? t("co_free_f") : `${selectedShipping.price.toFixed(2)} PLN`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-200">
              <span>{t("co_total")}</span>
              <span className="text-emerald-700">{totalPrice.toFixed(2)} PLN</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-base gap-2"
            disabled={!isFormValid() || loading}
            onClick={handleCheckout}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t("co_redirecting")}</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> {t("co_pay")} {totalPrice.toFixed(2)} PLN <ChevronRight className="w-4 h-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-slate-400">
            {t("co_stripe_note")}
          </p>
        </div>
      </div>
    </div>
  );
}