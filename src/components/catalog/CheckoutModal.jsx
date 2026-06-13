import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Package, Truck, MapPin, Store, Loader2, ShoppingCart, ChevronRight } from "lucide-react";

const SHIPPING_OPTIONS = [
  {
    id: "personal",
    label: "Odbiór osobisty",
    description: "Odbierz zamówienie osobiście w naszym magazynie",
    price: 0,
    icon: Store,
  },
  {
    id: "paczkomat",
    label: "Paczkomat InPost",
    description: "Dostawa do wybranego paczkomatu",
    price: 9.99,
    icon: Package,
  },
  {
    id: "kurier",
    label: "Kurier do domu",
    description: "Dostawa pod wskazany adres",
    price: 15.99,
    icon: Truck,
  },
];

export default function CheckoutModal({ offer, onClose }) {
  const [step, setStep] = useState("form"); // "form" | "summary"
  const [shippingOption, setShippingOption] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    paczkomatId: "",
    invoiceNip: "",
    invoiceCompany: "",
  });

  const acceptedPrice =
    offer.status === "customer_accepted" ? offer.counter_price : offer.offered_price;

  const selectedShipping = SHIPPING_OPTIONS.find((o) => o.id === shippingOption);
  const totalPrice = acceptedPrice + selectedShipping.price;

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const isFormValid = () => {
    if (!form.fullName || !form.email) return false;
    if (shippingOption === "kurier" && (!form.street || !form.city || !form.postalCode)) return false;
    if (shippingOption === "paczkomat" && !form.paczkomatId) return false;
    return true;
  };

  const handleCheckout = async () => {
    // Check if running in iframe (Base44 preview)
    if (window.self !== window.top) {
      alert("Płatność działa tylko w opublikowanej aplikacji, nie w podglądzie.");
      return;
    }

    setLoading(true);
    setError("");

    // For direct Buy Now offers (id starts with "direct_"), pass productId separately
    const isDirect = offer.id?.startsWith("direct_");
    const payload = isDirect
      ? { directProductId: offer.product_id, directPrice: offer.offered_price, shippingOption, customerData: form }
      : { offerId: offer.id, shippingOption, customerData: form };

    const response = await base44.functions.invoke("createCheckoutSession", payload);

    if (response.data?.url) {
      window.location.href = response.data.url;
    } else {
      setError(response.data?.error || "Wystąpił błąd. Spróbuj ponownie.");
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
            <h2 className="font-bold text-slate-900">Finalizacja zamówienia</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Zaakceptowana oferta</p>
            <p className="font-bold text-slate-900">{offer.product_name}</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{acceptedPrice} PLN</p>
          </div>

          {/* Contact data */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Dane kontaktowe</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Imię i nazwisko *</Label>
                <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jan Kowalski" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jan@example.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefon</Label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+48 600 000 000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">NIP (opcjonalnie)</Label>
                  <Input name="invoiceNip" value={form.invoiceNip} onChange={handleChange} placeholder="000-000-00-00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Firma (opcjonalnie)</Label>
                  <Input name="invoiceCompany" value={form.invoiceCompany} onChange={handleChange} placeholder="Nazwa firmy" />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Sposób dostawy</h3>
            <div className="space-y-2">
              {SHIPPING_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setShippingOption(opt.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      shippingOption === opt.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
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
                        <span className="text-emerald-600">Bezpłatne</span>
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
                <MapPin className="w-4 h-4 text-slate-500" /> Adres dostawy
              </h3>
              <div className="space-y-1">
                <Label className="text-xs">Ulica i numer *</Label>
                <Input name="street" value={form.street} onChange={handleChange} placeholder="ul. Przykładowa 1/2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kod pocztowy *</Label>
                  <Input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="00-000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Miasto *</Label>
                  <Input name="city" value={form.city} onChange={handleChange} placeholder="Warszawa" />
                </div>
              </div>
            </div>
          )}

          {shippingOption === "paczkomat" && (
            <div className="space-y-1 bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
                <Package className="w-4 h-4 text-slate-500" /> Paczkomat
              </h3>
              <Label className="text-xs">Numer/ID paczkomatu *</Label>
              <Input name="paczkomatId" value={form.paczkomatId} onChange={handleChange} placeholder="np. WAW123M" />
              <p className="text-xs text-slate-400 mt-1">Wpisz kod paczkomatu InPost (np. WAW123M)</p>
            </div>
          )}

          {/* Order total */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Produkt</span>
              <span className="font-semibold">{acceptedPrice.toFixed(2)} PLN</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Dostawa ({selectedShipping.label})</span>
              <span className="font-semibold">
                {selectedShipping.price === 0 ? "Bezpłatna" : `${selectedShipping.price.toFixed(2)} PLN`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-200">
              <span>Razem</span>
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
              <><Loader2 className="w-4 h-4 animate-spin" /> Przekierowuję do płatności...</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Zapłać {totalPrice.toFixed(2)} PLN <ChevronRight className="w-4 h-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-slate-400">
            Płatność obsługiwana przez Stripe. Akceptujemy karty, BLIK, Przelewy24.
          </p>
        </div>
      </div>
    </div>
  );
}