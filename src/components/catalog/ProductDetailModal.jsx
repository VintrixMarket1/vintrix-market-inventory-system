import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Package, ChevronLeft, ChevronRight, MessageCircle, X, CheckCircle, Loader2, Tag, Palette, Ruler, ShoppingBag, HandCoins, Heart, ZoomIn } from "lucide-react";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const GENDER_LABELS = { men: "Mężczyźni", women: "Kobiety", unisex: "Unisex", kids: "Dzieci" };

function FavoriteButton({ product, user }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: favorites = [] } = useQuery({
    queryKey: ["my_favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const existing = favorites.find(f => f.product_id === product.id);

  const toggle = async (e) => {
    e.stopPropagation();
    setLoading(true);
    if (existing) {
      await base44.entities.Favorite.delete(existing.id);
    } else {
      await base44.entities.Favorite.create({
        product_id: product.id,
        product_name: product.product_name,
        customer_name: user?.full_name || "",
        customer_email: user?.email || "",
      });
      await base44.entities.AdminNotification.create({
        type: "favorite",
        title: "Nowe polubienie produktu",
        message: `${user?.full_name || user?.email || "Klient"} dodał "${product.product_name}" do ulubionych.`,
        product_id: product.id,
        product_name: product.product_name,
        customer_name: user?.full_name || "",
        customer_email: user?.email || "",
        is_read: false,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["my_favorites"] });
    setLoading(false);
  };

  const isFav = !!existing;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`absolute top-3 left-3 z-10 rounded-full p-2 shadow-md border transition-all ${isFav ? "bg-red-500 border-red-500 text-white" : "bg-white/90 border-slate-200 text-slate-400 hover:text-red-500"}`}
      title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
    >
      <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
    </button>
  );
}

function ActionPanel({ product, user, onSendInquiry }) {
  const [mode, setMode] = useState(null);
  const [message, setMessage] = useState("");
  const [offeredPrice, setOfferedPrice] = useState(product.suggested_sale_price ? String(Math.round(product.suggested_sale_price * 0.9)) : "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = () => { setMode(null); setMessage(""); setSent(false); };

  const handleSendInquiry = async () => {
    if (!message.trim()) return;
    setSending(true);
    await onSendInquiry(product, message.trim());
    setSending(false);
    setSent(true);
    setTimeout(reset, 2500);
  };

  const handleSendOffer = async () => {
    if (!offeredPrice || isNaN(Number(offeredPrice))) return;
    setSending(true);
    await base44.entities.PurchaseOffer.create({
      product_id: product.id,
      product_name: product.product_name,
      offered_price: Number(offeredPrice),
      message: message.trim() || undefined,
      customer_name: user?.full_name || "",
      customer_email: user?.email || "",
      status: "new",
    });
    await base44.entities.AdminNotification.create({
      type: "new_offer",
      title: "Nowa oferta zakupu",
      message: `${user?.full_name || user?.email || "Klient"} złożył ofertę ${offeredPrice} PLN za "${product.product_name}".`,
      product_id: product.id,
      product_name: product.product_name,
      customer_name: user?.full_name || "",
      customer_email: user?.email || "",
      reference_id: product.id,
      is_read: false,
    });
    setSending(false);
    setSent(true);
    setTimeout(reset, 2500);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center py-4 gap-2">
        <CheckCircle className="w-9 h-9 text-emerald-500" />
        <p className="font-semibold text-slate-800 text-sm">{mode === "offer" ? "Oferta wysłana!" : "Zapytanie wysłane!"}</p>
        <p className="text-xs text-slate-500 text-center">Skontaktujemy się z Tobą wkrótce.</p>
      </div>
    );
  }

  if (mode === null) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-11 text-sm font-semibold gap-2 border-slate-300" onClick={() => setMode("inquiry")}>
          <MessageCircle className="w-4 h-4 text-slate-500" /> Zapytaj
        </Button>
        <Button className="flex-1 h-11 text-sm font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setMode("offer")}>
          <HandCoins className="w-4 h-4" /> Złóż ofertę
        </Button>
      </div>
    );
  }

  if (mode === "inquiry") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm text-slate-800">Zapytanie o produkt</span>
        </div>
        <Textarea placeholder="Napisz czego chcesz się dowiedzieć..." value={message} onChange={e => setMessage(e.target.value)} rows={3} className="text-sm resize-none" />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={reset}>Anuluj</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSendInquiry} disabled={sending || !message.trim()}>
            {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Wyślij
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <HandCoins className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold text-sm text-slate-800">Twoja oferta cenowa</span>
      </div>
      {product.suggested_sale_price && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center justify-between">
          <span>Cena wywoławcza</span>
          <span className="font-bold text-slate-700">{product.suggested_sale_price} PLN</span>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">Twoja cena (PLN)</Label>
        <div className="relative">
          <Input type="number" min={1} value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} className="pr-14 text-base font-bold" placeholder="np. 150" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">PLN</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Wiadomość (opcjonalnie)</Label>
        <Textarea placeholder="Dodaj wiadomość do swojej oferty..." value={message} onChange={e => setMessage(e.target.value)} rows={2} className="text-sm resize-none" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={reset}>Anuluj</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSendOffer} disabled={sending || !offeredPrice || isNaN(Number(offeredPrice)) || Number(offeredPrice) <= 0}>
          {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Wyślij ofertę
        </Button>
      </div>
    </div>
  );
}

