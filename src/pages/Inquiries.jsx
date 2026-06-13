import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  new: { label: "Nowe", color: "bg-blue-100 text-blue-700", icon: Clock },
  replied: { label: "Odpowiedziano", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  closed: { label: "Zamknięte", color: "bg-slate-100 text-slate-600", icon: XCircle },
};

export default function Inquiries() {
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
    await base44.entities.ProductInquiry.update(inquiry.id, {
      admin_reply: replyText,
      status: "replied",
    });
    queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    setSaving(false);
    setReplyId(null);
    setReplyText("");
  };

  const handleClose = async (inquiry) => {
    await base44.entities.ProductInquiry.update(inquiry.id, { status: "closed" });
    queryClient.invalidateQueries({ queryKey: ["inquiries"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Zapytania klientów</h1>
        <p className="text-sm text-slate-500 mt-1">Zapytania o produkty z katalogu</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-20">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Brak zapytań od klientów</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inq => {
            const cfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
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
                    <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => handleClose(inq)}>
                      Zamknij
                    </Button>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                  {inq.message}
                </div>

                {inq.admin_reply && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Twoja odpowiedź:</p>
                    {inq.admin_reply}
                  </div>
                )}

                {inq.status !== "closed" && (
                  replyId === inq.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Napisz odpowiedź..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setReplyId(null); setReplyText(""); }}>Anuluj</Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || !replyText.trim()} onClick={() => handleReply(inq)}>
                          Wyślij odpowiedź
                        </Button>
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
      )}
    </div>
  );
}