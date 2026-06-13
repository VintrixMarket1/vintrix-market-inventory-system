export const CATEGORY_GROUPS = [
  {
    group: "Odzież",
    icon: "👕",
    items: [
      {
        value: "clothing_men", label: "Odzież męska",
        subcategories: ["Koszulki i t-shirty", "Koszule", "Bluzy", "Swetry i kardigany", "Kurtki i płaszcze", "Spodnie", "Jeansy", "Dresy i joggery", "Szorty", "Garnitury i marynarki", "Bielizna", "Skarpetki", "Piżamy"]
      },
      {
        value: "clothing_women", label: "Odzież damska",
        subcategories: ["Bluzki i koszule", "T-shirty i topy", "Sukienki", "Spódnice", "Swetry i kardigany", "Bluzy", "Kurtki i płaszcze", "Spodnie", "Jeansy", "Legginsy", "Dresy", "Garnitury i żakiety", "Bielizna", "Piżamy i szlafroki", "Stroje kąpielowe"]
      },
      {
        value: "clothing_kids", label: "Odzież dziecięca",
        subcategories: ["Niemowlęta (0-12m)", "Małe dzieci (1-3 lata)", "Dzieci (4-8 lat)", "Dzieci starsze (9-14 lat)", "Koszulki i bluzki", "Spodnie i legginsy", "Sukienki i spódniczki", "Bluzy i swetry", "Kurtki i kamizelki", "Kombinezony", "Bielizna i skarpetki", "Piżamy"]
      },
      {
        value: "clothing_sport", label: "Odzież sportowa",
        subcategories: ["Koszulki sportowe", "Spodenki sportowe", "Legginsy sportowe", "Bluzy sportowe", "Kurtki do biegania", "Stroje do jogi", "Stroje rowerowe", "Stroje narciarskie", "Stroje do pływania", "Kombinezony sportowe", "Bielizna termoaktywna"]
      },
    ],
  },
  {
    group: "Obuwie",
    icon: "👟",
    items: [
      {
        value: "shoes_men", label: "Buty męskie",
        subcategories: ["Sneakersy", "Buty sportowe", "Półbuty i mokasyny", "Buty wizytowe", "Botki", "Boots i kozaki", "Klapki i sandały", "Kapcie", "Trampki"]
      },
      {
        value: "shoes_women", label: "Buty damskie",
        subcategories: ["Sneakersy", "Szpilki i czółenka", "Botki", "Kozaki", "Półbuty i balerinki", "Sandały", "Klapki", "Trampki", "Kapcie", "Buty sportowe"]
      },
      {
        value: "shoes_kids", label: "Buty dziecięce",
        subcategories: ["Buty niemowlęce", "Sandały dziecięce", "Trampki dziecięce", "Buty zimowe", "Kapcie dziecięce", "Buty sportowe dziecięce", "Kalosze"]
      },
      {
        value: "shoes_sport", label: "Buty sportowe",
        subcategories: ["Buty do biegania", "Buty do piłki nożnej", "Buty do koszykówki", "Buty do tenisa", "Buty trekkingowe", "Buty rowerowe", "Buty narciarskie", "Buty do siłowni"]
      },
    ],
  },
  {
    group: "Akcesoria",
    icon: "👜",
    items: [
      {
        value: "accessories_bags", label: "Torby i plecaki",
        subcategories: ["Torebki damskie", "Torebki wieczorowe", "Plecaki", "Torby na ramię", "Torby podróżne", "Walizki", "Saszetki i nerki", "Torby sportowe", "Torby na laptopa", "Aktówki"]
      },
      {
        value: "accessories_belts", label: "Paski",
        subcategories: ["Paski skórzane", "Paski materiałowe", "Paski damskie", "Paski męskie"]
      },
      {
        value: "accessories_hats", label: "Czapki i kapelusze",
        subcategories: ["Czapki zimowe", "Czapki z daszkiem", "Kapelusze letnie", "Berety", "Kapelusze wizytowe", "Czapki dziecięce"]
      },
      {
        value: "accessories_scarves", label: "Szaliki i chusty",
        subcategories: ["Szaliki zimowe", "Chusty i apaszki", "Komin", "Szale"]
      },
      {
        value: "accessories_jewelry", label: "Biżuteria",
        subcategories: ["Naszyjniki", "Bransoletki", "Kolczyki", "Pierścionki", "Broszki", "Zestawy biżuterii", "Biżuteria ze złota", "Biżuteria ze srebra", "Biżuteria sztuczna"]
      },
      {
        value: "accessories_watches", label: "Zegarki",
        subcategories: ["Zegarki męskie", "Zegarki damskie", "Zegarki dziecięce", "Smartwatche", "Zegarki sportowe", "Zegarki luksusowe"]
      },
      {
        value: "accessories_sunglasses", label: "Okulary przeciwsłoneczne",
        subcategories: ["Okulary damskie", "Okulary męskie", "Okulary sportowe", "Okulary dla dzieci", "Okulary korekcyjne"]
      },
      {
        value: "accessories_wallets", label: "Portfele",
        subcategories: ["Portfele męskie", "Portfele damskie", "Portmonetki", "Etui na karty", "Portfele podróżne"]
      },
    ],
  },
  {
    group: "Elektronika",
    icon: "📱",
    items: [
      {
        value: "electronics_phones", label: "Telefony",
        subcategories: ["Smartfony", "Telefony klasyczne (feature phone)", "Części i akcesoria do telefonów", "Etui i pokrowce", "Ładowarki i kable", "Powerbanki", "Szkła hartowane"]
      },
      {
        value: "electronics_tablets", label: "Tablety",
        subcategories: ["Tablety iPad", "Tablety Android", "Tablety Windows", "Etui do tabletów", "Klawiatury do tabletów", "Rysiki"]
      },
      {
        value: "electronics_laptops", label: "Laptopy",
        subcategories: ["Laptopy biznesowe", "Laptopy gamingowe", "Ultrabooki", "MacBooki", "Chromebooki", "Netbooki", "Torby na laptopy", "Stacje dokujące"]
      },
      {
        value: "electronics_audio", label: "Audio / słuchawki",
        subcategories: ["Słuchawki nauszne", "Słuchawki douszne (TWS)", "Słuchawki przewodowe", "Głośniki Bluetooth", "Głośniki domowe", "Soundbary", "Wieże i zestawy Hi-Fi", "Amplitunery", "Gramofony", "Mikrofony"]
      },
      {
        value: "electronics_tv", label: "Telewizory",
        subcategories: ["Telewizory 32–43\"", "Telewizory 50–65\"", "Telewizory 70\"+", "Projektory", "Monitory komputerowe", "Uchwyty i podstawki"]
      },
      {
        value: "electronics_cameras", label: "Aparaty i kamery",
        subcategories: ["Aparaty cyfrowe kompaktowe", "Lustrzanki", "Bezlusterkowce", "Obiektywy", "Kamery sportowe (GoPro)", "Kamery wideo", "Drony", "Akcesoria fotograficzne", "Statywy i gimbale"]
      },
      {
        value: "electronics_gaming", label: "Gaming",
        subcategories: ["Konsole PlayStation", "Konsole Xbox", "Nintendo Switch", "Gry na PS", "Gry na Xbox", "Gry Nintendo", "Kontrolery i pady", "Klawiatura i mysz gamingowa", "Słuchawki gamingowe", "Monitory gamingowe", "Karty graficzne", "Akcesoria VR"]
      },
      {
        value: "electronics_accessories", label: "Akcesoria elektroniczne",
        subcategories: ["Myszki", "Klawiatury", "Pendrive i karty pamięci", "Dyski SSD i HDD", "Routery i sieć", "Drukarki i skanery", "Inteligentny dom (Smart Home)", "Oświetlenie LED smart", "Czujniki i alarmy"]
      },
    ],
  },
  {
    group: "Dom i ogród",
    icon: "🏠",
    items: [
      {
        value: "home_furniture", label: "Meble",
        subcategories: ["Sofy i kanapy", "Fotele", "Stoły i stoliki", "Krzesła", "Łóżka i ramy", "Szafy i komody", "Regały i biblioteczki", "Biurka", "Ławki", "Meble ogrodowe", "Meble dziecięce"]
      },
      {
        value: "home_kitchen", label: "Kuchnia — AGD",
        subcategories: ["Ekspresy do kawy", "Kawiarki i french pressy", "Tostery i opiekacze", "Blendery i miksery ręczne", "Roboty kuchenne", "Multicookery i wolnowary", "Kuchenki mikrofalowe", "Kuchenki elektryczne", "Frytkownice i air fryery", "Sokowirówki i wyciskarki", "Urządzenia do lodów", "Elektryczne grille stołowe", "Krajalnice do chleba i wędlin", "Naczynia i garnki", "Noże i akcesoria", "Deski do krojenia", "Talerze i zastawa", "Sztućce", "Formy i blachy do pieczenia"]
      },
      {
        value: "home_agd_large", label: "Duże AGD",
        subcategories: ["Pralki", "Suszarki do prania", "Pralko-suszarki", "Lodówki", "Zamrażarki", "Zmywarki", "Kuchenki gazowe i elektryczne", "Piekarniki", "Okapy kuchenne", "Urządzenia chłodnicze — inne"]
      },
      {
        value: "home_agd_cleaning", label: "AGD — Sprzątanie",
        subcategories: ["Odkurzacze pionowe", "Odkurzacze workowe i bezworkowe", "Odkurzacze robotyczne (roomba)", "Odkurzacze piorące", "Mopy parowe", "Odkurzacze ręczne (handheld)", "Froterki i polerki", "Myjki ciśnieniowe", "Odkurzacze do basenów"]
      },
      {
        value: "home_agd_personal", label: "AGD — Pielęgnacja osobista",
        subcategories: ["Masażery ciała i pleców", "Masażery nóg i stóp", "Masażery twarzy", "Poduszki masujące", "Maty masujące", "Depilatowy i maszynki do golenia", "Suszarki do włosów", "Prostownice do włosów", "Lokówki", "Szczotki do włosów elektryczne", "Epilatory", "Urządzenia do manicure / pedicure", "Elektryczne szczoteczki do zębów", "Nawilżacze powietrza", "Oczyszczacze powietrza", "Jonizatory"]
      },
      {
        value: "home_agd_laundry", label: "AGD — Prasowanie i pielęgnacja odzieży",
        subcategories: ["Żelazka parowe", "Stacje parowe", "Parownice do ubrań", "Deski do prasowania", "Odświeżacze do odzieży"]
      },
      {
        value: "home_bedding", label: "Pościel i tekstylia",
        subcategories: ["Pościel", "Kołdry i poduszki", "Ręczniki", "Narzuty i koce", "Obrusy i serwetki", "Zasłony i firany", "Rolety", "Dywaniki"]
      },
      {
        value: "home_decor", label: "Dekoracje",
        subcategories: ["Obrazy i plakaty", "Ramki i lustra", "Świece i kadzidła", "Wazony i doniczki", "Figurki i statuetki", "Zegary", "Dywany i chodniki", "Poduszki dekoracyjne"]
      },
      {
        value: "home_lighting", label: "Oświetlenie",
        subcategories: ["Lampy podłogowe", "Lampy stołowe", "Lampy sufitowe", "Kinkiety", "Żarówki LED", "Lampki nocne", "Lampki biurkowe", "Oświetlenie zewnętrzne"]
      },
      {
        value: "home_garden", label: "Ogród",
        subcategories: ["Narzędzia ogrodowe", "Kosiarki i podkaszarki", "Piły do drzew", "Dmuchawy do liści", "Doniczki i skrzynie", "Nasiona i sadzonki", "Nawozy i środki ochrony", "Grille i akcesoria BBQ", "Meble ogrodowe", "Huśtawki i leżaki", "Namioty ogrodowe", "Baseny i jacuzzi ogrodowe"]
      },
      {
        value: "home_tools", label: "Narzędzia",
        subcategories: ["Wiertarki i wkrętarki", "Szlifierki i pilarki", "Klucze i zestawy narzędzi", "Poziomnice i miary", "Narzędzia ręczne", "Skrzynki narzędziowe", "Drabiny i rusztowania", "Spawarki"]
      },
      {
        value: "home_bathroom", label: "Łazienka",
        subcategories: ["Akcesoria łazienkowe", "Ręczniki i dywaniki", "Półki i organizery", "Lustra łazienkowe", "Zasłony prysznicowe", "Dozowniki i pojemniki"]
      },
    ],
  },
  {
    group: "Zabawki",
    icon: "🧸",
    items: [
      {
        value: "toys_kids", label: "Zabawki dla dzieci",
        subcategories: ["Grzechotki i zabawki niemowlęce", "Samochodziki i pojazdy", "Lalki", "Pluszaki", "Zestawy kreatywne", "Zabawki interaktywne", "Maskotki", "Zabawki w piasku"]
      },
      {
        value: "toys_board_games", label: "Gry planszowe",
        subcategories: ["Gry familijne", "Gry strategiczne", "Gry karciane", "Puzzle", "Gry kooperacyjne", "Gry dla dzieci", "Gry dla dorosłych", "Szachy i warcaby"]
      },
      {
        value: "toys_outdoor", label: "Zabawki ogrodowe",
        subcategories: ["Rowery dziecięce", "Hulajnogi", "Wrotki i rolki", "Trampoliny", "Zjeżdżalnie i huśtawki", "Piaskownice", "Dmuchańce"]
      },
      {
        value: "toys_educational", label: "Zabawki edukacyjne",
        subcategories: ["Układanki i sortery", "Zabawki matematyczne", "Zestawy do nauki języków", "Globusy i mapy", "Zestawy naukowe", "Instrumenty dla dzieci"]
      },
      {
        value: "toys_lego", label: "Klocki / LEGO",
        subcategories: ["LEGO City", "LEGO Technic", "LEGO Star Wars", "LEGO Harry Potter", "LEGO Friends", "Inne zestawy LEGO", "Klocki Duplo", "Inne klocki"]
      },
      {
        value: "toys_dolls", label: "Lalki i figurki",
        subcategories: ["Lalki Barbie", "Lalki Baby Born", "Zestawy do zabawy w dom", "Figurki superbohaterów", "Figurki dinozaurów", "Figurki zwierząt", "Minifigurki kolekcjonerskie"]
      },
    ],
  },
  {
    group: "Sport",
    icon: "⚽",
    items: [
      {
        value: "sports_fitness", label: "Fitness i siłownia",
        subcategories: ["Hantle i sztangi", "Ławki i stojaki", "Gumy oporowe", "Maty do ćwiczeń", "Rowerki stacjonarne", "Bieżnie", "Orbitreki", "Kettlebells", "Skakankę", "Akcesoria do jogi"]
      },
      {
        value: "sports_cycling", label: "Rowery i hulajnogi",
        subcategories: ["Rowery górskie (MTB)", "Rowery szosowe", "Rowery miejskie", "Rowery elektryczne (e-bike)", "Rowery dziecięce", "Hulajnogi elektryczne", "Części rowerowe", "Kaski rowerowe", "Odzież rowerowa"]
      },
      {
        value: "sports_winter", label: "Sporty zimowe",
        subcategories: ["Narty zjazdowe", "Buty narciarskie", "Deski snowboard", "Kijki narciarskie", "Gogle narciarskie", "Kaski narciarskie", "Łyżwy", "Odzież narciarska"]
      },
      {
        value: "sports_water", label: "Sporty wodne",
        subcategories: ["Deski surfingowe i SUP", "Kajaki i wiosła", "Sprzęt do nurkowania", "Pływanie (okulary, czepki)", "Wędkarstwo", "Żeglarstwo"]
      },
      {
        value: "sports_team", label: "Sporty zespołowe",
        subcategories: ["Piłka nożna", "Koszykówka", "Siatkówka", "Tenis i badminton", "Golf", "Rugby i futbol", "Hokej"]
      },
      {
        value: "sports_outdoor", label: "Outdoor i turystyka",
        subcategories: ["Plecaki turystyczne", "Buty trekkingowe", "Namioty i śpiwory", "Latarki i czołówki", "Kurtki outdoorowe", "Kijki trekkingowe", "Mapy i kompasy"]
      },
    ],
  },
  {
    group: "Książki",
    icon: "📚",
    items: [
      {
        value: "books_fiction", label: "Beletrystyka",
        subcategories: ["Kryminały i thrillery", "Romans i obyczajowe", "Fantasy i sci-fi", "Horror", "Literatura klasyczna", "Powieści historyczne", "Literatura zagraniczna"]
      },
      {
        value: "books_nonfiction", label: "Literatura faktu",
        subcategories: ["Biografie i autobiografie", "Historia", "Reportaże", "Psychologia", "Biznes i ekonomia", "Nauka i technika", "Polityka i społeczeństwo", "Kulinaria", "Poradniki"]
      },
      {
        value: "books_kids", label: "Książki dla dzieci",
        subcategories: ["Książki dla niemowląt", "Bajki i baśnie", "Książki edukacyjne", "Komiksy dla dzieci", "Książki dla młodzieży"]
      },
      {
        value: "books_comics", label: "Komiksy i mangi",
        subcategories: ["Komiksy superbohaterów (Marvel/DC)", "Komiksy europejskie", "Manga", "Powieści graficzne", "Komiksy polskie"]
      },
      {
        value: "books_textbooks", label: "Podręczniki",
        subcategories: ["Szkoła podstawowa", "Liceum i technikum", "Studia wyższe", "Języki obce", "Kursy i certyfikaty"]
      },
    ],
  },
  {
    group: "Uroda",
    icon: "💄",
    items: [
      {
        value: "beauty_cosmetics", label: "Kosmetyki",
        subcategories: ["Podkłady i pudry", "Szminki i błyszczyki", "Tusze i eyelinery", "Cienie do powiek", "Róże i rozświetlacze", "Zestawy do makijażu", "Pędzle i akcesoria"]
      },
      {
        value: "beauty_perfumes", label: "Perfumy",
        subcategories: ["Perfumy damskie", "Perfumy męskie", "Wody toaletowe", "Zestawy zapachowe", "Dezodoranty i antyperspiranty"]
      },
      {
        value: "beauty_haircare", label: "Pielęgnacja włosów",
        subcategories: ["Szampony", "Odżywki i maski", "Olejki do włosów", "Stylizacja (żele, pianki)", "Prostownice i lokówki", "Suszarki do włosów", "Szczotki i grzebienie", "Farby do włosów"]
      },
      {
        value: "beauty_skincare", label: "Pielęgnacja skóry",
        subcategories: ["Kremy do twarzy", "Serum i ampułki", "Maseczki", "Płyny micelarne i tonery", "Kremy do rąk i ciała", "Filtry UV i ochrona słoneczna", "Akcesoria do pielęgnacji twarzy"]
      },
    ],
  },
  {
    group: "Motoryzacja",
    icon: "🚗",
    items: [
      {
        value: "automotive_parts", label: "Części samochodowe",
        subcategories: ["Silnik i osprzęt", "Układ hamulcowy", "Zawieszenie i układ kierowniczy", "Chłodzenie", "Elektryka i elektronika", "Nadwozie i karoseria", "Opony i felgi", "Filtry i płyny"]
      },
      {
        value: "automotive_accessories", label: "Akcesoria samochodowe",
        subcategories: ["Dywaniki i pokrowce", "Kosmetyki samochodowe", "Nawigacje i GPS", "Kamery cofania i dashcamy", "Ładowarki samochodowe", "Foteliki dziecięce", "Bagażniki dachowe"]
      },
      {
        value: "automotive_tools", label: "Narzędzia motoryzacyjne",
        subcategories: ["Klucze i zestawy", "Urządzenia diagnostyczne OBD", "Prostowniki i startery", "Kompresory i pompki", "Podnośniki i stojaki"]
      },
    ],
  },
  {
    group: "Zwierzęta",
    icon: "🐾",
    items: [
      {
        value: "pet_food", label: "Karma dla zwierząt",
        subcategories: ["Karma dla psa — sucha", "Karma dla psa — mokra", "Karma dla kota — sucha", "Karma dla kota — mokra", "Karma dla gryzoni", "Karma dla ptaków", "Karma dla ryb"]
      },
      {
        value: "pet_accessories", label: "Akcesoria dla zwierząt",
        subcategories: ["Obroże i smycze", "Transportery i klatki", "Legowiska i koty domki", "Miski i poidła", "Zabawki dla zwierząt", "Żwirek i podłoże", "Akwaria i akcesoria"]
      },
      {
        value: "pet_clothing", label: "Ubranka dla zwierząt",
        subcategories: ["Ubranko dla psa", "Buty dla psa", "Swetry i kurtki dla psa"]
      },
    ],
  },
  {
    group: "Zdrowie",
    icon: "💊",
    items: [
      {
        value: "food_supplements", label: "Suplementy diety",
        subcategories: ["Witaminy i minerały", "Białko i odżywki", "Omega-3 i kwasy tłuszczowe", "Probiotyki", "Suplementy sportowe", "Zioła i herbatki"]
      },
      {
        value: "health_medical", label: "Sprzęt medyczny",
        subcategories: ["Ciśnieniomierze", "Glukometry", "Inhalatory i nebulizatory", "Termometry", "Ortezy i stabilizatory", "Kule i chodziki", "Wózki inwalidzkie", "Materace rehabilitacyjne"]
      },
    ],
  },
  {
    group: "Muzyka",
    icon: "🎵",
    items: [
      {
        value: "music_instruments", label: "Instrumenty muzyczne",
        subcategories: ["Gitary akustyczne", "Gitary elektryczne", "Basy gitarowe", "Pianina i keyboardy", "Perkusja i perkusjonalia", "Instrumenty dęte", "Instrumenty smyczkowe", "Ukulele", "Akcesoria muzyczne"]
      },
      {
        value: "music_vinyl", label: "Płyty winylowe",
        subcategories: ["Rock i pop", "Jazz i blues", "Klasyka", "Elektronika", "Reggae i soul", "Metal", "Polskie wydania"]
      },
    ],
  },
  {
    group: "Sztuka i kolekcje",
    icon: "🎨",
    items: [
      {
        value: "art_paintings", label: "Obrazy i grafiki",
        subcategories: ["Malarstwo olejne", "Akwarele", "Grafiki i plakaty", "Fotografie artystyczne", "Rysunki", "Druki limitowane"]
      },
      {
        value: "art_collectibles", label: "Kolekcjonerstwo",
        subcategories: ["Monety i banknoty", "Znaczki pocztowe", "Karty kolekcjonerskie (Pokémon, FIFA)", "Figurki kolekcjonerskie", "Modele i miniatury", "Militaria i odznaki", "Antyki", "Pamiątki sportowe"]
      },
    ],
  },
  {
    group: "Inne",
    icon: "📦",
    items: [
      { value: "other", label: "Inne", subcategories: [] },
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

// Flat list of all subcategories grouped by category value
export const SUBCATEGORIES_BY_CATEGORY = Object.fromEntries(
  CATEGORY_GROUPS.flatMap(g => g.items.map(i => [i.value, i.subcategories || []]))
);