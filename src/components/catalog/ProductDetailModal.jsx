import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, ChevronLeft, ChevronRight, MessageCircle, X, CheckCircle, Loader2, Tag, Palette, Ruler, ShoppingBag } from "lucide-react";
import { getCategoryLabel } from "@/lib/categoryConfig";

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const GENDER_LABELS = { men: "Mężczyźni", women: "Kobiety", unisex: "Unisex", kids: "Dzieci" };

export default function ProductDetailModal({ product, onClose, user, onSendInquiry }) {
  const [activeImg, setActiveImg] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!product) return null;

  const images = product.images?.filter(Boolean) || [];

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await onSendInquiry(product, message.trim());
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setShowInquiry(false);
      setMessage("");
      setSent(false);
    }, 2000);
  };

  const handleClose = () => {
    setShowInquiry(false);
    setMessage("");
    setSent(false);
    setActiveImg(0);
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={handleClose}>
      <DialogContent className="p-0 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col rounded-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md border border-slate-200 transition-all"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left: gallery */}
          <div className="md:w-[45%] bg-slate-900 flex flex-col shrink-0">
            {images.length > 0 ? (
              <>
                <div className="relative flex-1 min-h-[240px] md:min-h-0">
                  <img
                    src={images[activeImg]}
                    alt={product.product_name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1.5 text-white transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveImg(i => (i + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-1.5 text-white transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setActiveImg(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImg ? "bg-white w-4" : "bg-white/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-1.5 p-2 overflow-x-auto bg-slate-800">
                    {images.map((url, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeImg ? "border-emerald-400" : "border-transparent opacity-60 hover:opacity-90"}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
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
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-6 flex-1 space-y-5">
              {/* Title & price */}
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                    {getCategoryLabel(product.category)}
                  </Badge>
                  {product.subcategory && (
                    <Badge variant="outline" className="text-xs">{product.subcategory}</Badge>
                  )}
                  {product.condition && (
                    <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">
                      {CONDITION_LABELS[product.condition] || product.condition}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{product.product_name}</h2>
                {product.suggested_sale_price ? (
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{product.suggested_sale_price} PLN</p>
                ) : (
                  <p className="text-sm text-slate-400 mt-1 italic">Cena na zapytanie</p>
                )}
              </div>

              {/* Attributes */}
              <div className="grid grid-cols-2 gap-3">
                {product.brand && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                      <Tag className="w-3 h-3" /> Marka
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">{product.brand}</p>
                  </div>
                )}
                {product.size && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                      <Ruler className="w-3 h-3" /> Rozmiar
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">{product.size}</p>
                  </div>
                )}
                {product.color && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                      <Palette className="w-3 h-3" /> Kolor
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">{product.color}</p>
                  </div>
                )}
                {product.gender && product.gender !== "none" && GENDER_LABELS[product.gender] && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                      <ShoppingBag className="w-3 h-3" /> Przeznaczenie
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">{GENDER_LABELS[product.gender]}</p>
                  </div>
                )}
              </div>

              {/* Listing description */}
              {product.listing_description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Opis</p>
                  <div
                    className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none bg-slate-50 rounded-xl p-4"
                    dangerouslySetInnerHTML={{ __html: product.listing_description }}
                  />
                </div>
              )}
            </div>

            {/* Inquiry section pinned at bottom */}
            <div className="border-t border-slate-100 p-4 bg-white">
              {!showInquiry ? (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold gap-2"
                  onClick={() => setShowInquiry(true)}
                >
                  <MessageCircle className="w-4 h-4" />
                  Wyślij zapytanie o ten produkt
                </Button>
              ) : sent ? (
                <div className="flex flex-col items-center py-3 gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <p className="font-semibold text-slate-800 text-sm">Zapytanie wysłane!</p>
                  <p className="text-xs text-slate-500">Skontaktujemy się z Tobą wkrótce.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Twoja wiadomość</Label>
                  <Textarea
                    placeholder="Napisz czego chcesz się dowiedzieć — rozmiar, dostępność, możliwość rezerwacji..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowInquiry(false); setMessage(""); }}>
                      Anuluj
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                    >
                      {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Wyślij
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}