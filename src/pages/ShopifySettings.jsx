import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Plug, Info, ShoppingBag } from "lucide-react";

export default function ShopifySettings() {
  const [domain, setDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiVersion, setApiVersion] = useState("2026-04");
  const [legacyToken, setLegacyToken] = useState("");

  const [status, setStatus] = useState(null); // null | 'connected' | 'error' | 'loading'
  const [shopInfo, setShopInfo] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [lastTested, setLastTested] = useState(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState(null);

  const [saving, setSaving] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [testing, setTesting] = useState(false);

  const [diagnostic, setDiagnostic] = useState(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setLastError(null);
    const res = await base44.functions.invoke("connectShopify", {
      shop_domain: domain,
      client_id: clientId,
      client_secret: clientSecret,
      api_version: apiVersion,
      legacy_token: legacyToken || undefined,
    });
    setSaving(false);
    if (res.data?.success) {
      setStatus("saved");
    } else {
      setLastError(res.data?.error || "Failed to save settings");
      setStatus("error");
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    setLastError(null);
    try {
      const res = await base44.functions.invoke("getShopifyAccessToken", {});
      if (res.data?.success) {
        setLastTokenRefresh(new Date().toISOString());
        setStatus("token_generated");
      } else {
        setLastError(res.data?.error || "Token generation failed");
        setStatus("error");
      }
    } catch (err) {
      setLastError(err?.response?.data?.error || err.message || "Błąd generowania tokenu");
      setStatus("error");
    }
    setGeneratingToken(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setLastError(null);
    setShopInfo(null);
    try {
      const res = await base44.functions.invoke("testShopifyConnection", {});
      if (res.data?.connected) {
        setStatus("connected");
        setShopInfo(res.data);
        setLastTested(res.data.tested_at || new Date().toISOString());
      } else {
        setLastError(res.data?.error || "Connection test failed");
        setStatus("error");
      }
    } catch (err) {
      setLastError(err?.response?.data?.error || err.message || "Nieznany błąd połączenia");
      setStatus("error");
    }
    setTesting(false);
  };

  const handleDiagnostic = async () => {
    setLoadingDiag(true);
    const res = await base44.functions.invoke("testShopifyConnection", {});
    setLoadingDiag(false);
    setDiagnostic(res.data);
  };

  const StatusBadge = () => {
    if (status === "connected") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1"><CheckCircle2 className="w-3 h-3" /> Połączono</Badge>;
    if (status === "error") return <Badge className="bg-red-100 text-red-700 border-red-300 gap-1"><XCircle className="w-3 h-3" /> Błąd</Badge>;
    if (status === "token_generated") return <Badge className="bg-blue-100 text-blue-700 border-blue-300 gap-1"><CheckCircle2 className="w-3 h-3" /> Token wygenerowany</Badge>;
    if (status === "saved") return <Badge className="bg-amber-100 text-amber-700 border-amber-300 gap-1"><AlertTriangle className="w-3 h-3" /> Zapisano — przetestuj połączenie</Badge>;
    return <Badge variant="outline" className="gap-1"><XCircle className="w-3 h-3" /> Niepołączono</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold">Ustawienia Shopify</h1>
        </div>
        <StatusBadge />
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <Info className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <strong>Aplikacje Shopify Dev Dashboard</strong> nie pokazują klasycznego tokenu Admin API. Jeśli widzisz tylko Client ID i Client Secret — ta aplikacja wygeneruje token dostępu automatycznie (tryb B — zalecany).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="modeB">
        <TabsList className="w-full">
          <TabsTrigger value="modeB" className="flex-1">Tryb B — Client ID + Secret (Zalecany)</TabsTrigger>
          <TabsTrigger value="modeA" className="flex-1">Tryb A — Legacy Admin API Token</TabsTrigger>
        </TabsList>

        <TabsContent value="modeB">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Konfiguracja przez Client ID i Client Secret</CardTitle>
              <CardDescription>Używaj tego trybu jeśli stworzyłeś aplikację w Shopify Dev Dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Domena sklepu Shopify *</Label>
                  <Input
                    placeholder="moj-sklep.myshopify.com"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Bez https://, tylko domena np. vintrix-market.myshopify.com</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Client ID *</Label>
                  <Input placeholder="Client ID z Dev Dashboard" value={clientId} onChange={e => setClientId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret *</Label>
                  <Input type="password" placeholder="Client Secret (zamaskowany)" value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Wersja API Shopify</Label>
                  <Input placeholder="2026-04" value={apiVersion} onChange={e => setApiVersion(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !domain} className="bg-slate-800 hover:bg-slate-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Zapisz ustawienia
                </Button>
                <Button onClick={handleGenerateToken} disabled={generatingToken} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                  {generatingToken ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Wygeneruj / Odśwież token
                </Button>
                <Button onClick={handleTest} disabled={testing} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plug className="w-4 h-4 mr-2" />}
                  Testuj połączenie
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-slate-700">Wymagane zakresy dostępu Shopify (ustaw w Dev Dashboard → App scopes):</p>
                <p className="font-mono">read_products, write_products, read_inventory, write_inventory, read_locations, read_orders</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modeA">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legacy Admin API Token</CardTitle>
              <CardDescription>Jeśli masz klasyczny token zaczynający się od shpat_ (dostępny tylko w starszych aplikacjach).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Domena sklepu Shopify *</Label>
                <Input placeholder="moj-sklep.myshopify.com" value={domain} onChange={e => setDomain(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Admin API Access Token (shpat_...)</Label>
                <Input type="password" placeholder="shpat_xxxxxxxx (zamaskowany)" value={legacyToken} onChange={e => setLegacyToken(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !domain || !legacyToken} className="bg-slate-800 hover:bg-slate-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Zapisz token
                </Button>
                <Button onClick={handleTest} disabled={testing} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plug className="w-4 h-4 mr-2" />}
                  Testuj połączenie
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status info */}
      {lastError && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">{lastError}</AlertDescription>
        </Alert>
      )}

      {shopInfo?.connected && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4 space-y-1">
            <p className="text-emerald-800 font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Połączono z Shopify</p>
            <p className="text-sm text-emerald-700">Sklep: <strong>{shopInfo.shop_name}</strong> ({shopInfo.shop_domain})</p>
            <p className="text-sm text-emerald-700">Plan: {shopInfo.plan} | API: {shopInfo.api_version} | Tryb: {shopInfo.auth_mode}</p>
          </CardContent>
        </Card>
      )}

      {lastTested && <p className="text-xs text-muted-foreground">Ostatni test: {new Date(lastTested).toLocaleString("pl-PL")}</p>}
      {lastTokenRefresh && <p className="text-xs text-muted-foreground">Ostatnie odświeżenie tokenu: {new Date(lastTokenRefresh).toLocaleString("pl-PL")}</p>}

      {/* Diagnostic panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnostyka</CardTitle>
          <CardDescription>Sprawdź status konfiguracji Shopify.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={handleDiagnostic} disabled={loadingDiag}>
            {loadingDiag ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Odśwież diagnostykę
          </Button>
          {diagnostic && (
            <div className="space-y-2 text-sm">
              <DiagRow label="Shopify domain skonfigurowany" value={diagnostic.shop_domain || (diagnostic.connected ? "TAK" : "NIE")} ok={diagnostic.connected} />
              <DiagRow label="Połączenie z API" ok={diagnostic.connected} value={diagnostic.connected ? "TAK" : "NIE"} />
              <DiagRow label="Sklep" ok={diagnostic.connected} value={diagnostic.shop_name || "—"} />
              <DiagRow label="Plan" ok={diagnostic.connected} value={diagnostic.plan || "—"} />
              <DiagRow label="Tryb autoryzacji" ok={!!diagnostic.auth_mode} value={diagnostic.auth_mode || "—"} />
              <DiagRow label="Ostatni test API" ok={!!diagnostic.tested_at} value={diagnostic.tested_at ? new Date(diagnostic.tested_at).toLocaleString("pl-PL") : "—"} />
              {diagnostic.error && <DiagRow label="Ostatni błąd" ok={false} value={diagnostic.error} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DiagRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${ok ? "text-emerald-700" : "text-red-600"}`}>
        {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        {value}
      </span>
    </div>
  );
}