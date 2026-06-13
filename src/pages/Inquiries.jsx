import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageCircle, CheckCircle, Clock, XCircle, HandCoins, ThumbsUp, ThumbsDown, ArrowLeftRight, Heart, Package } from "lucide-react";
import { format } from "date-fns";

const INQUIRY_STATUS = {
  new: { label: "Nowe", color: "bg-blue-100 text-blue-700", icon: Clock },
  replied: { label: "Odpowiedziano", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  closed: { label: "Zamknięte", color: "bg-slate-100 text-slate-600", icon: XCircle },
};

const OFFER_STATUS = {
  new: { label: "Nowa", color: "bg-blue-100 text-blue-700", icon: Clock },
  accepted: { label: "Zaakceptowana", color: "bg-emerald-100 text-emerald-700", icon: ThumbsUp },
  rejected: { label: "Odrzucona", color: "bg-red-100 text-red-700", icon: ThumbsDown },
  countered: { label: "Kontroferta →", color: "bg-amber-100 text-amber-700", icon: ArrowLeftRight },
  customer_countered: { label: "Kontra klienta", color: "bg-purple-100 text-purple-700", icon: ArrowLeftRight },
  customer_accepted: { label: "Klient akceptuje", color: "bg-emerald-100 text-emerald-700", icon: ThumbsUp },
  customer_rejected: { label: "Klient odrzucił", color: "bg-red-100 text-red-700", icon: ThumbsDown },
};

function InquiriesTab() {
  const queryClient = useQueryClient();
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: () => base44.entities.ProductInquiry.list("-created_date"),
  });

  const handleReply = async (inquiry) => {
    setSaving(true);
    await base44.entities.ProductInquiry.update(inquiry.id, { admin_reply: replyText, status: "replied" });
    queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    setSaving(false);
    setReplyId(null);
    setReplyText("");
  };

  const handleClose = async (inquiry) => {
    await base44.entities.ProductInquiry.update(inquiry.id, { status: "closed" });
    queryClient.invalidateQueries({ queryKey: ["inquiries"] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;

  if (inquiries.length === 0) return (
    <div className="text-center py-20">
      <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-400">Brak zapytań od klientów</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {inquiries.map(inq => {
        const cfg = INQUIRY_STATUS[inq.status] || INQUIRY_STATUS.new;
        const Icon = cfg.icon;
        return (
          <div key={inq.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{inq.customer_name || "Klient"}</span>
                  {inq.customer_email && <span className="text-xs text-slate-400">{inq.customer_email}</span>}
                  <Badge className={`text-[10px] ${cfg.color}`}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Produkt: <span className="font-medium text-slate-600">{inq.product_name || "—"}</span>
                  {inq.created_date && <span className="ml-2">{format(new Date(inq.created_date), "dd.MM.yyyy HH:mm")}</span>}
                </p>
              </div>
              {inq.status !== "closed" && (
                <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => handleClose(inq)}>Zamknij</Button>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">{inq.message}</div>
            {inq.admin_reply && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                <p className="text-xs font-semibold text-emerald-600 mb-1">Twoja odpowiedź:</p>
                {inq.admin_reply}
              </div>
            )}
            {inq.status !== "closed" && (
              replyId === inq.id ? (
                <div className="space-y-2">
                  <Textarea placeholder="Napisz odpowiedź..." value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} autoFocus />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setReplyId(null); setReplyText(""); }}>Anuluj</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || !replyText.trim()} onClick={() => handleReply(inq)}>Wyślij odpowiedź</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setReplyId(inq.id); setReplyText(inq.admin_reply || ""); }}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  {inq.admin_reply ? "Edytuj odpowiedź" : "Odpowiedz"}
                </Button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

function OffersTab() {
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["purchase_offers"],
    queryFn: () => base44.entities.PurchaseOffer.list("-created_date"),
  });

  const updateOffer = async (offer, patch) => {
    setSaving(true);
    await base44.entities.PurchaseOffer.update(offer.id, patch);
    queryClient.invalidateQueries({ queryKey: ["purchase_offers"] });
    setSaving(false);
    setActionId(null);
    setCounterPrice("");
    setCounterMsg("");
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;

  if (offers.length === 0) return (
    <div className="text-center py-20">
      <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-400">Brak ofert zakupu od klientów</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {offers.map(offer => {
        const cfg = OFFER_STATUS[offer.status] || OFFER_STATUS.new;
        const Icon = cfg.icon;
        const isActive = offer.status === "new";
        return (
          <div key={offer.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{offer.customer_name || "Klient"}</span>
                  {offer.customer_email && <span className="text-xs text-slate-400">{offer.customer_email}</span>}
                  <Badge className={`text-[10px] ${cfg.color}`}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Produkt: <span className="font-medium text-slate-600">{offer.product_name || "—"}</span>
                  {offer.created_date && <span className="ml-2">{format(new Date(offer.created_date), "dd.MM.yyyy HH:mm")}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-emerald-600">{offer.offered_price} PLN</p>
                <p className="text-[10px] text-slate-400">Oferta klienta</p>
              </div>
            </div>

            {offer.message && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">{offer.message}</div>
            )}

            {offer.counter_price && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-xs font-semibold text-amber-600 mb-1">Twoja kontroferta: <span className="text-amber-700 font-bold">{offer.counter_price} PLN</span></p>
                {offer.admin_reply && <p className="text-amber-800">{offer.admin_reply}</p>}
              </div>
            )}

            {offer.status === "accepted" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                ✅ Oferta zaakceptowana{offer.admin_reply ? ` — ${offer.admin_reply}` : ""}
              </div>
            )}
            {offer.status === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                ❌ Oferta odrzucona{offer.admin_reply ? ` — ${offer.admin_reply}` : ""}
              </div>
            )}

            {isActive && (
              actionId === offer.id ? (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Kontroferta (PLN) — zostaw puste, aby nie proponować</p>
                    <div className="relative max-w-[160px]">
                      <Input type="number" min={1} placeholder="np. 180" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} className="pr-12" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">PLN</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Wiadomość (opcjonalna)</p>
                    <Textarea placeholder="Odpowiedź do klienta..." value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={2} className="text-sm resize-none" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setActionId(null)}>Anuluj</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => updateOffer(offer, { status: "rejected", admin_reply: counterMsg || undefined })}>
                      <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Odrzuć
                    </Button>
                    {counterPrice && Number(counterPrice) > 0 && (
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600" disabled={saving} onClick={() => updateOffer(offer, { status: "countered", counter_price: Number(counterPrice), admin_reply: counterMsg || undefined })}>
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Wyślij kontrofertę
                      </Button>
                    )}
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => updateOffer(offer, { status: "accepted", admin_reply: counterMsg || undefined })}>
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Akceptuj
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setActionId(offer.id)}>
                  <HandCoins className="w-3.5 h-3.5" /> Odpowiedz na ofertę
                </Button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

function FavoritesTab() {
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["admin_favorites"],
    queryFn: () => base44.entities.Favorite.list("-created_date"),
  });

  // Group by product
  const grouped = favorites.reduce((acc, fav) => {
    const key = fav.product_id;
    if (!acc[key]) acc[key] = { product_name: fav.product_name, product_id: fav.product_id, customers: [] };
    acc[key].customers.push({ name: fav.customer_name, email: fav.customer_email, date: fav.created_date });
    return acc;
  }, {});

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;

  if (favorites.length === 0) return (
    <div className="text-center py-20">
      <Heart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-400">Brak polubionych produktów</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {Object.values(grouped).map(group => (
        <div key={group.product_id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <p className="font-semibold text-slate-900">{group.product_name || "—"}</p>
            <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{group.customers.length} ❤️</span>
          </div>
          <div className="divide-y divide-slate-100">
            {group.customers.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{c.name || "Klient"}</span>
                  {c.email && <span className="ml-2 text-xs text-slate-400">{c.email}</span>}
                </div>
                {c.date && <span className="text-xs text-slate-400">{format(new Date(c.date), "dd.MM.yyyy HH:mm")}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Inquiries() {
  const [tab, setTab] = useState("inquiries");
  const queryClient = useQueryClient();

  const { data: inquiries = [] } = useQuery({ queryKey: ["inquiries"], queryFn: () => base44.entities.ProductInquiry.list("-created_date") });
  const { data: offers = [] } = useQuery({ queryKey: ["purchase_offers"], queryFn: () => base44.entities.PurchaseOffer.list("-created_date") });
  const { data: notifications = [] } = useQuery({ queryKey: ["admin_notifications_unread"], queryFn: () => base44.entities.AdminNotification.filter({ is_read: false }) });
  const { data: favorites = [] } = useQuery({ queryKey: ["admin_favorites"], queryFn: () => base44.entities.Favorite.list("-created_date") });

  useEffect(() => {
    if (notifications.length === 0) return;
    Promise.all(notifications.map(n => base44.entities.AdminNotification.update(n.id, { is_read: true }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ["admin_notifications_unread"] });
    });
  }, [notifications.length]);

  const newInquiries = inquiries.filter(i => i.status === "new").length;
  const newOffers = offers.filter(o => o.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wiadomości od klientów</h1>
        <p className="text-sm text-slate-500 mt-1">Zapytania, oferty zakupu i polubienia z katalogu</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab("inquiries")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "inquiries" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <MessageCircle className="w-4 h-4" />
          Zapytania
          {newInquiries > 0 && <span className="bg-blue-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{newInquiries}</span>}
        </button>
        <button
          onClick={() => setTab("offers")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "offers" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <HandCoins className="w-4 h-4" />
          Oferty zakupu
          {newOffers > 0 && <span className="bg-emerald-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{newOffers}</span>}
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${tab === "favorites" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          <Heart className="w-4 h-4" />
          Polubienia
          {favorites.length > 0 && <span className="bg-red-400 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{favorites.length}</span>}
        </button>
      </div>

      {tab === "inquiries" && <InquiriesTab />}
      {tab === "offers" && <OffersTab />}
      {tab === "favorites" && <FavoritesTab />}
    </div>
  );
}