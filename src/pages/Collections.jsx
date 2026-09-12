import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { COLLECTIONS } from "@/lib/collectionSlugs";
import { useLang } from "@/lib/i18n";
import { setSeoMeta } from "@/lib/seo";

export default function Collections() {
  const { lang, t } = useLang();

  useEffect(() => {
    setSeoMeta({
      title: `${t("col_title")} — Vintrix`,
      description: t("col_subtitle"),
    });
  }, [lang]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-30 bg-stone-950/90 backdrop-blur-xl border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-lg font-black tracking-[0.15em] text-white uppercase">Vintrix</Link>
          <Link to="/" className="text-xs text-stone-400 hover:text-amber-400 uppercase tracking-[0.2em] transition-colors">
            {t("pd_back_to_catalog")}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.25em]">Vintrix</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2">{t("col_title")}</h1>
        <p className="text-sm text-stone-500 mt-3">{t("col_subtitle")}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-10">
          {COLLECTIONS.map(c => (
            <Link
              key={c.slug}
              to={`/kolekcje/${c.slug}`}
              className="group bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 hover:border-amber-500/50 hover:-translate-y-1 transition-all duration-300 touch-manipulation"
            >
              <span className="text-3xl">{c.icon}</span>
              <p className="mt-4 font-bold text-stone-100 group-hover:text-amber-400 transition-colors">
                {lang === "en" ? c.titleEn : c.title}
              </p>
              <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                {lang === "en" ? c.descriptionEn : c.description}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {t("col_browse")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}