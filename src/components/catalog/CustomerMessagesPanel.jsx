import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, HandCoins, Clock, CheckCircle, XCircle, ThumbsUp, ThumbsDown, ArrowLeftRight, ChevronRight, X, Loader2, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { useLang } from "@/lib/i18n";
import CheckoutModal from "./CheckoutModal";

function InquiryCard({ inquiry }) {
  const { t } = useLang();
  const statusCfg = {
    new: { label: t("status_pending"), color: "bg-blue-100 text-blue-700", icon: Clock },
    replied: { label: t("status_replied"), color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    closed: { label: t("status_closed"), color: "bg-slate-100 text-slate-600", icon: XCircle },
  };
  const cfg = statusCfg[inquiry.status] || statusCfg.new;
  const Icon = cfg.icon;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{inquiry.product_name || t("msg_product")}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{inquiry.created_date && format(new Date(inquiry.created_date), "dd.MM.yyyy HH:mm")}</p>
        </div>
        <Badge className={`text-[10px] shrink-0 ${cfg.color}`}>
          <Icon className="w-3 h-3 mr-1" />{cfg.label}
        </Badge>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("msg_your_inquiry")}</p>
        {inquiry.message}
      </div>
      {inquiry.admin_reply ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
          <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">{t("msg_seller_reply")}</p>
          {inquiry.admin_reply}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">{t("msg_waiting_reply")}</p>
      )}
    </div>
  );
}

function OfferCard({ offer, queryClient }) {
  const { t } = useLang();
  const [showReply, setShowReply] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const isNew = offer.status === "new";
  const isCountered = offer.status === "countered";
  const canRespond = isNew || isCountered;
  const isFinal = ["accepted", "rejected", "customer_countered", "customer_accepted", "customer_rejected"].includes(offer.status);
  const canCheckout = offer.status === "accepted" || offer.status === "customer_accepted";

  const statusCfg = {
    new: { label: t("status_pending"), color: "bg-blue-100 text-blue-700", icon: Clock },
    accepted: { label: t("status_accepted"), color: "bg-emerald-100 text-emerald-700", icon: ThumbsUp },
    rejected: { label: t("status_rejected_status"), color: "bg-red-100 text-red-700", icon: ThumbsDown },
    countered: { label: t("status_countered"), color: "bg-amber-100 text-amber-700", icon: ArrowLeftRight },
    customer_countered: { label: t("status_your_counter"), color: "bg-purple-100 text-purple-700", icon: ArrowLeftRight },
    customer_accepted: { label: t("status_you_accepted"), color: "bg-emerald-100 text-emerald-700", icon: ThumbsUp },
    customer_rejected: { label: t("status_you_rejected"), color: "bg-red-100 text-red-700", icon: ThumbsDown },
  };
  const cfg = statusCfg[offer.status] || statusCfg.new;
  const Icon = cfg.icon;

  const handleAction = async (action) => {
    setSaving(true);
    const patch = {};
    if (action === "accept") {
      patch.status = "customer_accepted";
    } else if (action === "reject") {
      patch.status = "customer_rejected";
    } else if (action === "counter") {
      if (!counterPrice || Number(counterPrice) <= 0) return;
      patch.status = "customer_countered";
      patch.offered_price = Number(counterPrice);
    }
    await base44.entities.PurchaseOffer.update(offer.id, patch);
    queryClient.invalidateQueries({ queryKey: ["my_offers"] });
    setSaving(false);
    setShowReply(false);
  };

  const renderReplyForm = (priceLabel) => (
    <div className="border-t pt-3 space-y-3">
      <p className="text-xs font-semibold text-slate-600">{priceLabel}</p>
      <div className="space-y-1">
        <Label className="text-xs">{t("msg_your_counter")}</Label>
        <div className="relative max-w-[160px]">
          <Input type="number" min={1} placeholder="0" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} className="pr-12" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">PLN</span>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowReply(false)}>{t("pd_cancel")}</Button>
        <Button size="sm" variant="destructive" disabled={saving} onClick={() => handleAction("reject")}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ThumbsDown className="w-3.5 h-3.5 mr-1" />} {t("msg_reject")}
        </Button>
        {counterPrice && Number(counterPrice) > 0 && (
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={saving} onClick={() => handleAction("counter")}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />} {t("msg_counter")}
          </Button>
        )}
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => handleAction("accept")}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ThumbsUp className="w-3.5 h-3.5 mr-1" />} {t("msg_accept")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{offer.product_name || t("msg_product")}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{offer.created_date && format(new Date(offer.created_date), "dd.MM.yyyy HH:mm")}</p>
        </div>
        <Badge className={`text-[10px] shrink-0 ${cfg.color}`}>
          <Icon className="w-3 h-3 mr-1" />{cfg.label}
        </Badge>
      </div>

      {/* Price flow */}
      <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t("msg_your_offer")}</p>
          <p className="text-lg font-extrabold text-slate-800">{offer.offered_price} PLN</p>
        </div>
        {offer.counter_price && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            <div className="text-right">
              <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-0.5">{t("msg_seller_counter")}</p>
              <p className="text-lg font-extrabold text-amber-600">{offer.counter_price} PLN</p>
            </div>
          </>
        )}
      </div>

      {offer.message && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{t("msg_your_message")}</p>
          {offer.message}
        </div>
      )}

      {offer.admin_reply && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">{t("msg_seller_message")}</p>
          {offer.admin_reply}
        </div>
      )}

      {/* Status messages */}
      {offer.status === "accepted" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">{t("msg_offer_accepted")}</div>
      )}
      {offer.status === "rejected" && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{t("msg_offer_rejected")}</div>}
      {offer.status === "customer_accepted" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">{t("msg_you_accepted")}</div>
      )}
      {offer.status === "customer_rejected" && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{t("msg_you_rejected")}</div>}
      {offer.status === "customer_countered" && <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">{t("msg_you_countered")}</div>}
      {offer.status === "new" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 italic">{t("msg_seller_offer_new")}</p>
          {showReply ? (
            renderReplyForm(`${t("msg_your_offer")} ${offer.offered_price} PLN:`)
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => setShowReply(true)}>
              <HandCoins className="w-3.5 h-3.5" /> {t("msg_respond_offer")}
            </Button>
          )}
        </div>
      )}

      {/* Checkout button for accepted offers */}
      {canCheckout && (
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
          onClick={() => setShowCheckout(true)}
        >
          <ShoppingCart className="w-4 h-4" /> {t("msg_finalize_pay")}
        </Button>
      )}

      {showCheckout && (
        <CheckoutModal offer={offer} onClose={() => setShowCheckout(false)} />
      )}

      {/* Customer can respond to countered offer */}
      {isCountered && !isFinal && (
        showReply ? (
          renderReplyForm(`${t("msg_seller_counter")}: ${offer.counter_price} PLN`)
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowReply(true)}>
            <ArrowLeftRight className="w-3.5 h-3.5" /> {t("msg_respond_counter")}
          </Button>
        )
      )}
    </div>
  );
}

