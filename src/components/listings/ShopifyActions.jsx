import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, RefreshCw, ShoppingBag, CheckCircle, AlertCircle } from "lucide-react";

export default function ShopifyActions({ listing, product, onRefresh }) {
  const [loading, setLoading] = useState(null); // "publish" | "update" | "sold"
  const [result, setResult] = useState(null); // { type: "success"|"error", message: string }

  const hasShopifyId = !!product?.shopify_product_id;
  const isSold = listing?.listing_status === "sold";

  const run = async (action) => {
    setLoading(action);
    setResult(null);
    const fnMap = {
      publish: "publishToShopify",
      update: "updateShopifyListing",
      sold: "markShopifyAsSold",
    };
    const res = await base44.functions.invoke(fnMap[action], { listing_id: listing.id });
    if (res.data?.success) {
      setResult({ type: "success", message: action === "publish" ? "Opublikowano!" : action === "update" ? "Zaktualizowano!" : "Oznaczono jako sprzedane!" });
      onRefresh?.();
    } else {
      const errMsg = res.data?.error || "Nieznany błąd";
      setResult({ type: "error", message: errMsg });
    }
    setLoading(null);
  };

  if (isSold) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <ShoppingBag className="w-3.5 h-3.5" />
        Shopify
        {hasShopifyId && <span className="ml-auto text-emerald-600 font-normal normal-case">ID: {product.shopify_product_id}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!hasShopifyId ? (
          <Button
            size="sm"
            onClick={() => run("publish")}
            disabled={!!loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {loading === "publish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Publikuj na Shopify
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("update")}
              disabled={!!loading}
              className="gap-1.5"
            >
              {loading === "update" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Aktualizuj
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("sold")}
              disabled={!!loading}
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              {loading === "sold" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Oznacz jako sprzedane
            </Button>
          </>
        )}
      </div>
      {result && (
        <div className={`flex items-center gap-1.5 text-xs ${result.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
          {result.type === "success" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {result.message}
        </div>
      )}
    </div>
  );
}