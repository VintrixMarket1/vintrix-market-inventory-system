export default function AiConfidenceBadge({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? "text-emerald-700 bg-emerald-100 border-emerald-300" :
    pct >= 50 ? "text-amber-700 bg-amber-100 border-amber-300" :
                "text-red-700 bg-red-100 border-red-300";

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${color}`}>
      Pewność AI: {pct}%
    </span>
  );
}