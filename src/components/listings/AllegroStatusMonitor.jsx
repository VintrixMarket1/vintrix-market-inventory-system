import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, Send, ChevronDown, ChevronUp } from "lucide-react";
import AllegroDescriptionEditor from "@/components/listings/AllegroDescriptionEditor";

const STATUS_CONFIG = {
  ACTIVE: { label: "Aktywna", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  INACTIVE: { label: "Nieaktywna", color: "bg-slate-100 text-slate-600 border-slate-200" },
  ENDED: { label: "Zakończona", color: "bg-red-100 text-red-700 border-red-200" },
  SUSPENDED: { label: "Zawieszona ⚠️", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ACTIVATING: { label: "W trakcie aktywacji", color: "bg-blue-100 text-blue-700 border-blue-200" },
  UNKNOWN: { label: "Nieznany", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function AllegroStatusMonitor({ listing }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fixDescription, setFixDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const offerId = listing?.allegro_listing_id;
  if (!offerId) return null;

  const fetchStatus = async () => {
    setLoading(true);
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke("getAllegroListingStatus", { offer_id: offerId });
      setStatus(res.data);
      setExpanded(true);
      if (res.data?.errors?.length > 0 && !fixDescription) {
        setFixDescription(listing.listing_description || "");
      }
    } catch (err) {
      setStatus({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const submitForVerification = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await base44.functions.invoke("submitAllegroForVerification", {
        offer_id: offerId,
        listing_id: listing.id,
        description: fixDescription || undefined,
      });
      setSubmitResult(res.data);
      // Refresh status after 2s
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setSubmitResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = status?.publication_status ? (STATUS_CONFIG[status.publication_status] || STATUS_CONFIG.UNKNOWN) : null;
  const hasErrors = status?.errors?.length > 0;

  return (
    <div className="mt-2 border border-orange-100 rounded-lg overflow-hidden bg-orange-50/30">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-600 font-medium">Allegro #{offerId}</span>
          {statusInfo && (
            <Badge className={`text-[10px] border ${statusInfo.color}`}>{statusInfo.label}</Badge>
          )}
          {hasErrors && (
            <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />{status.errors.length} błąd(y)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-orange-600" onClick={fetchStatus} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sprawdź
          </Button>
          <a href={`https://allegro.pl/oferta/${offerId}`} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-500">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          {status && (
            <button onClick={() => setExpanded(v => !v)} className="p-1 text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && status && !status.error && (
        <div className="border-t border-orange-100 px-3 py-2 space-y-3 bg-white">
          {/* Errors list */}
          {hasErrors && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Błędy wymagające poprawy:
              </p>
              {status.errors.map((err, i) => (
                <div key={i} className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-800">
                  {err.path && <span className="font-mono text-[10px] text-red-400 block mb-0.5">[{err.path}]</span>}
                  {err.message}
                </div>
              ))}

              {/* Fix description editor */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700">Popraw opis oferty:</p>
                <AllegroDescriptionEditor value={fixDescription} onChange={setFixDescription} />
                <Button
                  onClick={submitForVerification}
                  disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Zapisz poprawki i wyślij do weryfikacji
                </Button>
              </div>
            </div>
          )}

          {/* No errors — just re-submit */}
          {!hasErrors && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> Brak błędów w ofercie
              </div>
              <Button
                onClick={submitForVerification}
                disabled={submitting}
                variant="outline"
                className="text-xs h-8 gap-1.5 text-orange-600 border-orange-200"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Wyślij ponownie do weryfikacji
              </Button>
            </div>
          )}

          {/* Submit result */}
          {submitResult && (
            <div className={`text-xs rounded p-2 ${submitResult.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {submitResult.error || submitResult.message || "Wysłano pomyślnie"}
            </div>
          )}

          {/* Warnings */}
          {status.warnings?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-700">Ostrzeżenia:</p>
              {status.warnings.map((w, i) => (
                <div key={i} className="text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-800">{w.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {status?.error && (
        <div className="border-t border-red-100 px-3 py-2 text-xs text-red-600 bg-white">
          {status.error}
        </div>
      )}
    </div>
  );
}