// Standalone lightbox — no Radix involved, pure DOM portal
function ImageLightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef(null);

  const goPrev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const goNext = () => setCurrent(i => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    // capture=true so we get it before anything else
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
    touchStartX.current = null;
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 16, right: 16, zIndex: 10000, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
      >
        <X size={24} />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={goPrev}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10000, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={goNext}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10000, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image */}
      <img
        src={images[current]}
        alt=""
        style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain", borderRadius: 12 }}
      />

      {/* Dots */}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10000 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{ height: 8, width: i === current ? 24 : 8, background: i === current ? "white" : "rgba(255,255,255,0.35)", border: "none", borderRadius: 99, cursor: "pointer", padding: 0 }}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

// Simple custom modal — no Radix, no focus trap, no pointer-events overlay
export default function ProductDetailModal({ product, onClose, user, onSendInquiry }) {
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setActiveImg(0);
    setLightbox(false);
  }, [product?.id]);

  // Close on ESC only when lightbox is NOT open (lightbox handles its own ESC)
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !lightbox) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [product, lightbox, onClose]);

  if (!product) return null;

  const images = product.images?.filter(Boolean) || [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, pointerEvents: "none" }}
      >
        <div
          style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 768, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", pointerEvents: "auto", position: "relative" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 10, background: "rgba(255,255,255,0.9)", border: "1px solid #e2e8f0", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={16} color="#475569" />
          </button>

          <div style={{ display: "flex", flexDirection: "row", flex: 1, overflow: "hidden", minHeight: 0 }}>
            {/* Left: gallery */}
            <div style={{ width: "45%", background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
              {user && <FavoriteButton product={product} user={user} />}
              {images.length > 0 ? (
                <>
                  <div style={{ flex: 1, minHeight: 240, position: "relative" }}>
                    <img
                      src={images[activeImg]}
                      alt={product.product_name}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                      onClick={() => setLightbox(true)}
                    />
                    <button
                      onClick={() => setLightbox(true)}
                      style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                    >
                      <ZoomIn size={16} />
                    </button>
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
                          <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setActiveImg(i => (i + 1) % images.length)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div style={{ display: "flex", gap: 6, padding: 8, overflowX: "auto", background: "#1e293b" }}>
                      {images.map((url, i) => (
                        <button key={i} onClick={() => setActiveImg(i)} style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: `2px solid ${i === activeImg ? "#34d399" : "transparent"}`, opacity: i === activeImg ? 1 : 0.6, cursor: "pointer", padding: 0 }}>
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
                  <Package size={64} color="#475569" />
                </div>
              )}
            </div>

            {/* Right: details */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 24, flex: 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{getCategoryLabel(product.category)}</Badge>
                  {product.subcategory && <Badge variant="outline" className="text-xs">{product.subcategory}</Badge>}
                  {product.condition && <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{CONDITION_LABELS[product.condition] || product.condition}</Badge>}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, marginBottom: 4 }}>{product.product_name}</h2>
                {product.suggested_sale_price
                  ? <p style={{ fontSize: 24, fontWeight: 800, color: "#059669", margin: "4px 0 16px" }}>{product.suggested_sale_price} PLN</p>
                  : <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", margin: "4px 0 16px" }}>Cena na zapytanie</p>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {product.brand && (
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Marka</p>
                      <p style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{product.brand}</p>
                    </div>
                  )}
                  {product.size && (
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Rozmiar</p>
                      <p style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{product.size}</p>
                    </div>
                  )}
                  {product.color && (
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Kolor</p>
                      <p style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{product.color}</p>
                    </div>
                  )}
                  {product.gender && product.gender !== "none" && GENDER_LABELS[product.gender] && (
                    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Przeznaczenie</p>
                      <p style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{GENDER_LABELS[product.gender]}</p>
                    </div>
                  )}
                </div>

                {product.listing_description && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Opis</p>
                    <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, background: "#f8fafc", borderRadius: 12, padding: 16 }} dangerouslySetInnerHTML={{ __html: product.listing_description }} />
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", padding: 16, background: "white" }}>
                <ActionPanel product={product} user={user} onSendInquiry={onSendInquiry} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightbox && images.length > 0 && (
        <ImageLightbox images={images} startIndex={activeImg} onClose={() => setLightbox(false)} />
      )}
    </>,
    document.body
  );
}