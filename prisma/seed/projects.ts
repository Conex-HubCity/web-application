/**
 * Public project references for the local CNX demonstration seed.
 * Sources were checked on 2026-10-31; see SOURCES.md for provenance and credits.
 * People, mentoring scenarios, stages, teams and requested support are fictional.
 * The referenced organisations do not participate in or endorse this seed.
 */
export type SeedPresentationLink = { label: string; url: string };

export type SeedProject = {
  slug: string;
  title: string;
  countryCode: string;
  city: string;
  founder: {
    firstName: string;
    lastName: string;
    biography: string;
    skills: string[];
  };
  sector: string;
  stage: "IDEA" | "PROTOTYPE" | "LAUNCHED" | "GROWTH";
  summary: string;
  market: string;
  impact: string;
  team: string;
  risks: string;
  supportNeeds: string[];
  pitchUrl: string;
  socialLinks: SeedPresentationLink[];
  customLinks: SeedPresentationLink[];
  image: { filename: string; alt: string };
  sources: SeedPresentationLink[];
};

const paragraphs = (...parts: string[]) => parts.join("\n\n");
const demoNotice =
  "Fiche de démonstration CNX inspirée d’une organisation réelle. Le compte porteur, le stade affiché et le scénario d’accompagnement sont fictifs, sans affiliation avec l’organisation citée.";

