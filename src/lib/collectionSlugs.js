import { CATEGORY_GROUPS, CATEGORY_GROUP_LABELS_EN } from "./categoryConfig";

const SLUGS = {
  "Odzież": "odziez",
  "Obuwie": "buty",
  "Akcesoria": "akcesoria",
  "Elektronika": "elektronika",
  "Dom i ogród": "dom",
  "Zabawki": "zabawki",
  "Sport": "sport",
  "Książki": "ksiazki",
  "Uroda": "uroda",
  "Motoryzacja": "motoryzacja",
  "Zwierzęta": "zwierzeta",
  "Zdrowie": "zdrowie",
  "Muzyka": "muzyka",
  "Sztuka i kolekcje": "sztuka",
  "Inne": "inne",
};

const DESCRIPTIONS = {
  "Odzież": ["Odzież damska, męska, dziecięca i sportowa — sprawdzone marki w doskonałym stanie.", "Women's, men's, kids' and sportswear — verified brands in excellent condition."],
  "Obuwie": ["Buty, sneakersy i obuwie sportowe — od klasyków po modele premium.", "Shoes, sneakers and sports footwear — from classics to premium models."],
  "Akcesoria": ["Torby, biżuteria, zegarki i okulary — starannie wyselekcjonowane akcesoria.", "Bags, jewelry, watches and sunglasses — carefully curated accessories."],
  "Elektronika": ["Smartfony, laptopy, audio i gaming — sprzęt przetestowany i gotowy do pracy.", "Smartphones, laptops, audio and gaming — tested, ready-to-use equipment."],
  "Dom i ogród": ["Meble, AGD i dekoracje — funkcjonalne rozwiązania dla każdego wnętrza.", "Furniture, appliances and decor — functional solutions for every home."],
  "Zabawki": ["Zabawki, gry planszowe i klocki — radość dla dzieci w każdym wieku.", "Toys, board games and building blocks — joy for kids of all ages."],
  "Sport": ["Sprzęt fitness, rowery i sporty zimowe — wszystko do aktywnego wypoczynku.", "Fitness gear, bikes and winter sports — everything for an active lifestyle."],
  "Książki": ["Beletrystyka, literatura faktu i komiksy — coś dla każdego czytelnika.", "Fiction, non-fiction and comics — something for every reader."],
  "Uroda": ["Kosmetyki, perfumy i pielęgnacja — oryginalne produkty w świetnych cenach.", "Cosmetics, perfumes and care products — original items at great prices."],
  "Motoryzacja": ["Części, akcesoria i narzędzia samochodowe.", "Car parts, accessories and automotive tools."],
  "Zwierzęta": ["Karma i akcesoria dla psów, kotów i innych pupilów.", "Food and accessories for dogs, cats and other pets."],
  "Zdrowie": ["Sprzęt medyczny i suplementy diety.", "Medical equipment and dietary supplements."],
  "Muzyka": ["Instrumenty muzyczne i płyty winylowe dla melomanów.", "Musical instruments and vinyl records for music lovers."],
  "Sztuka i kolekcje": ["Obrazy, grafiki i przedmioty kolekcjonerskie.", "Paintings, prints and collectible items."],
  "Inne": ["Produkty, które nie pasują do pozostałych kategorii.", "Products that don't fit other categories."],
};

export const COLLECTIONS = CATEGORY_GROUPS.map(g => {
  const [descPl, descEn] = DESCRIPTIONS[g.group] || [g.group, g.group];
  return {
    slug: SLUGS[g.group],
    group: g.group,
    icon: g.icon,
    title: g.group,
    titleEn: CATEGORY_GROUP_LABELS_EN[g.group] || g.group,
    description: descPl,
    descriptionEn: descEn,
    categories: g.items.map(i => i.value),
  };
});

export function getCollectionBySlug(slug) {
  return COLLECTIONS.find(c => c.slug === slug) || null;
}