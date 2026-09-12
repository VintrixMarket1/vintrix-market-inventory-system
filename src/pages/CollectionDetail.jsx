import React from "react";
import { useParams, Link } from "react-router-dom";
import CustomerCatalogWrapper from "./CustomerCatalog";
import { getCollectionBySlug } from "@/lib/collectionSlugs";
import { useLang } from "@/lib/i18n";

export default function CollectionDetail() {
  const { slug } = useParams();
  const { t } = useLang();
  const collection = getCollectionBySlug(slug);

  if (!collection) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">◈</div>
          <p className="text-stone-500 text-sm tracking-wide">{t("col_not_found")}</p>
          <Link to="/" className="mt-4 inline-block text-amber-400 text-sm hover:underline">
            {t("pd_back_to_catalog")}
          </Link>
        </div>
      </div>
    );
  }

  return <CustomerCatalogWrapper initialCategories={collection.categories} collectionSlug={slug} />;
}