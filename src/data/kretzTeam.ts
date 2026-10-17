export interface TeamMember {
  id: string;
  name: string;
  role: string;
  category: 'founders' | 'partners' | 'executives' | 'regional' | 'matriarch';
  bio: string;
  image: string;
  remoteImage?: string;
  location: string;
  specialty: string;
  languages: string[];
  phone: string;
  email: string;
  netflixFeatured?: boolean;
}

export const KRETZ_CORE_LEADERSHIP: TeamMember[] = [
  {
    "id": "olivier-kretz",
    "name": "Olivier Kretz",
    "role": "Founder & Managing Partner",
    "category": "founders",
    "bio": "Founded Kretz Real Estate in 2007 with Sandrine after 25 years in senior executive leadership at Procter & Gamble and Lexmark. Olivier steers the global strategy, high-profile family office relations, and oversees ultra-confidential private acquisitions across France and international luxury capitals.",
    "image": "/src/assets/images/team/olivier_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/4929ede2b815e7353ffa822ced3380.jpg",
    "location": "Paris & Boulogne-Billancourt, France",
    "specialty": "Family Office Advisory & Off-Market Flagships",
    "languages": [
      "French",
      "English",
      "Spanish"
    ],
    "phone": "+33 (0)1 41 10 91 22",
    "email": "olivier@kretzrealestate.com",
    "netflixFeatured": true
  },
  {
    "id": "sandrine-kretz",
    "name": "Sandrine Kretz",
    "role": "Co-Founder & Associate Director",
    "category": "founders",
    "bio": "Co-founder with Olivier. Former educator with an extraordinary instinct for architectural harmony, exceptional interior design, and lifestyle potential. Sandrine curates the agency’s most poetic residences, private châteaux, and leads bespoke client staging and confidential representation.",
    "image": "/src/assets/images/team/sandrine_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/0e1bfd6464958b18e6e5786a9bdcc0.jpg",
    "location": "Paris & French Riviera, France",
    "specialty": "Historic Mansions, Châteaux & Architectural Staging",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)1 41 10 91 22",
    "email": "sandrine@kretz.fr",
    "netflixFeatured": true
  },
  {
    "id": "martin-kretz",
    "name": "Martin Kretz",
    "role": "Managing Director · Associate Director",
    "category": "partners",
    "bio": "Eldest son and Managing Director of Kretz & Partners. Graduate in business administration and luxury marketing. Leading figure in prestige Parisian apartments, private mansions (Hôtels Particuliers), and international expansion across Monaco and London.",
    "image": "/src/assets/images/team/martin_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/e3597ced4d5dc4d62ae87be13b8f059.jpg",
    "location": "Paris (Left & Right Bank) & Monaco",
    "specialty": "Hôtels Particuliers, Penthouses & Monaco Prime Assets",
    "languages": [
      "French",
      "English",
      "Spanish"
    ],
    "phone": "+33 (0)1 41 10 91 22",
    "email": "martin@kretz.fr",
    "netflixFeatured": true
  },
  {
    "id": "valentin-kretz",
    "name": "Valentin Kretz",
    "role": "Associate Director · Luxury Estates & Transatlantic",
    "category": "partners",
    "bio": "Second son. Mathematical and engineering background. Formative career in international luxury development in New York and the Philippines before returning to propel Kretz’s transatlantic partnerships, prime Riviera waterfronts, and tokenized real estate ventures.",
    "image": "/src/assets/images/team/valentin_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/99ed804445ec781b934f157307a135.jpg",
    "location": "Paris, Côte d’Azur & New York",
    "specialty": "Waterfront Villas, US-European Investments & Tokenization",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)1 41 10 91 22",
    "email": "valentin@kretz.fr",
    "netflixFeatured": true
  },
  {
    "id": "louis-kretz",
    "name": "Louis Kretz",
    "role": "Associate Director · Spain & Latin America",
    "category": "partners",
    "bio": "Third son. Directs digital strategy, media innovations, and high-yield seasonal luxury rentals. Instrumental in scaling Kretz’s presence in Spain (Barcelona, Ibiza, Mallorca) and pioneering Web3 fractionalized liquidity for prime real estate assets.",
    "image": "/src/assets/images/team/louis_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/e148e2d574a8577f2dc4db58923b4a8.jpg",
    "location": "Barcelona & Balearic Islands, Spain",
    "specialty": "Iberian Waterfronts, Fincas & Prime Rental Yields",
    "languages": [
      "French",
      "English",
      "Spanish"
    ],
    "phone": "+34 682 843 463",
    "email": "louis@kretzrealestate.com",
    "netflixFeatured": true
  },
  {
    "id": "raphael-kretz",
    "name": "Raphaël Kretz",
    "role": "Associate Director & Commercial Advisor",
    "category": "partners",
    "bio": "Youngest son. Bringing fresh dynamic energy, modern digital perspectives, and a sharp focus on emerging luxury residential lofts, architectural artist studios, and next-generation European tech entrepreneurs entering real estate wealth preservation.",
    "image": "/src/assets/images/team/raphael_kretz.jpg",
    "remoteImage": "https://files.kretzrealestate.com/c56649d66abef1a56114544f45a952b7.jpg",
    "location": "Paris & Western Suburbs, France",
    "specialty": "Contemporary Lofts, Artist Ateliers & Urban Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 58 00 15 76",
    "email": "raphael@kretzrealestate.com",
    "netflixFeatured": true
  },
  {
    "id": "alexandre-bruneau",
    "name": "Alexandre Bruneau",
    "role": "Chief Executive Officer (CEO)",
    "category": "executives",
    "bio": "Experienced corporate executive steering the operational scaling of Kretz Real Estate, orchestrating the international network of over 100 dedicated advisors, institutional partnerships, and regulatory structuring for European real estate tokenization.",
    "image": "/src/assets/images/team/alexandre_bruneau.jpg",
    "remoteImage": "https://files.kretzrealestate.com/d2db691fe7f1baa19e2443f3b53737b9.jpg",
    "location": "Paris Corporate Headquarters",
    "specialty": "Corporate Strategy, Institutional Partnerships & Scaling",
    "languages": [
      "French",
      "English",
      "German"
    ],
    "phone": "+33 6 21 61 09 36",
    "email": "alexandre.bruneau@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "adriana-pinos",
    "name": "Adriana Pinos",
    "role": "Partner · Director Kretz Spain & Balearics",
    "category": "executives",
    "bio": "Leads Kretz Real Estate Spain and Balearic operations from Madrid and Ibiza. Specialist in ultra-exclusive Mediterranean waterfront villas, country fincas, and cross-border European investor portfolios seeking prime sun-belt yields.",
    "image": "/src/assets/images/team/adriana_pinos.jpg",
    "remoteImage": "https://files.kretzrealestate.com/ecb44ae86606eb4eda62039225f46.jpg",
    "location": "Barcelona, Madrid & Ibiza, Spain",
    "specialty": "Balearic Waterfronts & Prime Iberian Estates",
    "languages": [
      "Spanish",
      "English",
      "French"
    ],
    "phone": "+34 634 431 108",
    "email": "adriana@kretzrealestate.com",
    "netflixFeatured": true
  },
  {
    "id": "yann-miossec",
    "name": "Yann Miossec",
    "role": "Director of Operations",
    "category": "executives",
    "bio": "Oversees daily operational execution, transactional workflows, compliance standards, and administrative support across Kretz Real Estate offices throughout France and international branches.",
    "image": "/src/assets/images/team/yann_miossec.jpg",
    "remoteImage": "https://files.kretzrealestate.com/ddb0e124cfbf3380425a9c124b89cb0.jpg",
    "location": "Paris Head Office, France",
    "specialty": "Operational Excellence & Escrow Execution",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 82 56 28 18",
    "email": "yann@kretz.fr",
    "netflixFeatured": false
  },
  {
    "id": "jimmy-delage",
    "name": "Jimmy Delage",
    "role": "Associate Director · Paris Prime",
    "category": "executives",
    "bio": "Premier real estate consultant in the Golden Triangle and 16th arrondissement of Paris. Dedicated to high-profile diplomatic residences, private mansions, and luxury family duplexes.",
    "image": "/src/assets/images/team/jimmy_delage.jpg",
    "remoteImage": "https://files.kretzrealestate.com/35ba22829fe974131fe731db7b1c1dc.jpg",
    "location": "Paris (16th & Golden Triangle)",
    "specialty": "Golden Triangle Apartments & Diplomatic Residencies",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 61 59 51 80",
    "email": "jimmy.delage@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "lisa-azzarone",
    "name": "Lisa Azzarone",
    "role": "Head of Digital & Social Media Strategy",
    "category": "executives",
    "bio": "With a background at global luxury cosmetic leaders and brand communication agencies, Lisa directs Kretz Real Estate global media channels and social storytelling, driving multi-million digital reach.",
    "image": "/src/assets/images/team/lisa_azzarone.jpg",
    "remoteImage": "https://files.kretzrealestate.com/da3d69b85d3b84fe37f96807737bf1f.jpg",
    "location": "Paris Head Office, France",
    "specialty": "Digital Marketing, Social Media Strategy & Brand Media",
    "languages": [
      "French",
      "English",
      "Italian"
    ],
    "phone": "+33 7 70 47 96 22",
    "email": "lisa@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "clementine-busset",
    "name": "Clémentine Busset",
    "role": "Commercial Operations & Client Executive",
    "category": "executives",
    "bio": "Crucial pillar of the Parisian head office coordinating exclusive mandate documentation, VIP client relations, and transactions support for the family directors.",
    "image": "/src/assets/images/team/clementine_busset.jpg",
    "remoteImage": "https://files.kretzrealestate.com/fc195bbe53cf6cfded49e78975e5aeb.jpg",
    "location": "Paris Head Office, France",
    "specialty": "Exclusive Mandates & Transaction Coordination",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 45 32 55 04",
    "email": "clementine.busset@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "mathilde-mas",
    "name": "Mathilde Mas",
    "role": "Brand & Social Media Specialist",
    "category": "executives",
    "bio": "Master in Social Media Strategy with prior luxury real estate marketing experience in Bali. Spearheading content creation and digital engagement for Kretz properties.",
    "image": "/src/assets/images/team/mathilde_mas.jpg",
    "remoteImage": "https://files.kretzrealestate.com/76b7cc7116299d18f725d0f0c1e31bb.jpg",
    "location": "Paris Head Office, France",
    "specialty": "Social Video, Editorial Content & Digital Campaigns",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)6 52 64 82 26",
    "email": "mathilde.mas@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "amandine-landois",
    "name": "Amandine Landois",
    "role": "Sales Coordinator & Advisor Support",
    "category": "executives",
    "bio": "Over 12 years of luxury real estate experience as commercial agent and agency manager. Providing daily high-level support and coordination to Kretz agents across France.",
    "image": "/src/assets/images/team/amandine_landois.jpg",
    "remoteImage": "https://files.kretzrealestate.com/8353c188bfd272a87297fb9892bdb74c.jpg",
    "location": "Paris Head Office, France",
    "specialty": "Advisor Support, Network Training & Sales Enablement",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)6 25 89 70 51",
    "email": "amandine.landois@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "jorge-de-andres",
    "name": "Jorge De Andrés",
    "role": "Partner & Real Estate Consultant · Madrid",
    "category": "executives",
    "bio": "Born in Madrid and passionate about high-end architectural brokerage. Experienced investor and entrepreneur combining personalized client service with deep knowledge of Salamanca and Jerónimos.",
    "image": "/src/assets/images/team/jorge_de_andres.jpg",
    "remoteImage": "https://files.kretzrealestate.com/4766e7ad6acfa8eb806e887f91fe681d.jpg",
    "location": "Madrid, Spain",
    "specialty": "Madrid Prime Real Estate & Historic Palacetes",
    "languages": [
      "Spanish",
      "English",
      "French"
    ],
    "phone": "+34 620 820 454",
    "email": "jorge.deandres@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "camille-richard",
    "name": "Camille Richard",
    "role": "Commercial Support Spain",
    "category": "executives",
    "bio": "Based in Barcelona for 5 years with international corporate background. Coordinates commercial support, client inquiries, and transaction logistics for Kretz Real Estate Spain.",
    "image": "/src/assets/images/team/camille_richard.jpg",
    "remoteImage": "https://files.kretzrealestate.com/e46d42ad35647a1556fcafa726a796.jpg",
    "location": "Barcelona, Spain",
    "specialty": "Spanish Commercial Support & Client Operations",
    "languages": [
      "French",
      "Spanish",
      "English"
    ],
    "phone": "+34 682 843 463",
    "email": "camille.richard@kretzrealestate.com",
    "netflixFeatured": false
  }
];

