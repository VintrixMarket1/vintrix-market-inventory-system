import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { ActionPanel, ImageLightbox } from "@/components/catalog/ProductDetailModal";
import { Share2, ChevronLeft, ChevronRight, Package, ArrowLeft } from "lucide-react";

export default function ProductShare() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["shared_product", id],
    queryFn: () => base44.entities.Product.get(id),
    enabled: !!id,
  });

  const handleSendInquiry = async (product, message) => {
    await base44.entities.ProductInquiry.create({
      product_id: product.id, product_name: product.product_name,
      message, customer_name: user?.full_name || "", customer_email: user?.email || "", status: "new",
    });
    toast({ title: t("cat_inquiry_sent"), description: t("cat_contact_soon") });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("pd_share_copied") });
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-4">
        <Package className="w-16 h-16 text-stone-700" />
        <p className="text-stone-400 text-sm">{t("pd_product_not_found")}</p>
        <Link to="/" className="text-amber-400 text-sm hover:underline">{t("pd_back_to_catalog")}</Link>
      </div>
    );
  }

  const condLabels = { new: t("cond_new"), like_new: t("cond_like_new"), used: t("cond_used") };
  const genderLabels = { men: t("gender_men"), women: t("gender_women"), unisex: t("gender_unisex"), kids: t("gender_kids") };
  const images = product.images?.filter(Boolean) || [];
  const isSold = product.status === "sold";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-stone-950/90 backdrop-blur-xl border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-stone-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">{t("pd_back_to_catalog")}</span>
          </Link>
          <div className="text-lg font-black tracking-[0.15em] text-white uppercase">Vintrix</div>
          <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 transition text-sm">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t("pd_share")}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Gallery */}
          <div className="md:w-[45%] shrink-0">
            <div className="bg-stone-900 rounded-2xl overflow-hidden border border-stone-800 relative">
              {images.length > 0 ? (
                <>
                  <div className="relative aspect-[3/4] bg-stone-800">
                    <img src={images[activeImg]} alt={product.product_name}
                      className="w-full h-full object-cover cursor-zoom-in"
                      referrerPolicy="no-referrer"
                      onClick={() => setLightbox(true)} />
                    {images.length > 1 && <>
                      <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setActiveImg(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-1.5 p-2 overflow-x-auto">
                      {images.map((url, i) => (
                        <button key={i} onClick={() => setActiveImg(i)} className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeImg ? "border-amber-500" : "border-transparent opacity-60 hover:opacity-90"}`}>
                          <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center">
                  <Package className="w-16 h-16 text-stone-700" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-6 space-y-5">
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">{getCategoryLabel(product.category, lang)}</Badge>
                  {product.subcategory && <Badge variant="outline" className="text-xs border-stone-700 text-stone-400">{product.subcategory}</Badge>}
                  {product.condition && <Badge className="bg-stone-800 text-stone-300 border-0 text-xs">{condLabels[product.condition] || product.condition}</Badge>}
                  {isSold && <Badge className="bg-red-900/60 text-red-300 border-0 text-xs">{t("status_sold")}</Badge>}
                </div>
                <h1 className="text-2xl font-bold text-white leading-snug">{product.product_name}</h1>
                {product.suggested_sale_price
                  ? <p className="text-3xl font-extrabold text-amber-400 mt-2">{product.suggested_sale_price} <span className="text-base font-normal text-stone-500">PLN</span></p>
                  : <p className="text-sm text-stone-500 mt-2 italic">{t("pd_price_on_request")}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {product.brand && <div className="bg-stone-800 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">{t("pd_brand")}</p><p className="font-semibold text-stone-200 text-sm">{product.brand}</p></div>}
                {product.size && <div className="bg-stone-800 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">{t("pd_size")}</p><p className="font-semibold text-stone-200 text-sm">{product.size}</p></div>}
                {product.color && <div className="bg-stone-800 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">{t("pd_color")}</p><p className="font-semibold text-stone-200 text-sm">{product.color}</p></div>}
                {product.gender && product.gender !== "none" && genderLabels[product.gender] && <div className="bg-stone-800 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">{t("pd_gender")}</p><p className="font-semibold text-stone-200 text-sm">{genderLabels[product.gender]}</p></div>}
              </div>
              {product.listing_description && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t("pd_description")}</p>
                  <div className="text-sm text-stone-300 leading-relaxed bg-stone-800 rounded-xl p-4" dangerouslySetInnerHTML={{ __html: product.listing_description }} />
                </div>
              )}
            </div>

            {/* Action panel */}
            {!isSold && (
              <div className="bg-white rounded-2xl p-4 mt-4">
                <ActionPanel product={product} user={user} onSendInquiry={handleSendInquiry} />
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && images.length > 0 && (
        <ImageLightbox images={images} startIndex={activeImg} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}