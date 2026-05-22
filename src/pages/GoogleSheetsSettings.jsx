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

  const checkConnection = async () => {
    try {
      const res = await base44.functions.invoke("syncSaleToSheets", {
        sale_id: "test", spreadsheet_id: form.spreadsheet_id || "test"
      });
      // if we get here without auth error, connected
      setConnected(true);
    } catch (e) {
      const errMsg = e?.response?.data?.error || e?.message || "";
      // If it's not an auth error, still connected
      if (errMsg.includes("No connection") || errMsg.includes("not connected") || errMsg.includes("401")) {
        setConnected(false);
      } else {
        setConnected(true);
      }
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      const me = await base44.auth.me();
      setUser(me);

      // Load settings
      const allSettings = await base44.entities.GoogleSheetsSettings.list();
      const mySettings = allSettings.find(s => s.created_by === me.email || s.user_email === me.email);
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
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
  };

  const handleSave = async () => {
    if (!form.spreadsheet_id.trim()) {
      setMsg({ type: "error", text: "Wpisz ID arkusza Google Sheets." });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const payload = { ...form, user_email: user?.email };
      if (settings?.id) {
        await base44.entities.GoogleSheetsSettings.update(settings.id, payload);
      } else {
        const created = await base44.entities.GoogleSheetsSettings.create(payload);
        setSettings(created);
      }
      setMsg({ type: "success", text: "Ustawienia zapisane. Od teraz każda nowa sprzedaż będzie automatycznie dodawana do arkusza." });
    } catch (e) {
      setMsg({ type: "error", text: e.message });
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
          <CardDescription>Twoje konto Google musi być połączone, aby eksport działał.</CardDescription>
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
              <XCircle className="w-4 h-4" /> Nie połączono
            </div>
          )}
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setCheckingConnection(true); checkConnection().then(() => setCheckingConnection(false)); }}>
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
            {form.spreadsheet_id && (
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

      {/* Column info */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-2">Kolumny w arkuszu:</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            {["Data", "Produkt", "Platforma", "Cena sprzedaży (PLN)", "Cena zakupu (PLN)", "Zysk (PLN)", "Marża (%)", "ID sprzedaży", "ID produktu"].map((col, i) => (
              <span key={col}><strong>{String.fromCharCode(65 + i)}</strong> — {col}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}