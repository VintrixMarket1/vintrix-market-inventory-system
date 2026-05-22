import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw, TableProperties } from "lucide-react";

const CONNECTOR_ID = "6a0fa2240a5480da2009fd07";

export default function GoogleSheetsSettings() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ spreadsheet_id: "", sheet_name: "Sprzedaż", enabled: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Check if user has an active connector connection
  const checkConnection = async () => {
    try {
      const res = await base44.functions.invoke("getGoogleSheetsToken", {});
      setConnected(!!res?.data?.access_token);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      const me = await base44.auth.me();
      setUser(me);

      // Load existing settings
      const allSettings = await base44.entities.GoogleSheetsSettings.list();
      const mySettings = allSettings.find(s => s.user_email === me.email || s.created_by === me.email);
      if (mySettings) {
        setSettings(mySettings);
        setForm({
          spreadsheet_id: mySettings.spreadsheet_id || "",
          sheet_name: mySettings.sheet_name || "Sprzedaż",
          enabled: mySettings.enabled !== false,
        });
      }

      await checkConnection();
      setCheckingConnection(false);
    });
  }, []);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(async () => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setCheckingConnection(true);
        await checkConnection();
        setCheckingConnection(false);
        setMsg({ type: "success", text: "Konto Google połączone! Teraz zapisz ustawienia arkusza." });
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setMsg({ type: "", text: "" });
  };

  const handleSave = async () => {
    if (!form.spreadsheet_id.trim()) {
      setMsg({ type: "error", text: "Wpisz ID arkusza Google Sheets." });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      // Get token directly from connector on frontend (where user context works)
      let accessToken = null;
      try {
        const connResult = await base44.functions.invoke("getGoogleSheetsToken", {});
        accessToken = connResult?.data?.access_token;
      } catch {
        // fallback: try getting token via connectAppUser flow
      }

      if (!accessToken) {
        setMsg({ type: "error", text: "Nie udało się pobrać tokenu. Rozłącz i połącz konto Google ponownie." });
        setSaving(false);
        return;
      }

      const res = await base44.functions.invoke("saveGoogleSheetsToken", {
        spreadsheet_id: form.spreadsheet_id,
        sheet_name: form.sheet_name,
        enabled: form.enabled,
        settings_id: settings?.id || null,
        access_token: accessToken,
      });
      const data = res?.data;
      if (data?.error) throw new Error(data.error);
      if (data?.settings) setSettings(data.settings);
      setMsg({ type: "success", text: "Ustawienia zapisane. Od teraz każda nowa sprzedaż będzie automatycznie dodawana do arkusza." });
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.message || "Nieznany błąd";
      setMsg({ type: "error", text: errMsg });
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Button onClick={() => base44.auth.redirectToLogin()}>Zaloguj się</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TableProperties className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold">Google Sheets — Eksport sprzedaży</h1>
          <p className="text-muted-foreground text-sm">Każda nowa sprzedaż będzie automatycznie dodawana do Twojego arkusza.</p>
        </div>
      </div>

      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Połączenie z Google</CardTitle>
          <CardDescription>Połącz swoje konto Google, aby eksport działał.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          {checkingConnection ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Sprawdzanie połączenia...
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Połączono z Google
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <XCircle className="w-4 h-4" /> Nie połączono — kliknij „Połącz konto Google"
            </div>
          )}
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button variant="outline" size="sm" onClick={async () => { setCheckingConnection(true); await checkConnection(); setCheckingConnection(false); }}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sprawdź
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDisconnect}>
                  Rozłącz
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConnect}>
                Połącz konto Google
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ustawienia arkusza</CardTitle>
          <CardDescription>
            ID arkusza znajdziesz w URL:{" "}
            <span className="font-mono text-xs bg-muted px-1 rounded">docs.google.com/spreadsheets/d/<strong>ID_ARKUSZA</strong>/edit</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>ID arkusza Google Sheets *</Label>
            <Input
              placeholder="np. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={form.spreadsheet_id}
              onChange={e => setForm(f => ({ ...f, spreadsheet_id: e.target.value }))}
            />
            {form.spreadsheet_id && form.spreadsheet_id !== "check_only" && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${form.spreadsheet_id}/edit`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" /> Otwórz arkusz
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Nazwa zakładki</Label>
            <Input
              placeholder="Sprzedaż"
              value={form.sheet_name}
              onChange={e => setForm(f => ({ ...f, sheet_name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Musi istnieć w arkuszu. Domyślnie: „Sprzedaż".</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Switch
              checked={form.enabled}
              onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))}
            />
            <span className="text-sm">Automatyczny eksport włączony</span>
          </div>

          {msg.text && (
            <div className={`text-sm rounded p-2.5 ${msg.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {msg.text}
            </div>
          )}

          <Button className="w-full" onClick={handleSave} disabled={saving || !connected}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {saving ? "Zapisuję..." : "Zapisz ustawienia"}
          </Button>
          {!connected && <p className="text-xs text-center text-muted-foreground">Najpierw połącz konto Google.</p>}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-medium">Kolumny w arkuszu:</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            {["Data", "Produkt", "Platforma", "Cena sprzedaży (PLN)", "Cena zakupu (PLN)", "Zysk (PLN)", "Marża (%)", "ID sprzedaży", "ID produktu"].map((col, i) => (
              <span key={col}><strong>{String.fromCharCode(65 + i)}</strong> — {col}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            ⚠️ Token Google jest zapisywany przy każdym „Zapisz ustawienia". Jeśli token wygaśnie (zwykle po 1h), kliknij ponownie „Zapisz ustawienia" by go odświeżyć.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}