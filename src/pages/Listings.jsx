import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit2, Trash2, ExternalLink } from "lucide-react";
import ListingForm from "../components/listings/ListingForm";

const platformColors = {
  vinted: "bg-teal-100 text-teal-700",
  olx: "bg-blue-100 text-blue-700",
  allegro: "bg-orange-100 text-orange-700",
  ebay: "bg-red-100 text-red-700",
};
const statusColors = {
  draft: "bg-slate-100 text-slate-600",
  listed: "bg-emerald-100 text-emerald-700",
  sold: "bg-amber-100 text-amber-700",
};

export default function Listings() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editListing, setEditListing] = useState(null);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const productsMap = Object.fromEntries(products.map(p => [p.id, p]));

  const filtered = listings.filter(l => {
    const searchMatch = !search || l.listing_title?.toLowerCase().includes(search.toLowerCase());
    const platformMatch = platformFilter === "all" || l.platform === platformFilter;
    const statusMatch = statusFilter === "all" || l.listing_status === statusFilter;
    return searchMatch && platformMatch && statusMatch;
  });

  const handleDelete = async (listing) => {
    if (!confirm("Delete this listing?")) return;
    await base44.entities.Listing.delete(listing.id);
    queryClient.invalidateQueries({ queryKey: ["listings"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
        <p className="text-sm text-slate-500 mt-1">{filtered.length} listings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search listings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="vinted">Vinted</SelectItem>
            <SelectItem value="olx">OLX</SelectItem>
            <SelectItem value="allegro">Allegro</SelectItem>
            <SelectItem value="ebay">eBay</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="listed">Listed</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">No listings found</p>
          <p className="text-xs text-slate-400 mt-1">Create listings from the Inventory page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => {
            const product = productsMap[listing.product_id];
            const image = product?.images?.[0];
            return (
              <div key={listing.id} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                  {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{listing.listing_title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${platformColors[listing.platform]}`}>
                      {listing.platform}
                    </Badge>
                    <Badge className={`text-[10px] ${statusColors[listing.listing_status]}`}>
                      {listing.listing_status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">{listing.listing_price} PLN</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditListing(listing)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(listing)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editListing && (
        <ListingForm
          open={!!editListing}
          onClose={() => setEditListing(null)}
          product={productsMap[editListing.product_id]}
          listing={editListing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["listings"] })}
        />
      )}
    </div>
  );
}