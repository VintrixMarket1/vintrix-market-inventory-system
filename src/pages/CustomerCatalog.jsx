import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Search, MessageCircle, Loader2, CheckCircle, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CONDITION_LABELS = { new: "Nowy", like_new: "Jak nowy", used: "Używany" };
const CATEGORY_LABELS = { clothing: "Odzież", shoes: "Obuwie", accessories: "Akcesoria", electronics: "Elektronika", home: "Dom", toys: "Zabawki", sports: "Sport", books: "Książki", other: "Inne" };

export default function CustomerCatalog() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["catalog_products"],
    queryFn: () => base44.entities.Product.filter({ status: "in_stock" }, "-created_date"),
  });

  const filtered = products.filter(p =>
    !search ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendInquiry = async () => {
    if (!message.trim()) return;
    setSending(true);
    await base44.entities.ProductInquiry.create({
      product_id: inquiryProduct.id,
      product_name: inquiryProduct.product_name,
      message: message.trim(),
      customer_name: user?.full_name || "",
      customer_email: user?.email || "",
      status: "new",
    });
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setInquiryProduct(null);
      setMessage("");
      setSent(false);
    }, 2000);
    toast({ title: "Zapytanie wysłane!", description: "Skontaktujemy się z Tobą wkrótce." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Vintrix Market</span>
            <span className="text-xs text-slate-400 hidden sm:block">— Katalog produktów</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">Cześć, <strong>{user?.full_name}</strong></span>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5 text-slate-500">
              <LogOut className="w-4 h-4" /> Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dostępne produkty</h1>
          <p className="text-sm text-slate-500 mt-1">Przeglądaj nasz asortyment i wysyłaj zapytania o interesujące Cię produkty.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Szukaj po nazwie, marce, kategorii..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Products grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Brak produktów w katalogu</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-semibold text-sm text-slate-900 line-clamp-2">{product.product_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {product.brand && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{product.brand}</span>}
                    <Badge variant="outline" className="text-[10px]">{CONDITION_LABELS[product.condition] || product.condition}</Badge>
                  </div>
                  {product.category && (
                    <p className="text-[10px] text-slate-400">{CATEGORY_LABELS[product.category] || product.category}{product.size ? ` · r. ${product.size}` : ""}</p>
                  )}
                  {product.suggested_sale_price && (
                    <p className="text-sm font-bold text-emerald-600">{product.suggested_sale_price} PLN</p>
                  )}
                  <Button
                    size="sm"
                    className="w-full text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { setInquiryProduct(product); setSent(false); setMessage(""); }}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" /> Zapytaj
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inquiry dialog */}
      <Dialog open={!!inquiryProduct} onOpenChange={() => setInquiryProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zapytaj o produkt</DialogTitle>
          </DialogHeader>
          {sent ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="font-semibold text-slate-900">Zapytanie wysłane!</p>
              <p className="text-sm text-slate-500 text-center">Skontaktujemy się z Tobą wkrótce.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-900">{inquiryProduct?.product_name}</p>
                {inquiryProduct?.suggested_sale_price && (
                  <p className="text-emerald-600 font-semibold mt-0.5">{inquiryProduct.suggested_sale_price} PLN</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Twoja wiadomość</Label>
                <Textarea
                  placeholder="Napisz czego chcesz się dowiedzieć — rozmiar, dostępność, możliwość rezerwacji..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setInquiryProduct(null)} className="flex-1">Anuluj</Button>
                <Button onClick={handleSendInquiry} disabled={sending || !message.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Wyślij zapytanie
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}