export const seedProjects: SeedProject[] = [
  {
    slug: "coldhubs",
    title: "[Démo] ColdHubs — préserver les récoltes grâce au froid solaire",
    countryCode: "NG",
    city: "Owerri",
    founder: {
      firstName: "Amara",
      lastName: "Demo",
      biography:
        "Personnage fictif créé pour les tests CNX, sans lien avec ColdHubs. Dans ce scénario, Amara coordonne une coopérative de commerçantes et travaille sur la logistique des produits frais. Elle souhaite apprendre à négocier des partenariats de distribution et à piloter les coûts d’un service mutualisé.",
      skills: ["Logistique agricole", "Gestion de coopérative", "Opérations terrain"],
    },
    sector: "Agriculture et chaîne du froid",
    stage: "GROWTH",
    summary: paragraphs(
      "ColdHubs développe au Nigeria des chambres froides alimentées par l’énergie solaire, implantées près des marchés et des zones de production. Les agriculteurs et commerçants peuvent y conserver leurs denrées périssables et payer le stockage à la caisse, au lieu de financer eux-mêmes une installation complète.",
      "L’organisation présente également des services de transport frigorifique, des caisses réutilisables et des outils de suivi de la chaîne du froid. Ces activités servent ici de référence concrète pour explorer un modèle qui relie équipement, service de proximité et continuité logistique.",
      "Scénario fictif de mentorat : une coopérative souhaite comparer trois emplacements pour un service de conservation partagé. Sur douze semaines, le travail porte sur les entretiens avec les commerçants, le coût par caisse et par jour, l’organisation de la maintenance et la préparation d’un dossier de partenariat. Les livrables attendus sont une grille de sélection des sites et un prévisionnel d’exploitation.",
      demoNotice,
    ),
    market:
      "Référence réelle : producteurs et vendeurs de produits frais au Nigeria. Périmètre fictif du test : commerçantes d’un marché et coopératives maraîchères souhaitant mutualiser leur stockage.",
    impact:
      "La mission publiée par ColdHubs vise à réduire les pertes après récolte et à améliorer les moyens de subsistance. Pour l’exercice fictif, les indicateurs à construire sont les kilos conservés, les pertes déclarées et le revenu net par caisse, sans résultat chiffré attribué à l’entreprise.",
    team: "Équipe fictive : une responsable des opérations, un technicien du froid, une coordinatrice de coopérative et un analyste à temps partiel. Cette composition ne décrit pas l’équipe réelle de ColdHubs.",
    risks:
      "Hypothèses de l’exercice : saisonnalité des récoltes, taux d’occupation insuffisant, maintenance éloignée, encaissement quotidien et besoin de trésorerie pour le matériel.",
    supportNeeds: ["Modèle économique", "Financement", "Organisation"],
    pitchUrl: "https://www.youtube.com/watch?v=XoGCV5JKbHk",
    socialLinks: [
      { label: "LinkedIn", url: "https://www.linkedin.com/company/coldhubs-limited/" },
      { label: "Facebook", url: "https://www.facebook.com/ColdHubsLTD/" },
      { label: "Instagram", url: "https://www.instagram.com/coldhubslimited/" },
    ],
    customLinks: [
      { label: "Site officiel ColdHubs", url: "https://coldhubs.com/" },
      {
        label: "Présentation officielle du stockage solaire",
        url: "https://coldhubs.com/our-solution/",
      },
      {
        label: "Reportage Channels Television référencé par ColdHubs",
        url: "https://www.youtube.com/watch?v=XoGCV5JKbHk",
      },
      { label: "Chaîne YouTube officielle", url: "https://www.youtube.com/@coldhubslimited6089" },
    ],
    image: {
      filename: "coldhubs-official-demo.jpg",
      alt: "Installation de froid solaire ColdHubs, photo publiée sur le site officiel ; fiche de démonstration sans affiliation.",
    },
    sources: [
      { label: "Mission et services — site officiel", url: "https://coldhubs.com/" },
      { label: "Solution et tarification à la caisse", url: "https://coldhubs.com/our-solution/" },
    ],
  },
  {
    slug: "lifebank",
    title: "[Démo] LifeBank — connecter les hôpitaux aux produits essentiels",
    countryCode: "NG",
    city: "Lagos",
    founder: {
      firstName: "Tomi",
      lastName: "Demo",
      biography:
        "Personnage fictif du seed, sans lien avec LifeBank. Tomi est une responsable de produit imaginaire qui connaît les contraintes d’approvisionnement des petites cliniques. Son projet pédagogique consiste à traduire leurs besoins en un parcours de commande simple et en procédures de suivi opérationnel.",
      skills: ["Recherche utilisateur", "Gestion de produit", "Coordination logistique"],
    },
    sector: "Santé et logistique médicale",
    stage: "GROWTH",
    summary: paragraphs(
      "LifeBank est une entreprise de technologie et de logistique de santé qui relie les établissements de soins aux produits médicaux dont ils ont besoin. Son offre publique comprend l’approvisionnement en sang, en oxygène médical et en consommables, avec des services de livraison adaptés aux contraintes des structures de santé.",
      "La plateforme Nerve sert de point d’entrée numérique pour commander des fournitures. La présentation officielle et les comptes sociaux de LifeBank permettent de comprendre ce lien entre catalogue, commande et exécution logistique ; le lien de pitch de cette fiche mène à cette présentation publique, sous forme de page web.",
      "Scénario fictif de mentorat : une petite équipe veut concevoir un tableau de suivi des commandes pour un réseau pilote de cliniques. Elle prépare une cartographie du parcours, un dictionnaire des statuts de livraison et un protocole d’escalade. Le mentor aide à choisir des indicateurs de fiabilité et à organiser la relation entre équipe produit et terrain.",
      demoNotice,
    ),
    market:
      "Référence réelle : établissements de santé ayant besoin de produits médicaux et de logistique. Périmètre fictif du test : petites cliniques urbaines et périurbaines pour un exercice d’amélioration du parcours de commande.",
    impact:
      "L’activité de référence vise à rendre les fournitures médicales plus accessibles aux établissements de soins. L’exercice fictif suit la disponibilité des produits, la traçabilité des commandes et le traitement des incidents ; aucune donnée patient réelle n’est utilisée.",
    team: "Équipe fictive : une responsable produit, une coordinatrice logistique, un développeur et une personne chargée des relations avec les établissements. Aucune identité de salarié réel n’est réutilisée.",
    risks:
      "Hypothèses de travail : qualité et mise à jour du catalogue, dépendance aux fournisseurs, continuité logistique et confidentialité des informations. Le scénario ne simule ni prescription ni prise en charge médicale.",
    supportNeeds: ["Produit et technologie", "Organisation", "Stratégie"],
    pitchUrl: "https://lifebank.ng/",
    socialLinks: [
      { label: "LinkedIn", url: "https://www.linkedin.com/company/lifebankcares/" },
      { label: "Facebook", url: "https://www.facebook.com/lifebankcares/" },
      { label: "Instagram", url: "https://www.instagram.com/lifebankcares/" },
    ],
    customLinks: [
      { label: "Présentation officielle — page web, sans vidéo", url: "https://lifebank.ng/" },
      { label: "Nerve — plateforme officielle", url: "https://nerve.lifebank.ng/" },
    ],
    image: {
      filename: "lifebank-official-demo.png",
      alt: "Visuel de présentation de LifeBank publié sur son site officiel ; fiche de démonstration sans affiliation.",
    },
    sources: [
      { label: "Offre et présentation officielles LifeBank", url: "https://lifebank.ng/" },
      {
        label: "Compte LinkedIn officiel et lien Nerve",
        url: "https://www.linkedin.com/company/lifebankcares/",
      },
    ],
  },
  {
    slug: "sun-king",
    title: "[Démo] Sun King — rendre le solaire accessible au quotidien",
    countryCode: "KE",
    city: "Nairobi",
    founder: {
      firstName: "Nia",
      lastName: "Demo",
      biography:
        "Personnage fictif créé pour tester CNX, sans affiliation avec Sun King. Nia anime dans le scénario un réseau local de techniciennes solaires. Elle travaille sur la formation, les tournées de maintenance et la compréhension des coûts d’installation et de service après-vente.",
      skills: ["Énergie solaire", "Formation terrain", "Gestion de réseau"],
    },
    sector: "Énergie solaire et inclusion énergétique",
    stage: "GROWTH",
    summary: paragraphs(
      "Sun King conçoit, distribue, installe et finance des solutions solaires pour les ménages et les entreprises dont l’accès à l’électricité est limité ou peu fiable. Sa gamme va des lanternes et kits d’éclairage aux systèmes domestiques et aux installations avec stockage pour les entreprises.",
      "L’entreprise associe la vente d’équipements à l’installation, au service après-vente et, selon l’offre, au paiement échelonné. Cette combinaison constitue la référence du cas présenté ici : l’accès à l’énergie dépend autant de la distribution et de la maintenance que de la technologie. Le lien de pitch est une présentation officielle sur le web.",
      "Scénario fictif de mentorat : une équipe à Nairobi prépare l’ouverture d’une petite agence solaire. Elle veut comparer vente comptant et service échelonné, formaliser le diagnostic des besoins et créer un circuit de prise en charge des pannes. Le mentor l’accompagne dans un plan de lancement, un modèle de marge et un programme de formation des agents.",
      demoNotice,
    ),
    market:
      "Référence réelle : ménages et entreprises ayant besoin d’une solution solaire fiable. Cible fictive pour les tests : commerces de quartier et foyers desservis par une agence pilote à Nairobi.",
    impact:
      "La référence publique porte sur l’accès à l’énergie solaire. Le scénario fictif cherche à suivre le coût total d’usage, la disponibilité du système et le délai de résolution des pannes, sans reprendre de statistiques commerciales non datées.",
    team: "Équipe fictive : une coordinatrice d’agence, deux techniciens d’installation, une responsable commerciale et une personne chargée du suivi client. Elle ne représente pas l’effectif de Sun King.",
    risks:
      "Hypothèses de l’exercice : dimensionnement inadapté, retards d’approvisionnement, disponibilité des pièces de rechange, coût de déplacement et trésorerie liée aux échéanciers.",
    supportNeeds: ["Développement commercial", "Modèle économique", "Organisation"],
    pitchUrl: "https://sunking.com/",
    socialLinks: [
      { label: "LinkedIn", url: "https://www.linkedin.com/company/sunkingglobal/" },
      { label: "Facebook", url: "https://www.facebook.com/GlobalSunKing/" },
      { label: "Instagram", url: "https://www.instagram.com/sunkingglobal/" },
    ],
    customLinks: [
      { label: "Présentation officielle — page web, sans vidéo", url: "https://sunking.com/" },
      { label: "Chaîne YouTube officielle", url: "https://www.youtube.com/c/SunKing" },
      { label: "Implantations et réseaux officiels", url: "https://sunking.com/contact-us/" },
    ],
    image: {
      filename: "sun-king-official-demo.jpg",
      alt: "Installation de panneaux solaires Sun King sur un toit, photo du site officiel ; fiche de démonstration sans affiliation.",
    },
    sources: [
      { label: "Solutions, financement et installation", url: "https://sunking.com/" },
      {
        label: "Bureau de Nairobi et comptes sociaux officiels",
        url: "https://sunking.com/contact-us/",
      },
    ],
  },
  {
    slug: "gjenge-makers",
    title: "[Démo] Gjenge Makers — transformer le plastique en pavés",
    countryCode: "KE",
    city: "Nairobi",
    founder: {
      firstName: "Zuri",
      lastName: "Demo",
      biography:
        "Personnage fictif du seed, distinct de la fondatrice réelle de Gjenge Makers. Dans le scénario, Zuri est une ingénieure matériaux qui cherche à structurer une activité de fabrication circulaire : sécuriser ses approvisionnements, documenter la qualité et mieux organiser les relations avec les distributeurs.",
      skills: ["Matériaux", "Économie circulaire", "Qualité industrielle"],
    },
    sector: "Économie circulaire et matériaux de construction",
    stage: "LAUNCHED",
    summary: paragraphs(
      "À Nairobi, Gjenge Makers transforme des déchets plastiques en produits de construction, notamment des pavés. Le site officiel montre plusieurs étapes de l’atelier, de la transformation du plastique au moulage, au refroidissement et au rangement des produits finis.",
      "La vidéo associée à cette fiche est une intervention de Nzambi Matee publiée par Gjenge Makers Ltd et relayée sur son compte LinkedIn officiel. Elle présente l’approche de l’entreprise et son lien avec la valorisation des déchets. Les personnes du seed restent entièrement fictives et ne reprennent pas l’identité des dirigeants de l’organisation.",
      "Scénario fictif de mentorat : un atelier pilote veut passer de commandes ponctuelles à une offre destinée aux paysagistes et aux aménageurs. Le travail consiste à définir un catalogue, formaliser une fiche qualité par lot, estimer le coût de production et préparer un argumentaire commercial. L’objectif pédagogique est d’articuler qualité, impact et rentabilité sans inventer de performances techniques.",
      demoNotice,
    ),
    market:
      "Référence réelle : produits de construction issus du recyclage plastique. Segments fictifs à étudier : paysagistes, aménageurs de cours et distributeurs de matériaux autour de Nairobi.",
    impact:
      "Le modèle de référence donne une nouvelle utilisation aux déchets plastiques. Pour le scénario fictif, le suivi proposé concerne la masse de matière entrante, la part effectivement incorporée dans les produits et les rebuts de production.",
    team: "Équipe fictive : une ingénieure matériaux, un chef d’atelier, une chargée d’approvisionnement et un commercial. Les photos officielles illustrent l’organisation réelle ; elles ne sont pas des portraits de ces utilisateurs fictifs.",
    risks:
      "Hypothèses de l’exercice : variation des plastiques collectés, régularité des lots, exigences d’essai et d’usage, coût de la collecte et délais de paiement des clients professionnels.",
    supportNeeds: ["Développement commercial", "Financement", "Organisation"],
    pitchUrl: "https://www.youtube.com/watch?v=43bAqdkNW6A",
    socialLinks: [
      { label: "LinkedIn", url: "https://www.linkedin.com/company/gjengemakersltd/" },
      { label: "Facebook", url: "https://www.facebook.com/gjengemakers/" },
      { label: "Instagram", url: "https://www.instagram.com/gjenge_makers/" },
    ],
    customLinks: [
      { label: "Site officiel Gjenge Makers", url: "https://gjenge.co.ke/" },
      {
        label: "Présentation vidéo officielle — Nzambi Matee",
        url: "https://www.youtube.com/watch?v=43bAqdkNW6A",
      },
      { label: "Chaîne YouTube officielle", url: "https://www.youtube.com/@gjenge_makers" },
    ],
    image: {
      filename: "gjenge-makers-official-demo.jpg",
      alt: "Équipe réelle de Gjenge Makers présentant des pavés recyclés, photo du site officiel ; utilisateurs du seed fictifs.",
    },
    sources: [
      { label: "Présentation et photos d’atelier officielles", url: "https://gjenge.co.ke/" },
      {
        label: "Publication officielle annonçant la vidéo",
        url: "https://www.linkedin.com/posts/gjengemakersltd_at-the-un-food-systems-summit-4-stocktake-activity-7391968152403877888-Xd9-/",
      },
      {
        label: "Présentation vidéo publiée par Gjenge Makers Ltd",
        url: "https://www.youtube.com/watch?v=43bAqdkNW6A",
      },
    ],
  },
  {
    slug: "ubongo",
    title: "[Démo] Ubongo — apprendre avec des histoires africaines",
    countryCode: "TZ",
    city: "Dar es Salaam",
    founder: {
      firstName: "Amani",
      lastName: "Demo",
      biography:
        "Personnage fictif du seed, sans lien avec Ubongo. Amani est une productrice pédagogique imaginaire qui associe animation, langues locales et ateliers avec des éducateurs. Elle souhaite apprendre à formaliser un partenariat de diffusion et à mesurer l’usage de contenus éducatifs.",
      skills: ["Ingénierie pédagogique", "Production de contenus", "Partenariats éducatifs"],
    },
    sector: "Éducation et médias éducatifs",
    stage: "LAUNCHED",
    summary: paragraphs(
      "Ubongo est une entreprise sociale à but non lucratif qui crée des contenus éducatifs pour les enfants en Afrique. Ses programmes, dont Akili and Me et Ubongo Kids, associent histoires animées, chansons et contenus adaptés aux contextes locaux, diffusés par la télévision, la radio et les supports mobiles.",
      "Son modèle combine création, adaptation linguistique, recherche pédagogique et partenariats de diffusion. La vidéo de présentation associée à cette fiche est publiée par Ubongo African Edutainment et figure dans sa galerie vidéo officielle : elle offre une introduction directe au projet réel.",
      "Scénario fictif de mentorat : une équipe prépare une série d’ateliers accompagnant des contenus éducatifs existants. Elle doit choisir un partenaire de diffusion, définir une séance type, préparer des supports pour les éducateurs et suivre la participation des familles. Le mentor aide à construire une théorie du changement simple et un budget de partenariat, avec des retours anonymes d’adultes uniquement.",
      demoNotice,
    ),
    market:
      "Référence réelle : enfants, familles et éducateurs utilisant des contenus d’apprentissage adaptés aux langues et aux contextes locaux. Périmètre fictif : centres d’apprentissage partenaires à Dar es Salaam.",
    impact:
      "La mission réelle concerne l’apprentissage et le développement des enfants. L’exercice fictif distingue portée, usage et apprentissage : participation aux séances, compréhension des consignes par les éducateurs et pertinence perçue des supports, sans résultat scolaire inventé.",
    team: "Équipe fictive : une productrice pédagogique, un animateur d’ateliers, une illustratrice et une responsable des partenariats. Cette équipe de démonstration ne correspond pas à celle d’Ubongo.",
    risks:
      "Hypothèses de l’exercice : coût d’adaptation linguistique, disponibilité des diffuseurs, accessibilité des contenus, continuité du financement et collecte minimale d’informations lors des ateliers.",
    supportNeeds: ["Stratégie", "Financement", "Développement commercial"],
    pitchUrl: "https://www.youtube.com/watch?v=btYJbOHy76M",
    socialLinks: [
      { label: "LinkedIn", url: "https://www.linkedin.com/company/ubongo-limited/" },
      { label: "Facebook", url: "https://www.facebook.com/ubongoTZ" },
      { label: "Instagram", url: "https://www.instagram.com/ubongoimpact/" },
    ],
    customLinks: [
      { label: "Site officiel Ubongo", url: "https://www.ubongo.org/" },
      {
        label: "Présentation vidéo officielle d’Ubongo",
        url: "https://www.youtube.com/watch?v=btYJbOHy76M",
      },
      { label: "Mission et programmes éducatifs", url: "https://www.ubongo.org/what-we-do/" },
      { label: "Galerie vidéo officielle", url: "https://www.ubongo.org/blog/video-gallery-2/" },
    ],
    image: {
      filename: "ubongo-official-demo.jpg",
      alt: "Photo publiée dans la galerie officielle Ubongo montrant le visionnage d’Akili and Me ; fiche de démonstration sans affiliation.",
    },
    sources: [
      {
        label: "Mission et programmes — source officielle",
        url: "https://www.ubongo.org/what-we-do/",
      },
      {
        label: "Présentation vidéo référencée par Ubongo",
        url: "https://www.ubongo.org/blog/video-gallery-2/",
      },
      { label: "Galerie photo officielle", url: "https://www.ubongo.org/blog/photo-gallery/" },
    ],
  },
  {
    slug: "wave",
    title: "[Démo] Wave — simplifier les paiements du quotidien",
    countryCode: "SN",
    city: "Dakar",
    founder: {
      firstName: "Mariam",
      lastName: "Demo",
      biography:
        "Personnage fictif créé pour les tests CNX, sans affiliation avec Wave. Mariam est une responsable de partenariats imaginaire basée à Dakar. Dans ce scénario, elle souhaite mieux comprendre les besoins des petits commerçants et concevoir un accompagnement à l’adoption de services numériques.",
      skills: ["Partenariats", "Recherche terrain", "Accompagnement des commerçants"],
    },
    sector: "Fintech et inclusion financière",
    stage: "GROWTH",
    summary: paragraphs(
      "Wave propose des services de monnaie mobile permettant notamment de déposer, retirer, transférer de l’argent et payer des factures. L’entreprise présente sa mission comme le développement de services financiers accessibles et simples à utiliser en Afrique, en s’appuyant sur une application et un réseau d’agents.",
      "La page officielle en français présente les principaux usages, tandis que la page À propos explique l’approche de l’entreprise. Le lien de pitch mène à cette présentation écrite : aucune vidéo de levée de fonds ou demande d’investissement n’est inventée pour compléter cette fiche.",
      "Scénario fictif de mentorat : une équipe à Dakar étudie les obstacles rencontrés par des commerçants découvrant les paiements numériques. Elle prépare un guide d’entretien, un parcours de formation et des supports expliquant le rapprochement des encaissements. Le mentor l’aide à distinguer acquisition, activation et fidélisation, à prioriser les retours terrain et à bâtir un plan de partenariat sans manipulation d’argent réel.",
      demoNotice,
    ),
    market:
      "Référence réelle : services financiers mobiles pour particuliers et professionnels. Cible fictive pour l’exercice : commerçants de proximité à Dakar souhaitant comprendre le suivi de leurs encaissements numériques.",
    impact:
      "La mission publiée par Wave concerne l’inclusion financière. Dans le scénario fictif, les indicateurs à construire sont la compréhension des parcours, l’autonomie des commerçants et la qualité du suivi des encaissements ; aucun volume de transactions réel n’est simulé.",
    team: "Équipe fictive : une responsable des partenariats, un designer de service, une coordinatrice terrain et un analyste. Les utilisateurs du seed ne représentent ni Wave ni ses agents.",
    risks:
      "Hypothèses de travail : compréhension des frais, erreurs de saisie, disponibilité du réseau d’agents, confiance des utilisateurs et capacité à expliquer les parcours. Aucun service de paiement n’est connecté par le seed.",
    supportNeeds: ["Produit et technologie", "Développement commercial", "Stratégie"],
    pitchUrl: "https://www.wave.com/fr/about/",
    socialLinks: [{ label: "LinkedIn", url: "https://www.linkedin.com/company/wavemm/" }],
    customLinks: [
      { label: "Site officiel Wave en français", url: "https://www.wave.com/fr/" },
      {
        label: "Présentation officielle — page web, sans vidéo",
        url: "https://www.wave.com/fr/about/",
      },
      {
        label: "Page LinkedIn officielle Wave Sénégal",
        url: "https://www.linkedin.com/showcase/wave-s%C3%A9n%C3%A9gal/",
      },
    ],
    image: {
      filename: "wave-official-demo.jpg",
      alt: "Client devant un point de service Wave, photo publiée sur la page officielle À propos ; fiche de démonstration sans affiliation.",
    },
    sources: [
      { label: "Services — site officiel en français", url: "https://www.wave.com/fr/" },
      { label: "Mission — présentation officielle", url: "https://www.wave.com/fr/about/" },
      {
        label: "Compte LinkedIn officiel et implantation Dakar",
        url: "https://www.linkedin.com/company/wavemm/",
      },
    ],
  },
];
