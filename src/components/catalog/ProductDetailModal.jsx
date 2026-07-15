import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Package, ChevronLeft, ChevronRight, MessageCircle, X, CheckCircle, Loader2, HandCoins, Heart, ZoomIn } from "lucide-react";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { useLang } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function FavoriteButton({ product, user }) {
  const queryClient = useQueryClient();
  const { navigateToLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const { data: favorites = [] } = useQuery({
    queryKey: ["my_favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const existing = favorites.find(f => f.product_id === product.id);

  const toggle = async (e) => {
    e.stopPropagation();
    if (!user) { navigateToLogin(); return; }
    setLoading(true);
    if (existing) {
      await base44.entities.Favorite.delete(existing.id);
    } else {
      await base44.entities.Favorite.create({
        product_id: product.id, product_name: product.product_name,
        customer_name: user?.full_name || "", customer_email: user?.email || "",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["my_favorites"] });
    setLoading(false);
  };

  return (
    <button onClick={toggle} disabled={loading}
      className={`absolute top-3 left-3 z-10 rounded-full p-2 shadow-md border transition-all ${existing ? "bg-red-500 border-red-500 text-white" : "bg-white/90 border-slate-200 text-slate-400 hover:text-red-500"}`}>
      <Heart className={`w-4 h-4 ${existing ? "fill-current" : ""}`} />
    </button>
  );
}

function ActionPanel({ product, user, onSendInquiry }) {
  const { t } = useLang();
  const { navigateToLogin } = useAuth();
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
    setSending(false); setSent(true);
    setTimeout(reset, 2500);
  };

  const handleSendOffer = async () => {
    if (!offeredPrice || isNaN(Number(offeredPrice))) return;
    setSending(true);
    await base44.entities.PurchaseOffer.create({
      product_id: product.id, product_name: product.product_name,
      offered_price: Number(offeredPrice), message: message.trim() || undefined,
      customer_name: user?.full_name || "", customer_email: user?.email || "", status: "new",
    });
    setSending(false); setSent(true);
    setTimeout(reset, 2500);
  };

  if (sent) return (
    <div className="flex flex-col items-center py-4 gap-2">
      <CheckCircle className="w-9 h-9 text-emerald-500" />
      <p className="font-semibold text-slate-800 text-sm">{mode === "offer" ? t("pd_offer_sent") : t("cat_inquiry_sent")}</p>
      <p className="text-xs text-slate-500 text-center">{t("cat_contact_soon")}</p>
    </div>
  );

  if (mode === null) return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 h-11 text-sm font-semibold gap-2 border-slate-300" onClick={() => { if (!user) { navigateToLogin(); return; } setMode("inquiry"); }}>
        <MessageCircle className="w-4 h-4 text-slate-500" /> {t("pd_ask")}
      </Button>
      <Button className="flex-1 h-11 text-sm font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => { if (!user) { navigateToLogin(); return; } setMode("offer"); }}>
        <HandCoins className="w-4 h-4" /> {t("pd_make_offer")}
      </Button>
    </div>
  );

  if (mode === "inquiry") return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-slate-500" /><span className="font-semibold text-sm text-slate-800">{t("pd_product_inquiry")}</span></div>
      <Textarea placeholder={t("pd_inquiry_placeholder")} value={message} onChange={e => setMessage(e.target.value)} rows={3} className="text-sm resize-none" />
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={reset}>{t("pd_cancel")}</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSendInquiry} disabled={sending || !message.trim()}>
          {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t("pd_send")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><HandCoins className="w-4 h-4 text-emerald-600" /><span className="font-semibold text-sm text-slate-800">{t("pd_your_offer")}</span></div>
      {product.suggested_sale_price && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center justify-between">
          <span>{t("pd_asking_price")}</span><span className="font-bold text-slate-700">{product.suggested_sale_price} PLN</span>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">{t("pd_your_price")}</Label>
        <div className="relative">
          <Input type="number" min={1} value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} className="pr-14 text-base font-bold" placeholder="0" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">PLN</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("pd_message_optional")}</Label>
        <Textarea placeholder={t("pd_add_message")} value={message} onChange={e => setMessage(e.target.value)} rows={2} className="text-sm resize-none" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={reset}>{t("pd_cancel")}</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSendOffer} disabled={sending || !offeredPrice || isNaN(Number(offeredPrice)) || Number(offeredPrice) <= 0}>
          {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {t("pd_send_offer")}
        </Button>
      </div>
    </div>
  );
}

function ImageLightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef(null);

  const goPrev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const goNext = () => setCurrent(i => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
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
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center" style={{ zIndex: 9999 }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition touch-manipulation" style={{ zIndex: 10000 }}>
        <X className="w-6 h-6" />
      </button>
      {images.length > 1 && <>
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition touch-manipulation" style={{ zIndex: 10000 }}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-3 text-white transition touch-manipulation" style={{ zIndex: 10000 }}>
          <ChevronRight className="w-6 h-6" />
        </button>
      </>}
      <img src={images[current]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 10000 }}>
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all touch-manipulation ${i === current ? "bg-white w-6" : "bg-white/40 w-2"}`} />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

export default function ProductDetailModal({ product, onClose, user, onSendInquiry }) {
  const { t, lang } = useLang();
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const condLabels = { new: t("cond_new"), like_new: t("cond_like_new"), used: t("cond_used") };
  const genderLabels = { men: t("gender_men"), women: t("gender_women"), unisex: t("gender_unisex"), kids: t("gender_kids") };

  useEffect(() => {
    setActiveImg(0);
    setLightbox(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product || lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [product, lightbox, onClose]);

  if (!product) return null;

  const images = product.images?.filter(Boolean) || [];

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 500 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end md:items-center justify-center md:p-4" style={{ zIndex: 501, pointerEvents: "none" }}>
        <div className="bg-white md:rounded-2xl rounded-t-2xl w-full max-w-3xl h-[92vh] md:max-h-[92vh] md:h-auto overflow-hidden flex flex-col md:flex-row relative" style={{ pointerEvents: "auto" }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md border border-slate-200 transition-all">
            <X className="w-4 h-4 text-slate-600" />
          </button>

          {/* Left: gallery */}
          <div className="md:w-[45%] bg-slate-900 flex flex-col shrink-0 relative" style={{ flexBasis: "auto" }}>
            <FavoriteButton product={product} user={user} />
            {images.length > 0 ? (
              <>
                <div className="relative md:flex-1" style={{ height: "clamp(200px, 55vw, 320px)" }}>
                  <img src={images[activeImg]} alt={product.product_name}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    referrerPolicy="no-referrer"
                    onClick={() => setLightbox(true)} />
                  <button onClick={() => setLightbox(true)} className="absolute bottom-3 right-3 bg-black/40 hover:bg-black/60 rounded-full p-1.5 text-white transition">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {images.length > 1 && <>
                    <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1.5 text-white transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setActiveImg(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1.5 text-white transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-1.5 p-2 overflow-x-auto bg-slate-800">
                    {images.map((url, i) => (
                      <button key={i} onClick={() => setActiveImg(i)} className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeImg ? "border-emerald-400" : "border-transparent opacity-60 hover:opacity-90"}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[240px]">
                <Package className="w-16 h-16 text-slate-600" />
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <div className="p-6 flex-1 space-y-5">
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{getCategoryLabel(product.category, lang)}</Badge>
                  {product.subcategory && <Badge variant="outline" className="text-xs">{product.subcategory}</Badge>}
                  {product.condition && <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{condLabels[product.condition] || product.condition}</Badge>}
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.product_name}</h2>
                {product.suggested_sale_price
                  ? <p className="text-2xl font-extrabold text-emerald-600 mt-1">{product.suggested_sale_price} PLN</p>
                  : <p className="text-sm text-slate-400 mt-1 italic">{t("pd_price_on_request")}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {product.brand && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{t("pd_brand")}</p><p className="font-semibold text-slate-800 text-sm">{product.brand}</p></div>}
                {product.size && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{t("pd_size")}</p><p className="font-semibold text-slate-800 text-sm">{product.size}</p></div>}
                {product.color && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{t("pd_color")}</p><p className="font-semibold text-slate-800 text-sm">{product.color}</p></div>}
                {product.gender && product.gender !== "none" && genderLabels[product.gender] && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">{t("pd_gender")}</p><p className="font-semibold text-slate-800 text-sm">{genderLabels[product.gender]}</p></div>}
              </div>
              {product.listing_description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t("pd_description")}</p>
                  <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none bg-slate-50 rounded-xl p-4" dangerouslySetInnerHTML={{ __html: product.listing_description }} />
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 bg-white">
              <ActionPanel product={product} user={user} onSendInquiry={onSendInquiry} />
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