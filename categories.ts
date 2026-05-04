// Hierarchy: 16 top-level parents (with color) + 115 sub-types (inherit parent's color, own icon and style).

export type CategoryKey = string;

export type Category = {
  key: CategoryKey;
  label: string;
  hint: string;
  style: string;
  icon: string;
  parent?: CategoryKey;
  color?: string; // only set on top-level parents
  manualOnly?: boolean; // hidden from the classifier; only selectable via the regen dropdown
};

const PARENTS: Category[] = [
  {
    key: "person",
    label: "Person",
    hint: "A biography of a real or fictional individual not covered by a more specific person sub-type.",
    style:
      "Editorial portrait spread, New Yorker meets Time. A single hand-painted portrait of the subject occupies roughly 60% of the frame on the left, set against a subtly textured cream background. To the right: a vertical stack of 3-4 dated milestones in tight modern sans-serif numerals. Above the portrait an elegant didone serif headline. Hand-drawn marginal arrows and asterisk-style marginalia in pencil. Palette: warm cream paper #F4ECD8, deep indigo #1E3A8A ink, vermillion accent #B8503C. Light pencil-grain overlay.",
    icon: "user-circle",
    color: "#4f46e5",
  },
  {
    key: "place",
    label: "Place",
    hint: "A geographic location not covered by a more specific place sub-type.",
    style:
      "Cartographer's plate, like a 1920s travel magazine spread. A stylized topographic or aerial map fills the upper two-thirds of the frame, framed by a thin double rule. A horizontal strip of place statistics in a single row of small uppercase sans numerals runs across the bottom. A vintage compass rose and tiny etched landmark glyphs sit in the margins. Palette: aged ivory #F6EFD6, terracotta #B85F3B, ink-blue #283B59, single olive accent #5B6E3E. Subtle paper grain.",
    icon: "map-pin",
    color: "#d97706",
  },
  {
    key: "event",
    label: "Event",
    hint: "A historical event, era, movement, or one-time happening not covered by a more specific event sub-type.",
    style:
      "Documentary timeline broadside, like a museum wall plaque. A single horizontal central rule bisects the frame; major dated nodes branch above and below the rule with small captioned vignettes rendered in period engraving line work. Period-appropriate slab serif for dates, condensed sans for captions. Palette: bone #ECE6D5, oxblood #6E1F1F, mustard #C8941E accent. Restrained ornament.",
    icon: "clock-clockwise",
    color: "#e11d48",
  },
  {
    key: "science",
    label: "Science",
    hint: "A scientific concept, principle, law, or theory not covered by a more specific science sub-type.",
    style:
      "Editorial science page, asymmetric. A large schematic illustration on the left of the frame, the key formula in centered serif italic between, and 2-3 stacked callout panels with short explanations on the right. Hand-drawn arrows link parts of the schematic to callouts, like textbook annotations. Palette: chalkboard ink-blue #1E3A59, lab-cream #F0E8D4, single warm accent of cadmium red #C2452F.",
    icon: "flask",
    color: "#0284c7",
  },
  {
    key: "technology",
    label: "Technology",
    hint: "A technology, machine, software, or engineered system not covered by a more specific technology sub-type.",
    style:
      "Tech-magazine spread (Wired meets IEEE Spectrum). A large exploded-view of the subject in clean technical line work occupies the center, with thin leader lines tagging components. A small data table of specs in monospaced numerals sits at the bottom. Palette: graphite #2D2D2D, soft ivory #F4F0E6, electric coral accent #FF6B4A. Crisp minimal type.",
    icon: "cpu",
    color: "#475569",
  },
  {
    key: "nature",
    label: "Nature",
    hint: "An animal, plant, fungus, or other biological taxon not covered by a more specific nature sub-type.",
    style:
      "Natural-history plate (19th-century field-guide). The specimen rendered in detailed watercolor centered on parchment, with delicate label arrows pointing to anatomical parts in italic copperplate hand. Marginalia: a tiny tiled habitat sketch in a lower corner; specimen number etched in the upper margin. Palette: parchment #F4ECD6, sepia ink #614327, moss green #5B6E3E, single crimson accent #A92A2A.",
    icon: "leaf",
    color: "#059669",
  },
  {
    key: "culture",
    label: "Arts & culture",
    hint: "A cultural work or movement (art, literature, theatre, language, internet phenomenon) not covered by a more specific sub-type.",
    style:
      "Editorial culture-page, magazine feature opener. The hero artwork or representative imagery anchors the centre at full bleed; a stack of titled callout panels (key works, themes, era) flanks one margin. Editorial display serif (New Yorker masthead style) for the title, tight news sans for captions. Palette: warm bone #F3EDDF, indigo #1C2545 ink, plus a single saturated spot color tuned to the work's medium and era.",
    icon: "palette",
    color: "#c026d3",
  },
  {
    key: "sports",
    label: "Sports",
    hint: "A sport, team, athlete, tournament, or sporting event not covered by a more specific sub-type.",
    style:
      "Sports magazine cover composition. A dynamic action figure or play moment cropped at an angle, with a single bold sans-serif numeral (the headline stat) overlaid in spot color. A small pitch/court diagram inset in a corner. Palette: chalk-white #F5F0E8, jet black #0F0F0F, plus one team-style spot color. Energetic but legible.",
    icon: "soccer-ball",
    color: "#ea580c",
  },
  {
    key: "food",
    label: "Food",
    hint: "A dish, ingredient, beverage, or cuisine not covered by a more specific food sub-type.",
    style:
      "Recipe-card spread (Bon Appétit / Kinfolk). A top-down hero of the dish in rich painterly watercolor anchors the upper half. Below: ingredient circles in a tidy row with hand-lettered labels in italic. Palette: ivory paper #F5EDD8, terracotta #B85F3B, herb green #5B6E3E, bright accent of saffron yellow #D4A72C.",
    icon: "fork-knife",
    color: "#dc2626",
  },
  {
    key: "math",
    label: "Math",
    hint: "A mathematical concept, theorem, equation, or branch of math not covered by a more specific sub-type.",
    style:
      "Mathematical journal page. The central equation rendered large in italic Computer Modern, surrounded by airy white space with light geometric figures in the margins. Tight serif body type for explanatory captions. Palette: ink black on cream #F0EAD2 paper, single accent of muted ultramarine #2C3E7C.",
    icon: "function",
    color: "#0891b2",
  },
  {
    key: "religion",
    label: "Religion",
    hint: "A religion, belief system, religious figure, scripture, ritual, mythology, or sacred concept not covered by a more specific sub-type.",
    style:
      "Illuminated manuscript page. The central iconographic figure or symbol sits inside a hand-painted golden roundel, surrounded by ornate marginalia (vines, geometric knots, tiny figures). A drop cap for the title in ornate gothic. Palette: vellum #F4E7C8, lapis lazuli #1F3A8A, deep red #8B2222, gold leaf #C8A14A.",
    icon: "cross",
    color: "#ca8a04",
  },
  {
    key: "medicine",
    label: "Medicine",
    hint: "A disease, body part, treatment, drug, procedure, or medical concept not covered by a more specific sub-type.",
    style:
      "Anatomical-atlas plate (Gray's Anatomy meets Vesalius). A hand-drawn cross-section anatomy fills the center, with thin guide lines pointing to organs labeled in elegant italic. A thin double rule frames the page. Plate number in serif at the corner. Palette: aged cream #F0E8D4, anatomy red #B8503C, ink blue #1F2F4D.",
    icon: "stethoscope",
    color: "#db2777",
  },
  {
    key: "transport",
    label: "Transport",
    hint: "A vehicle (car, plane, ship, train, spacecraft) or transportation system not covered by a more specific sub-type.",
    style:
      "Engineering-magazine spread. A side-elevation cutaway diagram in detailed line work occupies the full width. Tiny thumbnails of variants beneath. A horizontal data strip with specs in monospaced numerals at the foot. Palette: blueprint #14395C paper, white-ink lines, single accent of brass #B8954A.",
    icon: "car",
    color: "#0d9488",
  },
  {
    key: "astronomy",
    label: "Astronomy",
    hint: "A celestial object, astronomical phenomenon, or space mission not covered by a more specific sub-type.",
    style:
      "Astronomical atlas plate (1880s-style). A deep navy near-black field with star-stippling. The subject rendered in finely cross-hatched engraving style centered, with thin radial annotations to nearby reference points and a plate number in serif at the corner. Palette: midnight #0A1428, parchment-cream subject #F4ECD8, single accent of warm gold #C8A14A.",
    icon: "planet",
    color: "#7c3aed",
  },
  {
    key: "architecture",
    label: "Architecture",
    hint: "A notable building, monument, bridge, or architectural style not covered by a more specific sub-type.",
    style:
      "Architectural drafting plate. Front elevation rendered in exact black line work with dimension lines and notation, a small floor-plan inset bottom-left, light graphite-grey shading. Title in modernist sans-serif at the top. Palette: chalkboard cream #F0E8D4, graphite #2D2D2D, single accent of construction yellow #D4A72C.",
    icon: "buildings",
    color: "#57534e",
  },
  {
    key: "company",
    label: "Company",
    hint: "A company, corporation, brand, or institution.",
    style:
      "Annual-report front page. A bold founding-year numeral in thick slab serif anchors the page; a horizontal milestone timeline strip runs across the middle; small data callouts (employees, revenue, founders) stacked below. Editorial sans for body. Palette: corporate cream #F3EDDF, deep navy #1F2F4D, single brand-spot color tuned to the company's actual brand.",
    icon: "briefcase",
    color: "#65a30d",
  },
  {
    key: "textbook",
    label: "Textbook poster",
    hint: "(Manual selection only — not auto-classified.)",
    style:
      "Premium English-language poster about the subject in a Japanese-inspired modern editorial science-graphic style: off-white textured paper, deep black vertical serif typography, electric cobalt blue technical linework, acid green highlight accents, thin rule lines, boxed annotations, sparse labels, asymmetrical grid, large negative space, subtle risograph grain and halftone texture. Include a dramatic central abstract diagram explaining the topic, small side-panel mini diagrams, and refined infographic details. Make it feel like a gallery-worthy mathematical design poster: disciplined, minimal, cerebral, intense, poetic, and visually powerful. No Japanese text, no glossy 3D, no cartooniness, no clutter.",
    icon: "book-open",
    color: "#1e40af",
    manualOnly: true,
  },
];

