import { Sparkles } from "lucide-react";

export default function AiAnalysisStep() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-300 border-t-transparent animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-800">AI analizuje produkt...</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Rozpoznaję typ, markę, stan i generuję opis ogłoszenia.
          <br />
          To może zająć kilka sekund.
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        {["Rozpoznaję produkt", "Oceniam stan", "Generuję opis"].map((label, i) => (
          <span
            key={label}
            className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}