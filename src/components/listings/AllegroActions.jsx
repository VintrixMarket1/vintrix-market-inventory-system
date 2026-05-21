import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Upload, XCircle } from "lucide-react";

export default function AllegroActions({ listing, product, onRefresh }) {
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isListed = listing?.listing_status === "listed" && listing?.allegro_listing_id;

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    setSuccess("");
    const res = await base44.functions.invoke("publishToAllegro", { listing_id: listing.id });
    const data = res.data ?? res;
    if (data?.error) {
      setError(data.error);
    } else {
      setSuccess(data.updated ? "Oferta zaktualizowana na Allegro!" : "Opublikowano na Allegro!");
      onRefresh?.();
    }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    if (!confirm("Zakończyć ofertę na Allegro?")) return;
    setUnpublishing(true);
    setError("");
    setSuccess("");
    const res = await base44.functions.invoke("unpublishFromAllegro", { listing_id: listing.id });
    const data = res.data ?? res;
    if (data?.error) {
      setError(data.error);
    } else {
      setSuccess("Oferta zakończona.");
      onRefresh?.();
    }
    setUnpublishing(false);
  };

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-orange-800">Allegro</span>
        {listing?.allegro_listing_id && (
          <a
            href={`https://allegro.pl/oferta/${listing.allegro_listing_id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-orange-600 hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Otwórz ofertę
          </a>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded p-1.5">{error}</p>}
      {success && <p className="text-xs text-emerald-700 bg-emerald-50 rounded p-1.5">{success}</p>}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={publishing}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs h-8"
        >
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isListed ? "Aktualizuj" : "Opublikuj na Allegro"}
        </Button>

        {isListed && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleUnpublish}
            disabled={unpublishing}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 gap-1.5 text-xs h-8"
          >
            {unpublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Zakończ ofertę
          </Button>
        )}
      </div>
    </div>
  );
}