const SUBTYPES: Category[] = [
  // person
  { key: "royalty", parent: "person", label: "Royalty", icon: "crown",
    hint: "A king, queen, prince, princess, emperor, or other royal individual.",
    style: "Heraldic crest with regalia and crown anchor; lineage-tree sidebar; gold-filigree borders; jewel-tone palette." },
  { key: "politician", parent: "person", label: "Politician", icon: "bank",
    hint: "A president, prime minister, senator, mayor, or other elected/appointed political leader.",
    style: "Newspaper-front-page treatment with bold sans-serif headline; political-cartoon-style portrait; muted tricolor palette." },
  { key: "military_leader", parent: "person", label: "Military leader", icon: "medal",
    hint: "A general, admiral, commander, or other named military leader.",
    style: "Tactical theater map with troop-arrow callouts; medal-cluster sidebar; olive-and-brass palette." },
  { key: "scientist_specific", parent: "person", label: "Scientist", icon: "microscope",
    hint: "A named scientist, inventor, mathematician, or researcher.",
    style: "Lab bench with apparatus and key equation from their work; chalkboard background with hand-drawn diagrams." },
  { key: "visual_artist", parent: "person", label: "Visual artist", icon: "paint-brush",
    hint: "A painter, sculptor, photographer, or other named visual artist.",
    style: "Self-portrait or signature work as anchor with palette swatches and brush-stroke decorations." },
  { key: "composer", parent: "person", label: "Composer", icon: "music-notes",
    hint: "A composer of classical, film, or contemporary music.",
    style: "Manuscript paper with staves and key piece's opening bar; era portrait; sepia-and-ivory palette." },
  { key: "actor", parent: "person", label: "Actor", icon: "film-strip",
    hint: "A film, TV, or stage actor.",
    style: "Marquee-poster collage of famous roles; spotlight lighting; playbill-style title typography." },
  { key: "author", parent: "person", label: "Author", icon: "book-open-text",
    hint: "A novelist, poet, playwright, or essayist.",
    style: "Library-shelf spines of their works; writing-desk vignette; warm parchment-and-leather palette." },
  { key: "philosopher", parent: "person", label: "Philosopher", icon: "brain",
    hint: "A philosopher or major thinker.",
    style: "Marble-bust portrait with key-tenet pull-quotes; classical column borders." },
  { key: "activist", parent: "person", label: "Activist", icon: "megaphone",
    hint: "A civil-rights, political, or social activist.",
    style: "Protest-poster typography over photographic icon; high-contrast red-and-black; banner date markers." },
  { key: "business_founder", parent: "person", label: "Business founder", icon: "handshake",
    hint: "A CEO, entrepreneur, or business founder (the person, not the company).",
    style: "Boardroom portrait with founding-date numerals and milestone-strip timeline; navy-and-white corporate palette." },
  { key: "fictional_character", parent: "person", label: "Fictional character", icon: "mask-happy",
    hint: "A character from fiction, mythology, comics, film, or games.",
    style: "Storybook-illustration treatment with origin caption; plate-style framing; era-matched palette." },
  { key: "notorious_criminal", parent: "person", label: "Criminal", icon: "fingerprint",
    hint: "A notorious criminal or outlaw.",
    style: "Wanted-poster typewriter aesthetic; mugshot-style portrait; sepia-and-cream paper texture." },
  { key: "saint", parent: "person", label: "Saint", icon: "church",
    hint: "A canonized saint, prophet, or religious figure (as a named individual).",
    style: "Devotional iconography with halo and gold leaf; richly patterned robes; jewel-tone palette." },
  { key: "explorer", parent: "person", label: "Explorer", icon: "compass",
    hint: "An explorer, navigator, or pioneer.",
    style: "Aged map with route line and labeled stops; period sextant/compass props; parchment palette." },

  // place
  { key: "country", parent: "place", label: "Country", icon: "flag",
    hint: "A country or sovereign state.",
    style: "National-flag motif over map silhouette; key statistics callouts; flag-derived palette." },
  { key: "city", parent: "place", label: "City", icon: "buildings",
    hint: "A city, town, or municipality.",
    style: "Skyline silhouette over street-grid map; landmark icons; metro-color accents." },
  { key: "mountain", parent: "place", label: "Mountain", icon: "mountains",
    hint: "A mountain, peak, or mountain range.",
    style: "Topographic cross-section with peak-elevation callout and snowline; cool stone-and-blue palette." },
  { key: "river", parent: "place", label: "River", icon: "waves",
    hint: "A river or stream.",
    style: "Flow-line map with named tributaries and source/mouth panels; aquatic blue palette." },
  { key: "island", parent: "place", label: "Island", icon: "island",
    hint: "An island, archipelago, or atoll.",
    style: "Nautical chart with shoreline detail and surrounding waters; latitude-longitude grid; sea-and-sand palette." },
  { key: "desert", parent: "place", label: "Desert", icon: "sun",
    hint: "A desert or arid region.",
    style: "Sand-toned panorama with dune cross-section and biome stats; warm ochre-and-rust palette." },
  { key: "forest", parent: "place", label: "Forest", icon: "tree",
    hint: "A forest, jungle, or wooded area.",
    style: "Canopy-to-floor cross-section with named flora/fauna; layered green palette." },
  { key: "lake_body", parent: "place", label: "Lake / sea", icon: "drop",
    hint: "A lake, sea, gulf, or other water body other than a river.",
    style: "Bathymetric depth map with surrounding geography; teal-and-azure depth gradient." },
  { key: "park_natural", parent: "place", label: "Park", icon: "tree-evergreen",
    hint: "A national park, urban park, or protected natural area.",
    style: "Trail map with landmark icons and elevation profile; muted earth-and-pine palette." },
  { key: "archaeological_site", parent: "place", label: "Archaeological site", icon: "shovel",
    hint: "An archaeological dig site or ruin.",
    style: "Excavation plan-view with stratigraphic cross-section; dig-grid overlay; sepia palette with rust accents." },
  { key: "archaeological_artifact", parent: "place", label: "Artifact", icon: "vase",
    hint: "A specific historical artifact (statue, vase, scroll, relic).",
    style: "Museum-card photograph with provenance, date, and material callouts; muted gallery palette." },

  // event
  { key: "war", parent: "event", label: "War", icon: "sword",
    hint: "A war or armed conflict.",
    style: "Theater-of-war map with multi-front advance arrows; casualty stats; sepia-and-blood-red palette." },
  { key: "battle", parent: "event", label: "Battle", icon: "crosshair",
    hint: "A specific battle or military engagement.",
    style: "Single-day formation diagram with named units and terrain features; tactical map palette." },
  { key: "revolution", parent: "event", label: "Revolution", icon: "fist",
    hint: "A revolution, uprising, or political upheaval.",
    style: "Propaganda-poster aesthetic with bold red-black palette and silhouette of a key figure." },
  { key: "natural_disaster", parent: "event", label: "Disaster", icon: "cloud-warning",
    hint: "An earthquake, flood, wildfire, or other natural disaster.",
    style: "Hazard map with damage-radius rings and intensity scale; warning-yellow and danger-red palette." },
  { key: "pandemic", parent: "event", label: "Pandemic", icon: "virus",
    hint: "A pandemic, epidemic, or major outbreak.",
    style: "Epidemic-curve graph with peak label and geographic-spread map; clinical reds and grays." },
  { key: "election", parent: "event", label: "Election", icon: "check-square",
    hint: "An election or referendum.",
    style: "Electoral map with party-color states and total-tally bars; ballot-paper texture." },
  { key: "discovery_invention", parent: "event", label: "Discovery", icon: "lightbulb",
    hint: "A discovery, invention, or scientific milestone (the event, not the inventor).",
    style: "Patent-drawing aesthetic with mechanical line work and year stamp; cream-and-graphite palette." },
  { key: "festival_holiday", parent: "event", label: "Festival", icon: "confetti",
    hint: "A recurring festival, celebration, or cultural holiday.",
    style: "Carnival-poster vibrancy with fireworks and date numerals; saturated joyful palette." },
  { key: "assassination", parent: "event", label: "Assassination", icon: "warning-octagon",
    hint: "An assassination or political killing.",
    style: "Front-page newspaper layout with masthead and chilling headline; black-and-newsprint palette." },
  { key: "summit_treaty", parent: "event", label: "Treaty", icon: "scroll",
    hint: "A treaty, summit, accord, or international agreement.",
    style: "Diplomatic seal motif with signatory badges and key-clauses list; navy-and-gold palette." },
  { key: "weather_event_named", parent: "event", label: "Storm", icon: "cloud-warning",
    hint: "A specific named storm, hurricane, tornado, or weather event.",
    style: "Storm-track map with intensity timeline and damage stats; meteorological warning palette." },
  { key: "award_prize", parent: "event", label: "Award", icon: "trophy",
    hint: "An award, prize, or honor (Nobel, Oscar, championship, etc.).",
    style: "Trophy hero with year-by-year laureate timeline and emblem; ceremonial gold-and-velvet palette." },
  { key: "holiday_observance", parent: "event", label: "Holiday", icon: "confetti",
    hint: "A holiday or annual observance.",
    style: "Festive iconography around date-numeral hero; tradition-derived color palette." },

  // science
  { key: "particle_force", parent: "science", label: "Particle / force", icon: "atom",
    hint: "A subatomic particle, fundamental force, or quantum concept.",
    style: "Particle-collider trail diagram with quantum labels and decay paths; dark cosmic palette with neon accents." },
  { key: "chemical_element", parent: "science", label: "Chemical / element", icon: "test-tube",
    hint: "A chemical element, compound, or reaction.",
    style: "Magnified periodic-table tile with electron-shell diagram and atomic-mass callouts; lab-clean palette." },
  { key: "genetic_concept", parent: "science", label: "Genetics", icon: "dna",
    hint: "A genetics or molecular-biology concept (DNA, gene, protein, etc.).",
    style: "Double-helix anchor with codon table and base-pair callouts; biotech-blue and cell-pink palette." },
  { key: "evolutionary_concept", parent: "science", label: "Evolution", icon: "tree-structure",
    hint: "An evolution-related concept, branch of life, or speciation phenomenon.",
    style: "Phylogenetic tree branching with species illustrations at tips; warm naturalist palette." },
  { key: "tectonic_concept", parent: "science", label: "Geology", icon: "mountains",
    hint: "A geology, plate tectonics, or earth-science concept.",
    style: "Crustal cross-section with motion arrows and named plates; magma-orange and stone palette." },
  { key: "weather_phenomenon", parent: "science", label: "Weather", icon: "cloud",
    hint: "A weather or meteorological phenomenon (general, not a specific named storm).",
    style: "Atmospheric cross-section with wind vectors and isobars; meteorological blue palette." },
  { key: "ecosystem_biome", parent: "science", label: "Ecosystem", icon: "plant",
    hint: "An ecosystem, biome, or ecological concept.",
    style: "Layered habitat illustration with named species pinned to layers; vibrant biome palette." },
  { key: "paleontology_concept", parent: "science", label: "Paleontology", icon: "bone",
    hint: "A paleontology concept, era, or fossil-record subject.",
    style: "Fossil-record column with era labels and reconstruction inset; dust-brown and stone palette." },
  { key: "unit_measurement", parent: "science", label: "Unit", icon: "ruler",
    hint: "A unit of measurement or scientific constant.",
    style: "Conversion-ladder iconography with named scales; clean schematic palette with one accent." },

  // technology
  { key: "software_app", parent: "technology", label: "Software", icon: "app-window",
    hint: "A software product, application, website, or platform.",
    style: "App-store screenshot mockup with feature callouts and platform icons; clean UI palette." },
  { key: "hardware_device", parent: "technology", label: "Hardware", icon: "device-mobile",
    hint: "A consumer or industrial hardware device.",
    style: "Hero photo with spec sidebar (display, dimensions, ports); product-photo lighting." },
  { key: "programming_language", parent: "technology", label: "Programming language", icon: "code",
    hint: "A programming language, framework, or runtime.",
    style: "Code snippet hero with syntax highlighting and key-feature callouts; IDE-dark palette." },
  { key: "ai_concept", parent: "technology", label: "AI / ML", icon: "robot",
    hint: "An AI, machine learning, or data-science concept.",
    style: "Neural-network node diagram with training-loop arrows; gradient-blue tech palette." },
  { key: "cryptography", parent: "technology", label: "Cryptography", icon: "lock",
    hint: "A cryptography or security concept, cipher, or protocol.",
    style: "Cipher wheel or hash tree with key-flow arrows; vault-dark palette with gold accents." },
  { key: "internet_protocol", parent: "technology", label: "Network protocol", icon: "network",
    hint: "An internet, network, or communication protocol.",
    style: "Network diagram with packet-flow arrows and named OSI layers; technical schematic palette." },
  { key: "videogame_franchise", parent: "technology", label: "Video game", icon: "joystick",
    hint: "A video game, franchise, or game studio.",
    style: "Pixel-art collage with HUD elements and level-select layout; CRT-color palette." },
  { key: "weapon_firearm", parent: "technology", label: "Weapon", icon: "shield",
    hint: "A weapon, firearm, or military hardware.",
    style: "Mechanism diagram with caliber and operation callouts; military spec-sheet palette." },

  // nature
  { key: "mammal", parent: "nature", label: "Mammal", icon: "paw-print",
    hint: "A mammal species or group.",
    style: "Side-profile drawing with skeletal underlay and named anatomy points; field-guide palette." },
  { key: "bird", parent: "nature", label: "Bird", icon: "bird",
    hint: "A bird species.",
    style: "Plumage detail study with range map and flight silhouette; field-guide palette." },
  { key: "fish", parent: "nature", label: "Fish", icon: "fish",
    hint: "A fish or aquatic vertebrate.",
    style: "Aquarium illustration with depth strata and prey-predator arrows; aquatic palette." },
  { key: "insect", parent: "nature", label: "Insect", icon: "bug",
    hint: "An insect, arachnid, or other arthropod.",
    style: "Entomological-pin display with magnified morphology labels; museum-cream palette." },
  { key: "plant_flower", parent: "nature", label: "Flower / plant", icon: "flower",
    hint: "A flower or non-tree plant.",
    style: "Botanical illustration with bloom cross-section and seed inset; vintage botanical palette." },
  { key: "tree_specific", parent: "nature", label: "Tree", icon: "tree-evergreen",
    hint: "A tree species or family.",
    style: "Trunk-to-canopy elevation with leaf, fruit, and bark insets; warm forest palette." },
  { key: "fungus", parent: "nature", label: "Fungus", icon: "plant",
    hint: "A fungus, mushroom, or mold species.",
    style: "Watercolor specimen plate with cap cross-section and spore-print sample; muted forest palette." },
  { key: "dinosaur", parent: "nature", label: "Dinosaur / extinct", icon: "bone",
    hint: "A dinosaur or other extinct prehistoric species.",
    style: "Paleo reconstruction with skeleton overlay and human scale comparison; dust-and-rust palette." },
  { key: "mineral_gem", parent: "nature", label: "Mineral / gem", icon: "diamond",
    hint: "A mineral, gemstone, or rock type.",
    style: "Faceted crystal hero with chemical-formula sidebar and Mohs hardness scale; jewel-tone palette." },
  { key: "virus_microbe", parent: "nature", label: "Virus / microbe", icon: "virus",
    hint: "A virus, bacterium, or other microorganism (as a biological subject).",
    style: "Electron-microscope tinted illustration with capsid/cell structure and scale bar." },

  // culture
  { key: "film", parent: "culture", label: "Film", icon: "film-strip",
    hint: "A specific film or movie.",
    style: "Movie-poster collage with cast strip and runtime callouts; era-matched palette." },
  { key: "novel_book", parent: "culture", label: "Book", icon: "book-open",
    hint: "A specific novel, book, or written work.",
    style: "Book-cover hero with chapter motifs and a key quote callout; period-appropriate palette." },
  { key: "tv_show", parent: "culture", label: "TV show", icon: "television",
    hint: "A TV series or anime show.",
    style: "TV-Guide-page layout with episode grid and channel logo; broadcast-era palette." },
  { key: "video_game", parent: "culture", label: "Video game", icon: "joystick",
    hint: "A specific video game (use videogame_franchise for studios/franchises).",
    style: "In-game screenshot mosaic with control schematic and HUD elements; era-platform palette." },
  { key: "art_movement", parent: "culture", label: "Art movement", icon: "palette",
    hint: "An art or literary movement (Impressionism, Cubism, Romanticism, etc.).",
    style: "Sample painting hero with manifesto pull-quotes and era timeline; movement-defining palette." },
  { key: "dance_form", parent: "culture", label: "Dance", icon: "footprints",
    hint: "A dance form, style, or specific dance.",
    style: "Choreography step diagram with footprints and beat-count grid; spotlight palette." },
  { key: "fashion_era", parent: "culture", label: "Fashion", icon: "t-shirt",
    hint: "A fashion era, style, or designer.",
    style: "Lookbook spread with garment silhouettes and signature accessories; era-matched palette." },
  { key: "comic_anime", parent: "culture", label: "Comic / anime", icon: "lightning",
    hint: "A comic, manga, or anime work.",
    style: "Comic panel layout with action lines and character cards; halftone-print palette." },
  { key: "theatre_play", parent: "culture", label: "Theatre", icon: "masks-theater",
    hint: "A play, opera, or theatrical work.",
    style: "Stage-set diagram with playbill cover and act-by-act timeline; spotlight palette." },
  { key: "poem_specific", parent: "culture", label: "Poem", icon: "feather",
    hint: "A specific poem or short literary work.",
    style: "Calligraphy of opening verse with motif illustration; ink-on-parchment palette." },
  { key: "language", parent: "culture", label: "Language", icon: "translate",
    hint: "A language, dialect, or writing system.",
    style: "Alphabet specimen with phonetic chart and family-tree of related languages." },
  { key: "internet_meme", parent: "culture", label: "Meme", icon: "share-network",
    hint: "An internet meme or viral phenomenon.",
    style: "Screenshot of the meme with origin date and spread-map timeline; web-flat palette." },
  // music sub-types under culture
  { key: "song", parent: "culture", label: "Song", icon: "music-note",
    hint: "A specific song, single, or track.",
    style: "Vinyl-record label hero with verse callouts and runtime; era-matched palette." },
  { key: "album", parent: "culture", label: "Album", icon: "vinyl-record",
    hint: "A specific music album or EP.",
    style: "Album-art recreation with tracklist sidebar and release-date stamp; cover-derived palette." },
  { key: "band_group", parent: "culture", label: "Band", icon: "users-three",
    hint: "A band, musical group, or music collective (the group, not the genre).",
    style: "Member roster with discography timeline and tour-poster collage; band-aesthetic palette." },
  { key: "music_genre", parent: "culture", label: "Music genre", icon: "playlist",
    hint: "A music genre, style, or subgenre.",
    style: "Mood-board with iconic instruments, key artists, and era timeline; genre-defining palette." },
  { key: "musical_instrument", parent: "culture", label: "Instrument", icon: "guitar",
    hint: "A musical instrument.",
    style: "Cross-section with named parts and frequency-range chart; warm wood-and-brass palette." },
  { key: "opera_symphony", parent: "culture", label: "Opera / symphony", icon: "music-notes",
    hint: "An opera, symphony, or major classical work.",
    style: "Score page with libretto excerpts and historical staging photo; classical sepia palette." },

  // sports
  { key: "team", parent: "sports", label: "Team", icon: "users-three",
    hint: "A sports team, club, or franchise.",
    style: "Team crest hero with roster jersey grid and stadium silhouette; team-color palette." },
  { key: "tournament", parent: "sports", label: "Tournament", icon: "trophy",
    hint: "A sports tournament, league, or competition.",
    style: "Bracket-style infographic with champion crown and final-score callouts; gold-and-emerald palette." },
  { key: "olympic_event", parent: "sports", label: "Olympics", icon: "medal",
    hint: "An Olympic Games or event.",
    style: "Olympic-rings motif with venue, year, and gold-medal record; classical-Olympic palette." },
  { key: "martial_art", parent: "sports", label: "Martial art", icon: "hand-fist",
    hint: "A martial art or combat discipline.",
    style: "Stance diagram with named techniques and lineage tree; eastern-philosophical palette." },

  // food
  { key: "national_cuisine", parent: "food", label: "Cuisine", icon: "cooking-pot",
    hint: "A national or regional cuisine.",
    style: "Country map with iconic dishes pinned at regions; warm regional-spice palette." },
  { key: "beverage", parent: "food", label: "Beverage", icon: "wine",
    hint: "A beverage, cocktail, tea, coffee, or alcoholic drink.",
    style: "Glass silhouette with ingredient-ratio chart and serving-temperature scale; bar-menu palette." },
  { key: "dessert", parent: "food", label: "Dessert", icon: "cake",
    hint: "A dessert, pastry, or sweet.",
    style: "Patisserie cross-section detail with ingredient circles and origin-region map; warm bakery palette." },

  // religion
  { key: "religion_specific", parent: "religion", label: "Religion", icon: "yin-yang",
    hint: "A specific religion, denomination, or major belief system.",
    style: "Symbolic mandala with adherent-distribution map and key-tenet pillars; jewel-tone palette." },
  { key: "religious_text", parent: "religion", label: "Sacred text", icon: "book",
    hint: "A scripture, sutra, sacred text, or religious document.",
    style: "Illuminated-manuscript page with key verse and ornament; gold-leaf jewel palette." },
  { key: "deity_god", parent: "religion", label: "Deity", icon: "star",
    hint: "A deity, god, goddess, or spiritual being.",
    style: "Devotional poster with iconographic attributes and pantheon family-tree; mythic gold-and-vermilion palette." },
  { key: "philosophy_school", parent: "religion", label: "Philosophy school", icon: "brain",
    hint: "A school of philosophical thought or doctrine.",
    style: "Greek bust portrait with key-tenet pull-quotes and lineage of thinkers; classical sepia palette." },
  { key: "mythological_creature", parent: "religion", label: "Mythical creature", icon: "ghost",
    hint: "A mythological creature, beast, or supernatural being.",
    style: "Bestiary illustration with naturalist's notes and anatomical labels; antique parchment palette." },
  { key: "mythological_legend", parent: "religion", label: "Legend / myth", icon: "magic-wand",
    hint: "A myth, legend, folk tale, or cosmological story.",
    style: "Folk-art panel with narrative captions and pictographic borders; warm earthen palette." },

  // medicine
  { key: "disease_specific", parent: "medicine", label: "Disease", icon: "virus",
    hint: "A specific disease, condition, or pathology.",
    style: "Symptom diagram with affected-organs map and prevalence stats; clinical pastel palette." },
  { key: "drug_medication", parent: "medicine", label: "Medication", icon: "pill",
    hint: "A drug, medication, or pharmaceutical.",
    style: "Pill-bottle hero with dosage chart and mechanism arrows; pharmacy clean palette." },
  { key: "mental_disorder", parent: "medicine", label: "Mental health", icon: "brain",
    hint: "A psychiatric or mental-health condition.",
    style: "Brain cross-section with affected regions highlighted and DSM-criteria callouts; muted clinical palette." },
  { key: "medical_procedure", parent: "medicine", label: "Procedure", icon: "first-aid-kit",
    hint: "A surgery, medical procedure, or therapy.",
    style: "Step-by-step surgical illustration with instrument labels and anatomy cross-section; clinical-blue palette." },

  // transport
  { key: "car_model", parent: "transport", label: "Car", icon: "car-profile",
    hint: "A specific car model or motorcycle.",
    style: "Side-elevation with spec callouts (HP, 0-60, MPG); badge inset and alloy-wheel detail; showroom palette." },
  { key: "aircraft", parent: "transport", label: "Aircraft", icon: "airplane",
    hint: "A specific aircraft, helicopter, or aviation vehicle.",
    style: "Three-view orthographic projection with wing-loading and range data; aviation-tech palette." },
  { key: "ship_vessel", parent: "transport", label: "Ship", icon: "boat",
    hint: "A specific ship, boat, or naval vessel.",
    style: "Naval-architect plan with displacement, complement, and armament stats; nautical navy-and-cream palette." },
  { key: "spacecraft", parent: "transport", label: "Spacecraft", icon: "rocket",
    hint: "A spacecraft, rocket, or space probe.",
    style: "Mission-patch with trajectory diagram and component cutaway; deep-space palette." },

  // astronomy
  { key: "planet_specific", parent: "astronomy", label: "Planet", icon: "planet",
    hint: "A specific planet, moon, or dwarf planet.",
    style: "Sphere hero with orbital-path inset and atmosphere cross-section; deep-space dark palette." },
  { key: "galaxy_specific", parent: "astronomy", label: "Galaxy", icon: "spiral",
    hint: "A specific galaxy, nebula, or large-scale cosmic structure.",
    style: "Spiral-arms anchor with classification (Hubble) and scale comparison; cosmic violet palette." },
  { key: "star_specific", parent: "astronomy", label: "Star", icon: "star-four",
    hint: "A specific star, star system, or constellation.",
    style: "HR-diagram position with luminosity and mass callouts; stellar-class color palette." },
  { key: "space_mission", parent: "astronomy", label: "Space mission", icon: "rocket-launch",
    hint: "A space mission, probe, or astronomical expedition.",
    style: "Mission timeline with key-event markers and patch design; deep-space mission palette." },

  // architecture
  { key: "skyscraper", parent: "architecture", label: "Skyscraper", icon: "building-office",
    hint: "A skyscraper or high-rise building.",
    style: "Vertical elevation with floor-count, height, and notable-tenants list; blueprint-and-ink palette." },
  { key: "bridge", parent: "architecture", label: "Bridge", icon: "line-segments",
    hint: "A bridge, tunnel, or transport-infrastructure structure.",
    style: "Side-elevation with span-length and support-type callouts; engineering blue palette." },
  { key: "castle_palace", parent: "architecture", label: "Castle", icon: "castle-turret",
    hint: "A castle, palace, fortress, or fortified structure.",
    style: "Plan view of fortifications with named towers and curtain walls; medieval-stone palette." },
  { key: "cathedral_temple", parent: "architecture", label: "Cathedral / temple", icon: "church",
    hint: "A cathedral, temple, mosque, synagogue, or other religious building.",
    style: "Floor plan with rose-window detail and named chapels; sacred-stone palette." },

  // math
  { key: "theorem", parent: "math", label: "Theorem", icon: "function",
    hint: "A specific theorem, proof, or mathematical result.",
    style: "Proof block with the key equation pulled out as title; minimalist textbook palette." },
  { key: "fractal", parent: "math", label: "Fractal", icon: "sparkle",
    hint: "A fractal, geometric pattern, or recursive mathematical object.",
    style: "Iterated illustration with parameter sidebar and depth-zoom inset; cool monochromatic palette." },
];

