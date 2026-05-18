import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ShopifyCallback() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const shop = params.get("shop");

    if (!code || !shop) {
      setStatus("error");
      setMessage("Brak parametrów autoryzacji (code lub shop). Spróbuj ponownie.");
      return;
    }

    base44.functions.invoke("shopifyOAuthCallback", { code, shop })
      .then(res => {
        if (res.data?.success) {
          setStatus("success");
          setMessage(`Pomyślnie połączono ze sklepem ${shop}`);
        } else {
          setStatus("error");
          setMessage(res.data?.error || "Nieznany błąd podczas autoryzacji.");
        }
      })
      .catch(err => {
        setStatus("error");
        setMessage(err?.response?.data?.error || err.message || "Błąd połączenia.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto" />
            <p className="text-lg font-medium text-slate-700">Łączenie z Shopify...</p>
            <p className="text-sm text-muted-foreground">Wymiana kodu autoryzacyjnego na token dostępu.</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-medium text-slate-700">Połączono ze Shopify!</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 mt-2">
              <Link to="/ShopifySettings">Przejdź do ustawień Shopify</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-lg font-medium text-slate-700">Błąd autoryzacji</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="w-full mt-2">
              <Link to="/ShopifySettings">Wróć do ustawień</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}