export const CATEGORY_GROUPS = [
  {
    group: "Odzież",
    icon: "👕",
    items: [
      { value: "clothing_men", label: "Odzież męska" },
      { value: "clothing_women", label: "Odzież damska" },
      { value: "clothing_kids", label: "Odzież dziecięca" },
      { value: "clothing_sport", label: "Odzież sportowa" },
    ],
  },
  {
    group: "Obuwie",
    icon: "👟",
    items: [
      { value: "shoes_men", label: "Buty męskie" },
      { value: "shoes_women", label: "Buty damskie" },
      { value: "shoes_kids", label: "Buty dziecięce" },
      { value: "shoes_sport", label: "Buty sportowe" },
    ],
  },
  {
    group: "Akcesoria",
    icon: "👜",
    items: [
      { value: "accessories_bags", label: "Torby i plecaki" },
      { value: "accessories_belts", label: "Paski" },
      { value: "accessories_hats", label: "Czapki i kapelusze" },
      { value: "accessories_scarves", label: "Szaliki i chusty" },
      { value: "accessories_jewelry", label: "Biżuteria" },
      { value: "accessories_watches", label: "Zegarki" },
      { value: "accessories_sunglasses", label: "Okulary przeciwsłoneczne" },
      { value: "accessories_wallets", label: "Portfele" },
    ],
  },
  {
    group: "Elektronika",
    icon: "📱",
    items: [
      { value: "electronics_phones", label: "Telefony" },
      { value: "electronics_tablets", label: "Tablety" },
      { value: "electronics_laptops", label: "Laptopy" },
      { value: "electronics_audio", label: "Audio / słuchawki" },
      { value: "electronics_tv", label: "Telewizory" },
      { value: "electronics_cameras", label: "Aparaty i kamery" },
      { value: "electronics_gaming", label: "Gaming" },
      { value: "electronics_accessories", label: "Akcesoria elektroniczne" },
    ],
  },
  {
    group: "Dom i ogród",
    icon: "🏠",
    items: [
      { value: "home_furniture", label: "Meble" },
      { value: "home_kitchen", label: "Kuchnia" },
      { value: "home_bedding", label: "Pościel i tekstylia" },
      { value: "home_decor", label: "Dekoracje" },
      { value: "home_lighting", label: "Oświetlenie" },
      { value: "home_garden", label: "Ogród" },
      { value: "home_tools", label: "Narzędzia" },
      { value: "home_bathroom", label: "Łazienka" },
    ],
  },
  {
    group: "Zabawki",
    icon: "🧸",
    items: [
      { value: "toys_kids", label: "Zabawki dla dzieci" },
      { value: "toys_board_games", label: "Gry planszowe" },
      { value: "toys_outdoor", label: "Zabawki ogrodowe" },
      { value: "toys_educational", label: "Zabawki edukacyjne" },
      { value: "toys_lego", label: "Klocki / LEGO" },
      { value: "toys_dolls", label: "Lalki i figurki" },
    ],
  },
  {
    group: "Sport",
    icon: "⚽",
    items: [
      { value: "sports_fitness", label: "Fitness i siłownia" },
      { value: "sports_cycling", label: "Rowery i hulajnogi" },
      { value: "sports_winter", label: "Sporty zimowe" },
      { value: "sports_water", label: "Sporty wodne" },
      { value: "sports_team", label: "Sporty zespołowe" },
      { value: "sports_outdoor", label: "Outdoor i turystyka" },
    ],
  },
  {
    group: "Książki",
    icon: "📚",
    items: [
      { value: "books_fiction", label: "Beletrystyka" },
      { value: "books_nonfiction", label: "Literatura faktu" },
      { value: "books_kids", label: "Książki dla dzieci" },
      { value: "books_comics", label: "Komiksy i mangi" },
      { value: "books_textbooks", label: "Podręczniki" },
    ],
  },
  {
    group: "Uroda",
    icon: "💄",
    items: [
      { value: "beauty_cosmetics", label: "Kosmetyki" },
      { value: "beauty_perfumes", label: "Perfumy" },
      { value: "beauty_haircare", label: "Pielęgnacja włosów" },
      { value: "beauty_skincare", label: "Pielęgnacja skóry" },
    ],
  },
  {
    group: "Motoryzacja",
    icon: "🚗",
    items: [
      { value: "automotive_parts", label: "Części samochodowe" },
      { value: "automotive_accessories", label: "Akcesoria samochodowe" },
      { value: "automotive_tools", label: "Narzędzia motoryzacyjne" },
    ],
  },
  {
    group: "Zwierzęta",
    icon: "🐾",
    items: [
      { value: "pet_food", label: "Karma dla zwierząt" },
      { value: "pet_accessories", label: "Akcesoria dla zwierząt" },
      { value: "pet_clothing", label: "Ubranka dla zwierząt" },
    ],
  },
  {
    group: "Zdrowie",
    icon: "💊",
    items: [
      { value: "food_supplements", label: "Suplementy diety" },
      { value: "health_medical", label: "Sprzęt medyczny" },
    ],
  },
  {
    group: "Muzyka",
    icon: "🎵",
    items: [
      { value: "music_instruments", label: "Instrumenty muzyczne" },
      { value: "music_vinyl", label: "Płyty winylowe" },
    ],
  },
  {
    group: "Sztuka i kolekcje",
    icon: "🎨",
    items: [
      { value: "art_paintings", label: "Obrazy i grafiki" },
      { value: "art_collectibles", label: "Kolekcjonerstwo" },
    ],
  },
  {
    group: "Inne",
    icon: "📦",
    items: [
      { value: "other", label: "Inne" },
    ],
  },
];

// Flat map for quick label lookup
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_GROUPS.flatMap(g => g.items.map(i => [i.value, i.label]))
);

// Legacy mapping for old category values
export const LEGACY_CATEGORY_LABELS = {
  clothing: "Odzież",
  shoes: "Obuwie",
  accessories: "Akcesoria",
  electronics: "Elektronika",
  home: "Dom",
  toys: "Zabawki",
  sports: "Sport",
  books: "Książki",
  other: "Inne",
};

export function getCategoryLabel(value) {
  return CATEGORY_LABELS[value] || LEGACY_CATEGORY_LABELS[value] || value;
}