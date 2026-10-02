import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search, PackageCheck, AlertCircle } from "lucide-react";

const PAGE_SIZE = 100;

export default function AllegroImportPanel() {
  const queryClient = useQueryClient();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offers, setOffers] = useState([]);
  const [selected, setSelected] = useState({});
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);

  // Istniejące produkty — do oznaczania duplikatów
  const { data: products = [] } = useQuery({
    queryKey: ["products_allegro_import"],
    queryFn: () => base44.entities.Product.list("-created_date", 1000),
  });

  const existingIds = useMemo(
    () => new Set(products.map(p => p.allegro_listing_id && String(p.allegro_listing_id))),
    [products]
  );
  const existingNames = useMemo(
    () => new Set(products.map(p => (p.product_name || "").trim().toLowerCase())),
    [products]
  );

  const isInStock = (offer) =>
    existingIds.has(String(offer.id)) || existingNames.has(offer.name.trim().toLowerCase());

  const loadOffers = async (fromOffset = 0) => {
    setLoadingOffers(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getAllegroOffers", {
        name: nameFilter || undefined,
        publication_status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: fromOffset,
      });
      const data = res.data ?? res;
      if (data.error) {
        setError(data.error);
      } else {
        setOffers(prev => (fromOffset === 0 ? data.offers : [...prev, ...data.offers]));
        setOffset(fromOffset + PAGE_SIZE);
        setResult(null);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setLoadingOffers(false);
  };

  const importSelected = async () => {
    const ids = offers.filter(o => selected[o.id] && !isInStock(o)).map(o => o.id);
    if (ids.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const importPayload = offers
        .filter(o => selected[o.id] && !isInStock(o))
        .map(o => ({ id: o.id, name: o.name, price: o.price, status: o.status, image: o.image }));
      const res = await base44.functions.invoke("importAllegroOffers", { offers: importPayload });
      const data = res.data ?? res;
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setSelected({});
        queryClient.invalidateQueries({ queryKey: ["products_allegro_import"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setImporting(false);
  };

  const importableCount = offers.filter(o => selected[o.id] && !isInStock(o)).length;
  const hasMore = offers.length >= PAGE_SIZE && offers.length > 0 && offers.length % PAGE_SIZE === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="w-4 h-4 text-orange-500" /> Import ofert z Allegro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtry */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Filtruj po nazwie oferty..."
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") loadOffers(0); }}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-slate-900"
          >
            <option value="">Wszystkie statusy</option>
            <option value="ACTIVE">Aktywne</option>
            <option value="ENDED">Zakończone</option>
            <option value="INACTIVE">Nieaktywne</option>
          </select>
          <Button onClick={() => loadOffers(0)} disabled={loadingOffers} className="gap-1.5 bg-orange-500 hover:bg-orange-600">
            {loadingOffers ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Pobierz oferty
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-medium text-emerald-700 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" /> Zaimportowano {result.created} produktów
            </p>
            {result.skipped_count > 0 && (
              <p className="text-emerald-600 mt-1">Pominięto {result.skipped_count} (już w magazynie)</p>
            )}
            {result.errors?.length > 0 && (
              <p className="text-red-600 mt-1">Błędy: {result.errors.length}</p>
            )}
          </div>
        )}

        {/* Lista ofert */}
        {offers.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 uppercase">
                    <th className="text-left px-3 py-2 w-8"></th>
                    <th className="text-left px-3 py-2 w-12">Zdjęcie</th>
                    <th className="text-left px-3 py-2 font-medium">Oferta</th>
                    <th className="text-right px-3 py-2 font-medium">Cena</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(offer => {
                    const inStock = isInStock(offer);
                    return (
                      <tr key={offer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <Checkbox
                            checked={!!selected[offer.id]}
                            disabled={inStock}
                            onCheckedChange={v => setSelected(prev => ({ ...prev, [offer.id]: !!v }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {offer.image
                            ? <img src={offer.image} alt={offer.name} className="w-9 h-9 object-cover rounded border border-slate-200" />
                            : <div className="w-9 h-9 rounded bg-slate-100" />}
                        </td>
                        <td className="px-3 py-2 max-w-[260px] truncate text-slate-800" title={offer.name}>
                          {offer.name}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{offer.price.toFixed(2)} PLN</td>
                        <td className="px-3 py-2">
                          <Badge className={
                            offer.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                            offer.status === "ENDED" ? "bg-slate-200 text-slate-600" :
                            "bg-amber-100 text-amber-700"
                          }>
                            {offer.status === "ACTIVE" ? "Aktywna" : offer.status === "ENDED" ? "Zakończona" : offer.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {inStock && <Badge className="bg-blue-100 text-blue-700">W magazynie</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasMore && (
          <Button variant="outline" size="sm" onClick={() => loadOffers(offset)} disabled={loadingOffers} className="gap-1.5">
            {loadingOffers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Wczytaj więcej
          </Button>
        )}

        {offers.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={importSelected}
              disabled={importing || importableCount === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Importuj zaznaczone ({importableCount})
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Zaimportowane produkty otrzymają cenę zakupu 0 PLN i flagę „Sprawdzenie” do uzupełnienia. Oferty już obecne w magazynie są oznaczone i pomijane.
        </p>
      </CardContent>
    </Card>
  );
}