export const CATEGORIES: Category[] = [...PARENTS, ...SUBTYPES];

export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

export function getCategoryColor(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  const c = CATEGORY_BY_KEY[key];
  if (!c) return undefined;
  if (c.color) return c.color;
  if (c.parent) return CATEGORY_BY_KEY[c.parent]?.color;
  return undefined;
}

// Build the full style brief for a category — sub-types get the parent's
// detailed editorial direction PLUS their own subject-specific addendum,
// so the image model receives the most-specific guidance available.
export function getCategoryStyle(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  const c = CATEGORY_BY_KEY[key];
  if (!c) return undefined;
  if (c.parent) {
    const parent = CATEGORY_BY_KEY[c.parent];
    if (parent && parent.style) {
      return `${parent.style}\n\nSubject-specific direction (${c.label}): ${c.style}`;
    }
  }
  return c.style;
}

export function getParentKey(key: string): string {
  const c = CATEGORY_BY_KEY[key];
  return c?.parent ?? c?.key ?? key;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const CLASSIFIER_MODEL = process.env.CLASSIFIER_MODEL ?? "gpt-4o-mini";

const CLASSIFIER_CATEGORIES = CATEGORIES.filter((c) => !c.manualOnly);
const SYSTEM_PROMPT = `You classify Wikipedia articles into exactly one category from this list. Prefer the most specific sub-type that fits; fall back to the parent only when no sub-type matches.

${CLASSIFIER_CATEGORIES.map((c) => `- ${c.key}${c.parent ? ` (sub-type of ${c.parent})` : " (parent)"}: ${c.hint}`).join("\n")}

Return strictly JSON: {"category": "<key>"} where <key> is one of the keys above, or "none" if no category fits.`;

export async function classify(input: {
  title: string;
  description?: string;
  extract: string;
}): Promise<string | null> {
  const userMsg = [
    `Title: ${input.title}`,
    input.description ? `Short description: ${input.description}` : "",
    `Extract: ${input.extract.slice(0, 1200)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      console.warn("classifier non-200:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { category?: string };
    const key = parsed.category;
    if (!key || key === "none") return null;
    return CATEGORY_BY_KEY[key] ? key : null;
  } catch (err) {
    console.warn("classifier error:", err);
    return null;
  }
}