export default function CustomerMessagesPanel({ user, onClose }) {
  const { t } = useLang();
  const [tab, setTab] = useState("inquiries");
  const queryClient = useQueryClient();

  const { data: inquiries = [], isLoading: loadingInq } = useQuery({
    queryKey: ["my_inquiries", user?.email],
    queryFn: () => base44.entities.ProductInquiry.filter({ customer_email: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const { data: allOffers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ["my_offers", user?.email],
    queryFn: () => base44.entities.PurchaseOffer.filter({ customer_email: user?.email }, "-created_date"),
    enabled: !!user?.email,
  });

  const offers = allOffers.filter(o => o.is_from_admin !== false);

  const newReplies = inquiries.filter(i => i.status === "replied").length;
  const pendingOffers = offers.filter(o => o.status === "countered" || o.status === "new").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end">
      <div className="w-full max-w-md h-full bg-slate-50 flex flex-col shadow-2xl">
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">{t("msg_title")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t("msg_subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setTab("inquiries")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${tab === "inquiries" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}
          >
            <MessageCircle className="w-4 h-4" />
            {t("msg_inquiries")}
            {newReplies > 0 && <span className="bg-emerald-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{newReplies}</span>}
          </button>
          <button
            onClick={() => setTab("offers")}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${tab === "offers" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}
          >
            <HandCoins className="w-4 h-4" />
            {t("msg_offers")}
            {pendingOffers > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{pendingOffers}</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === "inquiries" && (
            loadingInq
              ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
              : inquiries.length === 0
                ? <div className="text-center py-16"><MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400 text-sm">{t("msg_no_inquiries")}</p></div>
                : inquiries.map(inq => <InquiryCard key={inq.id} inquiry={inq} />)
          )}
          {tab === "offers" && (
            loadingOffers
              ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
              : offers.length === 0
                ? <div className="text-center py-16"><HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400 text-sm">{t("msg_no_offers")}</p></div>
                : offers.map(offer => <OfferCard key={offer.id} offer={offer} queryClient={queryClient} />)
          )}
        </div>
      </div>
    </div>
  );
}