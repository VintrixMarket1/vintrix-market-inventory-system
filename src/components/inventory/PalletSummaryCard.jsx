import React from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function PalletSummaryCard({ pallet, productCount }) {
  const navigate = useNavigate();
  const statusLabel = pallet.status === "processing" ? "W trakcie" : "Nowa";
  const statusClass = pallet.status === "processing" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  return (
    <div
      className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate("/Pallets")}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">📦</span>
        <Badge className={`text-[10px] ${statusClass}`}>{statusLabel}</Badge>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">{pallet.pallet_code}</p>
        <p className="text-xs text-slate-500 truncate">{pallet.investor_name}</p>
      </div>
      <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">{productCount} szt. (niesort.)</span>
        <span className="text-sm font-bold text-slate-700">{pallet.total_cost} PLN</span>
      </div>
      <p className="text-[10px] text-slate-400 text-center">↗ kliknij aby przejść do Palet</p>
    </div>
  );
}