export const KRETZ_REGIONAL_ADVISORS: TeamMember[] = [
  {
    "id": "matthieu-aliaga",
    "name": "Matthieu Aliaga",
    "role": "Prestige Real Estate Advisor · Provence-Alpes-Côte d'Azur",
    "category": "regional",
    "bio": "Votre expert en immobilier de prestige en Provence (Avignon, Luberon, Alpilles, Uzès et Mont-Ventoux).\nPassionné par l’immobilier depuis près de dix ans, j’accompagne une clientèle exigeante avec un sens du service authentique, dans l’esprit et le savoir-faire de la famille Kretz.\n\nJe suis spécialisé dans la sélection et la commercialisation de propriétés d’exception : bastides de charme, mas provençaux, hôtels particuliers ou résidences contemporaines, toutes offrant des prestations haut de gamme et un art de vivre unique.",
    "image": "https://files.kretzrealestate.com/a21d8297411d3cd5cc1ed81631f182.jpg",
    "location": "Provence-Alpes-Côte d'Azur",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33(0)6 17 84 57 03",
    "email": "matthieu.aliaga@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "yoann-amiach",
    "name": "Yoann Amiach",
    "role": "Prestige Real Estate Advisor · Provence-Alpes-Côte d'Azur",
    "category": "regional",
    "bio": "« La vie sera ton aventure, l'ambition ton carburant, tu feras le tour du monde de tes talents. » Cette phrase a guidé mon parcours. Après dix ans à voyager et entreprendre à travers le monde, j’ai choisi de m’installer à Nice, proche de la mer, du soleil et des montagnes. \n\nAujourd’hui, je vis l’immobilier de prestige comme une véritable passion, alliant relations humaines, expertise commerciale et dimension internationale, faisant de chaque jour une nouvelle aventure.",
    "image": "https://files.kretzrealestate.com/765d4914b7f4e6e28277da81712283b.jpg",
    "location": "Provence-Alpes-Côte d'Azur",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 20 13 19 82 ",
    "email": "yoann.amiach@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "damien-bertrand",
    "name": "Damien Bertrand",
    "role": "Prestige Real Estate Advisor · Provence-Alpes-Côte d'Azur",
    "category": "regional",
    "bio": "Originally from the Alps!# graduated with a Master 2 in Business School!# I worked for nearly 7 years in the luxury automobile for a prestigious English brand. In search of new experiences!# I traveled around the world in 2016 for 2 years and visited more than 25 countries. Enriched by these trips!# I joined the Kretz Family in 2021 to develop my region of origin!# Provence.",
    "image": "https://files.kretzrealestate.com/5f379ccfd5f3cb53ad860e6c91a5f2c.jpg",
    "location": "Provence-Alpes-Côte d'Azur",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 48 43 54 45",
    "email": "damien@kretz.fr",
    "netflixFeatured": false
  },
  {
    "id": "lisa-azzarone",
    "name": "Lisa Azzarone",
    "role": "Prestige Real Estate Advisor · Paris",
    "category": "regional",
    "bio": "With a strong interest in innovation and digital transformation!# I graduated from a business school and also studied science!# which allowed me to travel the globe to discover new cultures. Driven by challenges!# I was able to work for L'Oréal!# a world leader in cosmetics!# before joining a marketing and communication agency to be closer to the client. Surrounded by real estate professionals and sharing the values of the family!# it is with pleasure that I accompany the Kretz Agency to mark the hearts and minds.",
    "image": "https://files.kretzrealestate.com/da3d69b85d3b84fe37f96807737bf1f.jpg",
    "location": "Ile-de-France/Paris",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 7 70 47 96 22",
    "email": "lisa@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "alexandre-bruneau",
    "name": "Alexandre Bruneau",
    "role": "Prestige Real Estate Advisor · Paris",
    "category": "regional",
    "bio": "Dedicated luxury property advisor representing exceptional estates in FR/Ile-de-France/Paris. Part of the Kretz Real Estate international network.",
    "image": "https://files.kretzrealestate.com/d2db691fe7f1baa19e2443f3b53737b9.jpg",
    "location": "Ile-de-France/Paris",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "06 21 61 09 36",
    "email": "alexandre.bruneau@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "cl-mentine-busset",
    "name": "Clémentine Busset",
    "role": "Prestige Real Estate Advisor · Paris",
    "category": "regional",
    "bio": "Dedicated luxury property advisor representing exceptional estates in FR/Ile-de-France/Paris. Part of the Kretz Real Estate international network.",
    "image": "https://files.kretzrealestate.com/fc195bbe53cf6cfded49e78975e5aeb.jpg",
    "location": "Ile-de-France/Paris",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "0645325504",
    "email": "clementine.busset@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "elisabeth-kozulina",
    "name": "Elisabeth Kozulina",
    "role": "Prestige Real Estate Advisor · Monaco",
    "category": "regional",
    "bio": "Originally from Moscow!# I graduated from a business school in Nice!# including a year in Finland. I speak fluent French!# Russian and English. I have 14 years of experience in luxury real estate in Monaco. I became branch director in 2011!# then associate director in 2018. Determined!# serious and attentive to my clients. I join the KRETZ group in 2023.",
    "image": "https://files.kretzrealestate.com/1842da39d2a944abba68e73e6a96b7a.jpg",
    "location": "Monaco",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 40 84 21 87",
    "email": "elisabeth@kretz.fr",
    "netflixFeatured": false
  },
  {
    "id": "elodie-stienlet",
    "name": "Elodie Stienlet",
    "role": "Prestige Real Estate Advisor · Monaco",
    "category": "regional",
    "bio": "Originally from the French West Indies!# I arrived in Monaco after a detour via Australia and my business school diploma in hand. Solar!# audacious!# intuitive and endowed with a great sense of humor!# I have been able to find a place for myself on the exclusive Monegasque real estate market for more than seven years. Always looking for new challenges!# I joined the Kretz group in 2023.",
    "image": "https://files.kretzrealestate.com/36b0bf48c7bed158607a407d79f95d52.jpg",
    "location": "Monaco",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 33 74 50 13",
    "email": "elodie@kretz.fr",
    "netflixFeatured": false
  },
  {
    "id": "chris-cretin",
    "name": "Chris Cretin",
    "role": "Prestige Real Estate Advisor · Saint-Barthélemy",
    "category": "regional",
    "bio": "Dedicated luxury property advisor representing exceptional estates in BL/Saint-Barthélemy. Part of the Kretz Real Estate international network.",
    "image": "https://files.kretzrealestate.com/f0c6ac7557ed87929f64f34c1e2d5f8.jpg",
    "location": "Saint-Barthélemy",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)7 86 21 81 57",
    "email": "chris@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "janet-lando-cretin",
    "name": "Janet Lando Cretin",
    "role": "Prestige Real Estate Advisor · Saint-Barthélemy",
    "category": "regional",
    "bio": "Chris!# began his career at the Ritz in Paris. At the age of 23!# he moved to Saint Barthelemy where he created two successful restaurants and several luxury fashion boutiques.\r\nJanet!# his wife!# of Russian-Polish origin!# speaks 6 languages and has been working for over 20 years in the world of luxury and fashion. \r\nTogether!# they share their professional and family life between Paris and Saint Barthelemy with Roman!# their 9 year old child. \r\nWith their experience with high-end international clients!# Chris and Janet will join the extended Kretz family in May 2023 to develop the market on the island of Saint Barthelemy.",
    "image": "https://files.kretzrealestate.com/f0c6ac7557ed87929f64f34c1e2d5f8.jpg",
    "location": "Saint-Barthélemy",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)6 13 71 01 60",
    "email": "janet@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "adrian-bouchout",
    "name": "Adrian Bouchout",
    "role": "Prestige Real Estate Advisor · New York",
    "category": "regional",
    "bio": "I was born in 1999 in New York City where I lived my first years before leaving at the age of 5 for Trinidad and Tobago.\r\nDuring my childhood I kept in touch with France!# spending every summer with my family and cousins and thus maintaining my French. I had a happy youth!# rich in cultural!# sports and linguistic experiences. In 2011!# I moved back to Florida with my mom!# my half-brother and my half-sister. \r\nI graduated from the University of Central Florida (UFC) with a Bachelor's degree in Business. I have always worked odd jobs during my studies. I am passionate about basketball and music. I speak English and French fluently and have a good command of Spanish.\r\nI am very excited to be a part of the Kretz company.",
    "image": "https://files.kretzrealestate.com/72b8387bbcbd66dbee817a5ab067ebd4.jpg",
    "location": "New York/New York",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+1 (407) 860-0871",
    "email": "adrian@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "matthieu-bouchout",
    "name": "Matthieu Bouchout",
    "role": "Prestige Real Estate Advisor · New York",
    "category": "regional",
    "bio": "I am a Bourguignon (from Burgundy)!# and I hold a Master's degree in Business Administration. I developed a keen interest in entrepreneurship as a child through spending time with my Jura-based uncles!# who were Europe's largest snowboard manufacturers at the time. In 1997!# I completed a real estate internship in New York. Since then!# I never left this industry that captivated me!# nor the city that fascinated me!# and in 2004!# I founded my own agency!# HarmoNYCity. With my natural ability to connect with people!# hard work!# and my sense of interior design!# I have successfully closed hundreds of sales for various types of properties!# from houses in Brooklyn to classic New York artist lofts!# to iconic Manhattan skyscrapers. Neither the September 11th attacks!# nor the 2008 financial crisis!# nor Hurricane Sandy!# nor the most recent pandemic could stop me. Therefore!# it is only natural that my existing team!# including my son Adrian and myself!# join forces with our former intern!# Valentin Kretz!# to exclusively represent the Kretz family in New York and embrace new challenges.",
    "image": "https://files.kretzrealestate.com/abf834c59f136b70ccbd9d84562534e.jpg",
    "location": "New York/New York",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+1 (917) 723-4166",
    "email": "matthieu@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "fabrice-correia",
    "name": "Fabrice Correia",
    "role": "Prestige Real Estate Advisor · New York",
    "category": "regional",
    "bio": "Born in Burgundy and having grown up in Paris!# I had the opportunity to spend a lot of time between the city and the countryside since my youngest years. In order to validate a Master in Business Administration!# I had the opportunity in 2007 to fly to New York to do my end-of-studies internship. What was supposed to be a one-year experience in a real estate agency has finally become the place I now call home! The curiosity!# creativity and unique energy of New York made me want to explore it more. It became clear that I wanted to use these essential qualities when helping people in their search for accommodation. I have always been fascinated by the architecture of New York and its rapid rate of growth and change. New York manages to constantly give life to new development projects while maintaining its \"melting pot\" identity. After spending 10 years in the agency that hosted me for my internship!# I had the opportunity to join Mathieu and his dynamic team at Harmonycity in 2017. I made sure to use my in-depth knowledge of the market real estate to successfully support all types of clients (expatriates with their specific rental needs but also local and foreign investors with their purchase in New York). I am very happy to join the Kretz family in this unique city and I am committed to bringing the same energy there. I speak fluently French!# English!# Spanish and Portuguese and I also have notions of Italian.",
    "image": "https://files.kretzrealestate.com/3e4dfe96b3e59069c6602e71198b4b96.jpg",
    "location": "New York/New York",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+1 (347) 755-2144",
    "email": "fabrice@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "lamia-ammar",
    "name": "Lamia Ammar",
    "role": "Prestige Real Estate Advisor · Marrakech",
    "category": "regional",
    "bio": "Born and raised in Morocco!# I continued my studies in Nice before graduating from EDHEC business school. After gaining experience in banking and real estate investment in Paris!# I was lucky enough to live in New York!# Australia and Japan. Married with two children!# I am passionate about traveling!# dance and theater. I'm a creative person with a human touch!# who enjoys taking on challenges and connecting with people. I'm fluent in French!# Arabic and English!# and have a basic knowledge of Spanish. For me!# finding atypical and authentic properties is an invitation to travel. I'm delighted to be joining the KRETZ family!# sharing their human values and their modern vision of real estate.",
    "image": "https://files.kretzrealestate.com/b87a97fb7cd9f8038902e38c746a3.jpg",
    "location": "Marrakech-Safi/Marrakech",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+212 662‑460627",
    "email": "lamia.ammar@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "alexandre-decamps",
    "name": "Alexandre Decamps",
    "role": "Prestige Real Estate Advisor · Marrakech",
    "category": "regional",
    "bio": "I live in Paris with my partner and my three children. With a Master's degree in International Commerce in my pocket!# I founded a brand of golf clothing distributed in 7 countries. Endowed with a beautiful human sensitivity!# I created my own real estate agency in activity for 6 years before joining the Kretz family.",
    "image": "https://files.kretzrealestate.com/6a8e819bd7c68bdd9ade8f5d4c5b93f.jpg",
    "location": "Marrakech-Safi/Marrakech",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 6 88 21 76 38",
    "email": "alexandre@kretz.fr",
    "netflixFeatured": false
  },
  {
    "id": "mariem-jaouhari",
    "name": "Mariem Jaouhari",
    "role": "Prestige Real Estate Advisor · Ile-de-France",
    "category": "regional",
    "bio": "Née à Tanger, où j’ai grandi, j’ai ensuite poursuivi mes études à Paris puis à Lyon. Diplômée de l’EM Lyon, j’ai construit un parcours international dans la finance de marché, entre le Mexique, New York et Paris, en exerçant notamment en tant que broker, trader, banquière privée et conseillère auprès de family offices parisiens.\n\nEntrepreneure dans l’âme, j’ai également fondé il y a quatre ans une marque de bijoux personnalisés aujourd’hui présente à l’international. Cette double culture, alliant rigueur financière et sensibilité esthétique, m’a naturellement conduite vers l’univers de l’immobilier de prestige.\n\nPolyglotte, je parle couramment l’arabe, le français, l’espagnol et l’anglais. Aujourd’hui, mon ambition est de valoriser et développer l’immobilier d’exception entre le Maroc et Paris.\n\nC’est avec un immense enthousiasme que je rejoins la famille Kretz afin de contribuer à cette aventure portée par l’excellence, la passion et une vision singulière du métier.",
    "image": "https://files.kretzrealestate.com/457ba90ce46432dd5eab5aa949dcb10.jpg",
    "location": "Ile-de-France",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "0751238313",
    "email": "mariem.jaouhari@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "erika-gordon",
    "name": "Erika Gordon",
    "role": "Prestige Real Estate Advisor · Barcelone",
    "category": "regional",
    "bio": "I'm Franco-British and have lived in Barcelona!# Spain since 2007. After working in sales for years!# I decided to change my industry to focus on selling what I really loved!# which was... luxury real estate. An opportunity to work on unique properties that most people only dream of. I have been working in this sector since 2016 but wanted to find a company that shared the same values and the same culture. I have experience with clients from all corners of the world and I am very happy to start this journey with the Kretz family.",
    "image": "https://files.kretzrealestate.com/6437ff5df4cf8436fbbcaeb460faa21d.jpg",
    "location": "Catalogne/Barcelone",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+34 677 671 993",
    "email": "erika@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "adriana-pinos",
    "name": "Adriana Pinos",
    "role": "Prestige Real Estate Advisor · Barcelone",
    "category": "regional",
    "bio": "Born under the Chilean sun in Concepción, I am the perfect blend of my father's Spanish influences and my mother's French elegance. I consider myself a true adventurer, constantly eager for new discoveries, with a deep passion for dance and theater. With a Master's degree in International Business Strategy in hand, the first chapters of my career unfolded at a renowned French bank, where I had the privilege of bringing our clients' export projects to life.  \n\nIn 2020, an exciting new chapter began at KRETZ, an agency where the term \"family\" truly takes on its full meaning. My role as Head of Commercial Coordination provided me with a canvas to fully express my skills, making a significant contribution to the company's growth and success.  \n\nThe year 2023 marked a turning point, as I settled in Barcelona. Alongside my husband, Louis Kretz, I took the helm of KRETZ's Spanish branch as co-manager.  \n",
    "image": "https://files.kretzrealestate.com/ecb44ae86606eb4eda62039225f46.jpg",
    "location": "Catalogne/Barcelone",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+34 634 431 108",
    "email": "adriana@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "camille-richard",
    "name": "Camille Richard",
    "role": "Prestige Real Estate Advisor · Barcelone",
    "category": "regional",
    "bio": "Originaire de région parisienne et suite à plusieurs allers-retours dans la capitale catalane pendant mes études en commerce international, j'ai décidé de m'installer définitivement il y a 5 ans à Barcelone. Après une expérience en tant qu'Ingénieur d'Affaires IT pour une société de conseil internationale, je rejoins l'aventure Kretz Real Estate Spain comme Responsable du Support Commercial pour l'Espagne.",
    "image": "https://files.kretzrealestate.com/e46d42ad35647a1556fcafa726a796.jpg",
    "location": "Catalogne/Barcelone",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+34 682 843 463",
    "email": "camille.richard@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "alejandro-amaya",
    "name": "Alejandro Amaya",
    "role": "Prestige Real Estate Advisor · Madrid",
    "category": "regional",
    "bio": "A 34-year-old Colombian-Mexican, I have over eight years’ experience in the luxury sector, supporting international clients with an approach based on trust and personalised service.\n\nPassionate about architecture, design and interior design, I have been living in Madrid for four years, where I have combined my experience in the luxury sector with my interest in the property market.\n\nI believe that behind every property and every client there is a unique story, and that the best opportunities arise from genuine connections.",
    "image": "https://files.kretzrealestate.com/df4ceaa698a25d4749429cd36f5e7b5.jpg",
    "location": "Madrid/Madrid",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "34604923233",
    "email": "alejandro.amaya@kretzrealestate.com ",
    "netflixFeatured": false
  },
  {
    "id": "jorge-de-andr-s",
    "name": "Jorge De Andrés",
    "role": "Prestige Real Estate Advisor · Madrid",
    "category": "regional",
    "bio": "Born in Madrid and in love with this city that never ceases to transform and surprise me. Although I started my professional career in the world of consultancy!# I soon realised that my true passion was sales and!# above all!# dealing with people. After some years in the commercial world I decided!# together with my wife!# to take the leap into the business world with the creation of several businesses!# some successful and others that were a great learning experience. As an investor and connoisseur of the real estate world for many years!# I finally managed to combine my two passions!# dedicating myself entirely to real estate brokerage. Now!# I am joining the Kretz family with whom I share their philosophy of life and their way of looking at this business!# always with a focus on people and relationships!# and from where I will be able to help you find your ideal home in this wonderful city.",
    "image": "https://files.kretzrealestate.com/4766e7ad6acfa8eb806e887f91fe681d.jpg",
    "location": "Madrid/Madrid",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+34 620 820 454",
    "email": "jorge.deandres@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "vanessa-gonz-lez",
    "name": "Vanessa González",
    "role": "Prestige Real Estate Advisor · Madrid",
    "category": "regional",
    "bio": "I was born in Vitoria and studied Business Management and Marketing at ESIC in Madrid. I began my career in marketing and communications, an experience I now bring to the real estate sector to understand each client’s needs and strategically position every property.\n\nI am passionate about providing personalized service based on trust, discretion, and attention to every detail. My goal: to simplify the complex and guide every transaction as if it were my own.",
    "image": "https://files.kretzrealestate.com/a1576934899c869d9a9d95a63b75b94.jpg",
    "location": "Madrid/Madrid",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+34 641 34 67 52",
    "email": "vanessa.gonzalez@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "julie-carlier",
    "name": "Julie CARLIER",
    "role": "Prestige Real Estate Advisor · all",
    "category": "regional",
    "bio": "Formée au journalisme à l’ULB, Julie a travaillé dans la communication et l’art contemporain avant de découvrir le courtage immobilier en 2013. Elle y trouve une véritable passion et ouvre sa première agence en 2018.\nAu fil des années, Julie suit ses clients dans des projets très différents : vente de leur propriété privée, acquisition d’un bien d’investissement ou projet de développement immobilier. Cette diversité lui donne une connaissance approfondie du marché et le goût des dossiers qui demandent à la fois de la réflexion, de la créativité et une grande attention aux personnes.\nSa rencontre avec la famille Kretz marque une nouvelle étape. Elle retrouve dans leur approche une vision de l’immobilier qui lui ressemble : placer l’humain au centre et imaginer pour chaque bien une stratégie de communication adaptée à son histoire et à ceux auxquels il s’adresse.\nAujourd’hui, Julie dirige l’agence et développe Kretz Real Estate en Belgique. Elle accompagne aussi ses agents au quotidien, apporte son regard sur leurs dossiers et les soutient dans leurs projets. Elle parle français et anglais.\n",
    "image": "https://files.kretzrealestate.com/322cb534ef6b11f57f673c74dd493ae1.jpg",
    "location": "all/all",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+33 (0)1 41 10 91 22",
    "email": "julie.carlier@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "audrey-carter",
    "name": "Audrey Carter",
    "role": "Prestige Real Estate Advisor · all",
    "category": "regional",
    "bio": "Chez Audrey, la rigueur de l’ingénieure commerciale rencontre l’enthousiasme de l’aventurière. Formée à l’ICHEC, elle aborde chaque projet avec méthode, tout en gardant le goût des rencontres et des découvertes. Elle a grandi à Monaco et parle français, anglais et espagnol.\n\nExcellente skieuse et joueuse de tennis, passionnée de voyages et de sports à sensations, Audrey aime relever de nouveaux défis. Cette énergie se retrouve dans son travail : elle vit chaque projet avec intensité et s’intéresse autant au potentiel d’un bien qu’aux personnes qui lui confient leur recherche ou leur vente.\n\nTrès humaine, Audrey donne beaucoup à ses clients. Elle associe une analyse précise à une écoute attentive et les accompagne avec chaleur, engagement et détermination.\n",
    "image": "https://files.kretzrealestate.com/98ad797a7a3e247d3d39fd4849c8bb91.jpg",
    "location": "all/all",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+32477202670",
    "email": "audrey.carter@kretzrealestate.com",
    "netflixFeatured": false
  },
  {
    "id": "amy-wright-contact",
    "name": "Amy Wright Contact",
    "role": "Prestige Real Estate Advisor · all",
    "category": "regional",
    "bio": "Amy accompagne le développement de la communication et du marketing de l’agence, en lien étroit avec le siège de Kretz Real Estate. En alternance au sein de l’équipe, elle contribue à faire vivre la marque en Belgique et à mettre en lumière les biens qui nous sont confiés.\n\nD’origine franco-anglaise, Amy parle couramment français et anglais. Passionnée de yoga, elle apporte à son travail de l’énergie, de la sensibilité et une attention particulière aux détails. Curieuse et investie, elle aime faire avancer les idées et leur donner forme au quotidien.",
    "image": "https://files.kretzrealestate.com/f5a7d9882d36b7aad2789e4e60b4c8.jpg",
    "location": "all/all",
    "specialty": "Luxury Residential & Private Estates",
    "languages": [
      "French",
      "English"
    ],
    "phone": "+3222405759",
    "email": "",
    "netflixFeatured": false
  }
];

export const ALL_KRETZ_MEMBERS: TeamMember[] = [
  ...KRETZ_CORE_LEADERSHIP,
  ...KRETZ_REGIONAL_ADVISORS
];
