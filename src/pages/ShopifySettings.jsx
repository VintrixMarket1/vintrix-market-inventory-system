import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Plug, ShoppingBag, ExternalLink, Info } from "lucide-react";

export default function ShopifySettings() {
  const [status, setStatus] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    handleTest(true);
  }, []);

  const handleTest = async (silent = false) => {
    if (!silent) setTesting(true);
    setLastError(null);
    try {
      const res = await base44.functions.invoke("testShopifyConnection", {});
      if (res.data?.connected) {
        setStatus("connected");
        setShopInfo(res.data);
      } else {
        setStatus("disconnected");
        if (!silent) setLastError(res.data?.error || "Brak połączenia z Shopify");
        setShopInfo(null);
      }
    } catch (err) {
      setStatus("disconnected");
      if (!silent) setLastError(err?.response?.data?.error || err.message || "Błąd testu połączenia");
    }
    setTesting(false);
    setLoadingStatus(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setLastError(null);
    try {
      const currentUrl = window.location.origin + "/ShopifyCallback";
      const res = await base44.functions.invoke("getShopifyAuthUrl", { redirect_uri: currentUrl });
      if (res.data?.auth_url) {
        window.location.href = res.data.auth_url;
      } else {
        setLastError(res.data?.error || "Nie udało się wygenerować URL autoryzacji");
        setConnecting(false);
      }
    } catch (err) {
      setLastError(err?.response?.data?.error || err.message || "Błąd inicjowania OAuth");
      setConnecting(false);
    }
  };

  const StatusBadge = () => {
    if (loadingStatus) return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Sprawdzanie...</Badge>;
    if (status === "connected") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1"><CheckCircle2 className="w-3 h-3" /> Połączono</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-300 gap-1"><XCircle className="w-3 h-3" /> Niepołączono</Badge>;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">Ustawienia Shopify</h1>
        </div>
        <StatusBadge />
      </div>

      {/* Connected state */}
      {status === "connected" && shopInfo && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5 space-y-2">
            <p className="text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Połączono z Shopify
            </p>
            <div className="text-sm text-emerald-700 space-y-1">
              <p>Sklep: <strong>{shopInfo.shop_name}</strong> ({shopInfo.shop_domain})</p>
              <p>Plan: {shopInfo.plan} | API: {shopInfo.api_version}</p>
              {shopInfo.scopes && <p>Zakresy: <span className="font-mono text-xs">{shopInfo.scopes}</span></p>}
              {shopInfo.connected_at && <p>Połączono: {new Date(shopInfo.connected_at).toLocaleString("pl-PL")}</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleTest(false)} disabled={testing} variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Odśwież status
              </Button>
              <Button onClick={handleConnect} disabled={connecting} variant="outline" size="sm">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plug className="w-4 h-4 mr-2" />}
                Ponownie autoryzuj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnected state */}
      {status === "disconnected" && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Połącz aplikację ze Shopify</CardTitle>
            <CardDescription>
              Kliknij poniżej, aby rozpocząć przepływ OAuth i autoryzować dostęp do sklepu Shopify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Upewnij się, że w sekretach Base44 masz ustawione: <strong>SHOPIFY_CLIENT_ID</strong>, <strong>SHOPIFY_CLIENT_SECRET</strong> i <strong>SHOPIFY_SHOP_DOMAIN</strong>.
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={connecting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Połącz ze Shopify (OAuth)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loadingStatus && (
        <Card className="border-slate-200">
          <CardContent className="pt-5 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Sprawdzanie statusu połączenia...</span>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {lastError && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">{lastError}</AlertDescription>
        </Alert>
      )}

      {/* Info box */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-4 text-sm text-slate-600 space-y-2">
          <p className="font-medium text-slate-700">Wymagane sekrety w Base44:</p>
          <ul className="list-disc list-inside space-y-1 font-mono text-xs">
            <li>SHOPIFY_CLIENT_ID</li>
            <li>SHOPIFY_CLIENT_SECRET</li>
            <li>SHOPIFY_SHOP_DOMAIN (np. moj-sklep.myshopify.com)</li>
            <li>SHOPIFY_API_VERSION (np. 2026-04)</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            Token dostępu jest przechowywany automatycznie po autoryzacji OAuth — nie musisz go kopiować ręcznie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}