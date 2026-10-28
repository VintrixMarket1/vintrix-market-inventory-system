import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function OlxCallback() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const err = params.get("error");
    if (err || !code) {
      setError(err || "Brak kodu autoryzacyjnego");
      setStatus("error");
      return;
    }
    base44.functions.invoke("olxOAuthCallback", { code, redirect_uri: `${window.location.origin}/OlxCallback` })
      .then((res) => {
        const data = res.data ?? res;
        if (data?.error) { setError(data.error); setStatus("error"); } else setStatus("success");
      })
      .catch(e => { setError(e.response?.data?.error || e.message); setStatus("error"); });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
        {status === "loading" && (<>
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-700">Łączenie z OLX...</h2>
        </>)}
        {status === "success" && (<>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-700">Połączono z OLX!</h2>
          <p className="text-slate-500">Twoje konto OLX zostało pomyślnie połączone.</p>
        </>)}
        {status === "error" && (<>
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-slate-700">Błąd połączenia</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </>)}
        {status !== "loading" && (
          <Link to="/" className="inline-block mt-4 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">Wróć do aplikacji</Link>
        )}
      </div>
    </div>
  );
}