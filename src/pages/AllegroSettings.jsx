import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react";

export default function AllegroSettings() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("testAllegroConnection", {});
    setStatus(res.data ?? res);
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke("getAllegroAuthUrl", {});
      const url = res.data?.url ?? res.url;
      if (url) {
        window.location.href = url;
      } else {
        alert("Nie udało się pobrać URL autoryzacji: " + JSON.stringify(res.data ?? res));
      }
    } catch (e) {
      alert("Błąd: " + (e?.response?.data?.error || e.message));
    }
    setConnecting(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ustawienia Allegro</h1>
        <p className="text-slate-500 mt-1">Zarządzaj połączeniem z Allegro API</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status połączenia
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && status?.connected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700">Połączono z Allegro</span>
                <Badge className="bg-green-100 text-green-700">Aktywne</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <div><span className="font-medium">Login:</span> {status.login}</div>
                <div><span className="font-medium">Email:</span> {status.email}</div>
                <div><span className="font-medium">Połączono:</span> {status.connected_at ? new Date(status.connected_at).toLocaleDateString("pl-PL") : "—"}</div>
                <div><span className="font-medium">Token ważny do:</span> {status.token_expires_at ? new Date(status.token_expires_at).toLocaleString("pl-PL") : "—"}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={checkConnection} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Odśwież status
                </Button>
                <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting} className="gap-1.5">
                  {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  Połącz ponownie
                </Button>
              </div>
            </div>
          )}

          {!loading && !status?.connected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-slate-600">Brak aktywnego połączenia z Allegro</span>
              </div>
              {status?.error && (
                <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{status.error}</p>
              )}
              <Button onClick={handleConnect} disabled={connecting} className="bg-orange-500 hover:bg-orange-600 gap-2">
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Połącz z Allegro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informacje o integracji</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>• Integracja używa Allegro REST API z OAuth 2.0</p>
          <p>• Tokeny są automatycznie odświeżane przed wygaśnięciem</p>
          <p>• URI przekierowania: <code className="bg-slate-100 px-1 rounded text-xs">{import.meta.env.VITE_APP_URL || window.location.origin}/AllegroCallback</code></p>
        </CardContent>
      </Card>
    </div>
  );
}