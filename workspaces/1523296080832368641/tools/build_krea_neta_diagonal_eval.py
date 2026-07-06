#!/usr/bin/env python3

import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / "delivery" / "krea_neta_diagonal_eval"
SOURCE = DELIVERY / "source" / "moodboards.json"
PROMPT_PACKS = DELIVERY / "prompt_packs"


STYLE_FAMILIES = [
    {
        "id": "painterly_mythic",
        "label": "Painterly Mythic",
        "keywords": [
            "mythic",
            "folklore",
            "fantasy",
            "pastoral",
            "academic",
            "painterly",
            "impasto",
            "odyssey",
            "storybook",
            "legend",
            "romantic",
        ],
    },
    {
        "id": "cinematic_noir",
        "label": "Cinematic Noir",
        "keywords": [
            "noir",
            "cinematic",
            "chiaroscuro",
            "analog",
            "midnight",
            "neo-noir",
            "shadow",
            "surveillance",
        ],
    },
    {
        "id": "graphic_illustration",
        "label": "Graphic Illustration",
        "keywords": [
            "graphic",
            "vector",
            "editorial",
            "poster",
            "halftone",
            "mosaic",
            "illustration",
            "travelogue",
        ],
    },
    {
        "id": "animation_toon",
        "label": "Animation or Toon",
        "keywords": [
            "animation",
            "toon",
            "anime",
            "cel",
            "rubber hose",
            "kawaii",
            "cartoon",
        ],
    },
    {
        "id": "gothic_baroque",
        "label": "Gothic or Baroque",
        "keywords": [
            "gothic",
            "baroque",
            "opulent",
            "ornate",
            "victorian",
            "cathedral",
            "ritual",
            "gilded",
            "decay",
        ],
    },
    {
        "id": "retro_printmaking",
        "label": "Retro Printmaking",
        "keywords": [
            "woodblock",
            "printmaking",
            "etch",
            "engraving",
            "shin-hanga",
            "risograph",
            "linocut",
            "intaglio",
            "washi",
            "print",
        ],
    },
    {
        "id": "solarpunk_futurist",
        "label": "Solarpunk or Futurist",
        "keywords": [
            "solarpunk",
            "futur",
            "cyber",
            "chrome",
            "biophilic",
            "utopian",
            "retrofuture",
            "space age",
            "cybernetic",
        ],
    },
    {
        "id": "tactile_handcrafted",
        "label": "Tactile or Handcrafted",
        "keywords": [
            "tactile",
            "textile",
            "embroidery",
            "felt",
            "handcrafted",
            "craft",
            "collage",
            "paper cut",
            "clay",
            "stop-motion",
            "artisanal",
        ],
    },
    {
        "id": "surreal_scene_readable",
        "label": "Surreal but Scene-Readable",
        "keywords": [
            "surreal",
            "liminal",
            "dreamscape",
            "portal",
            "tiny planet",
            "fisheye",
            "diorama",
            "surrealist",
        ],
    },
    {
        "id": "luminous_ethereal",
        "label": "Luminous Ethereal",
        "keywords": [
            "luminous",
            "ethereal",
            "atmospheric",
            "misty",
            "glow",
            "alpine",
            "submerged",
            "celestial",
            "moonlit",
            "luminescent",
            "twilight",
        ],
    },
]


STYLE_MANUAL_EXCLUDE = {
    "Surreal Noir Noir",
    "Cinematic Surveillance Noir",
    "Analytical Cybernetic Surveillance",
    "Icy Cybernetic Noir",
    "Minimalist Cybernetic Noir",
    "Monochrome Cybernetic Deconstruction",
    "Luminous Thermal Diffusion",
    "Electric Analog Thermalism",
    "Bioluminescent Abyssal Macro",
    "Visceral Macro Expressionism",
    "Vibrant Corporate Geometry",
    "Monolithic Brutalist Vertigo",
    "Minimalist Glitch Avant-Garde",
    "Textured Minimalist Printmaking",
}


STYLE_MANUAL_PROMOTE = {
    "Painterly Mythic": [
        "Romantic Academic Impasto",
        "Romantic Academic Realism",
        "Nostalgic Pastoral Fantasy",
        "Luminous Impasto Mythos",
        "Vibrant Ghibli Fantasy",
    ],
    "Cinematic Noir": [
        "Cinematic Neo-Noir Chiaroscuro",
        "Cinematic Chiaroscuro Noir",
        "Cinematic Analog Noir",
        "Cinematic Nocturnal Noir",
        "Ghostly Chiaroscuro Noir",
    ],
    "Graphic Illustration": [
        "Bold Graphic Vectorism",
        "Mid-Century Vector Travelogue",
        "Graphic Risograph Pop",
        "Dynamic Electric Vectorism",
        "Ornate Graphic Maximalism",
    ],
    "Animation or Toon": [
        "Classic Cel Animation",
        "Vintage Rubber Hose Revival",
        "Playful Rubber-Hose Pop",
        "Nostalgic Cel Animation",
        "Bold Graphic Anime",
    ],
    "Gothic or Baroque": [
        "Gilded Gothic Decay",
        "Sacred Gothic Opulence",
        "Baroque Infernal Gothic",
        "Crimson Gothic Opulence",
        "Opulent Gothic Surrealism",
    ],
    "Retro Printmaking": [
        "Rustic Risograph Americana",
        "Classical Intaglio Monochromatism",
        "Hypnotic Linocut Nocturne",
        "Monochrome Etched Surrealism",
        "Atmospheric Shin-Hanga Prints",
    ],
    "Solarpunk or Futurist": [
        "Surreal Chrome Futurism",
        "Ethereal Solarpunk Dreamscapes",
        "Biophilic Solarpunk Horizon",
        "Surreal Chrome Pastoralism",
        "Lush Mythic Solarpunk",
    ],
    "Tactile or Handcrafted": [
        "Tactile Fiber Landscapes",
        "Tactile Whimsical Craft",
        "Tactile Whimsical Stop-Motion",
        "Artisanal Folk Whimsy",
        "Textured Editorial Folk",
    ],
    "Surreal but Scene-Readable": [
        "Surreal Liminal Pastoral",
        "Liminal Surrealist Distortion",
        "Hyperreal Digital Dreamscapes",
        "Surrealist Liminal Horizons",
        "Retro-Surrealist Neon Dreamscape",
    ],
    "Luminous Ethereal": [
        "Luminous Twilight Etherealism",
        "Luminous Celestial Fantasy",
        "Luminous Spectral Noir",
        "Ethereal Celestial Storybook",
        "Luminous Cosmic Nostalgia",
    ],
}


BANNED_STYLE_TOKENS = [
    "hud",
    "telemetry",
    "ui",
    "interface",
    "thermal",
    "macro",
    "corporate",
    "logo",
    "typography",
]


SUBJECT_READABILITY_TOKENS = [
    "character",
    "portrait",
    "figure",
    "silhouette",
    "landscape",
    "architecture",
    "city",
    "scene",
    "narrative",
    "world",
    "environment",
    "fantasy",
    "cinematic",
    "illustration",
    "odyssey",
    "folklore",
    "noir",
    "dreamscape",
    "pastoral",
    "gothic",
    "surreal",
]


RISK_FLAGS = {
    "ui_overlay_risk": ["hud", "telemetry", "interface", "surveillance"],
    "macro_bias": ["macro"],
    "abstraction_risk": ["abstraction", "abstract", "diffusion"],
    "single_object_bias": ["still-life", "packshot"],
    "dark_bias": ["noir", "dark", "midnight", "abyssal"],
}


IP_FAMILIES = [
    {
        "id": "mythic_fantasy",
        "label": "Mythic Fantasy",
        "secondaryLens": "epic_atlas",
        "assetCenterOfGravity": "characters_locations_artifacts_events",
        "visualRecognitionMechanism": "costume_heraldry_landscape_materials",
        "scale": "kingdom_to_continental",
        "timeStructure": "multi-era",
        "difficultyProfile": "high_lore_density",
        "ips": [
            "The Lord of the Rings",
            "A Song of Ice and Fire",
            "The Wheel of Time",
            "The Legend of Zelda",
            "The Elder Scrolls",
            "The Witcher",
            "Dragon Age",
            "Final Fantasy XIV",
            "Berserk",
            "Elden Ring",
        ],
    },
    {
        "id": "political_institutional",
        "label": "Political or Institutional",
        "secondaryLens": "faction_map",
        "assetCenterOfGravity": "organizations_leaders_locations_events",
        "visualRecognitionMechanism": "uniforms_architecture_insignia_power_symbols",
        "scale": "city_to_galactic",
        "timeStructure": "event_driven",
        "difficultyProfile": "faction_heavy",
        "ips": [
            "Dune",
            "Foundation",
            "Arcane",
            "Code Geass",
            "Legend of the Galactic Heroes",
            "The Expanse",
            "Succession",
            "House of the Dragon",
            "Three-Body Problem",
            "The Hunger Games",
        ],
    },
    {
        "id": "gothic_horror",
        "label": "Gothic or Horror-Inflected",
        "secondaryLens": "haunted_dossier",
        "assetCenterOfGravity": "locations_characters_secrets_events",
        "visualRecognitionMechanism": "silhouettes_decay_architecture_monsters",
        "scale": "estate_to_regional",
        "timeStructure": "layered_past",
        "difficultyProfile": "mood_and_monster_sensitive",
        "ips": [
            "Dracula",
            "Castlevania",
            "Bloodborne",
            "Dark Souls",
            "Resident Evil",
            "Silent Hill",
            "Coraline",
            "The Cthulhu Mythos",
            "Vampire Hunter D",
            "Diablo",
        ],
    },
    {
        "id": "youth_adventure",
        "label": "Youth Adventure",
        "secondaryLens": "route_map",
        "assetCenterOfGravity": "core_cast_entry_locations_rule_systems",
        "visualRecognitionMechanism": "hero_shapes_creatures_tools_threshold_places",
        "scale": "local_to_world",
        "timeStructure": "coming_of_age_progression",
        "difficultyProfile": "ensemble_balance",
        "ips": [
            "Harry Potter",
            "Percy Jackson",
            "Pokemon",
            "Digimon",
            "Avatar: The Last Airbender",
            "One Piece",
            "Hunter x Hunter",
            "How to Train Your Dragon",
            "Narnia",
            "Kiki's Delivery Service",
        ],
    },
    {
        "id": "modern_heroic",
        "label": "Modern Heroic",
        "secondaryLens": "icon_roster",
        "assetCenterOfGravity": "characters_teams_powers_cities",
        "visualRecognitionMechanism": "hero_silhouettes_costumes_power_fx",
        "scale": "city_to_planetary",
        "timeStructure": "serial_crisis",
        "difficultyProfile": "identity_and_power_sensitive",
        "ips": [
            "Marvel Universe",
            "DC Universe",
            "Spider-Man",
            "X-Men",
            "Invincible",
            "The Boys",
            "Kamen Rider",
            "Ultraman",
            "Power Rangers",
            "Sailor Moon",
        ],
    },
    {
        "id": "military_industrial",
        "label": "Military-Industrial",
        "secondaryLens": "tactical_brief",
        "assetCenterOfGravity": "organizations_units_vehicles_events",
        "visualRecognitionMechanism": "machines_uniforms_insignia_theaters",
        "scale": "regional_to_interstellar",
        "timeStructure": "campaign_or_war_arc",
        "difficultyProfile": "vehicle_and_doctrine_sensitive",
        "ips": [
            "Mobile Suit Gundam",
            "Halo",
            "Metal Gear",
            "Warhammer 40,000",
            "Valkyria Chronicles",
            "Battlestar Galactica",
            "Neon Genesis Evangelion",
            "Ace Combat",
            "Titanfall",
            "Armored Core",
        ],
    },
    {
        "id": "science_fiction_cosmic",
        "label": "Science Fiction or Cosmic",
        "secondaryLens": "creator_workbench",
        "assetCenterOfGravity": "locations_species_systems_events",
        "visualRecognitionMechanism": "ships_tech_architecture_skies",
        "scale": "planetary_to_cosmic",
        "timeStructure": "multi-era_or_exploration",
        "difficultyProfile": "worldbuilding_scale_heavy",
        "ips": [
            "Star Trek",
            "Mass Effect",
            "Destiny",
            "Doctor Who",
            "Alien",
            "Metroid",
            "Cowboy Bebop",
            "Trigun",
            "No Man's Sky",
            "Guardians of the Galaxy",
        ],
    },
    {
        "id": "creature_ecology",
        "label": "Creature or Ecology Driven",
        "secondaryLens": "field_guide",
        "assetCenterOfGravity": "creatures_locations_survival_rules",
        "visualRecognitionMechanism": "species_shapes_biomes_material_textures",
        "scale": "regional_to_world",
        "timeStructure": "expedition_or_cycle",
        "difficultyProfile": "biome_and_species_sensitive",
        "ips": [
            "Jurassic Park",
            "Monster Hunter",
            "Nausicaa of the Valley of the Wind",
            "Princess Mononoke",
            "Godzilla",
            "Made in Abyss",
            "ARK: Survival Evolved",
            "Subnautica",
            "The Dark Crystal",
            "Beastars",
        ],
    },
    {
        "id": "cozy_community",
        "label": "Cozy or Community Scale",
        "secondaryLens": "travel_guide",
        "assetCenterOfGravity": "characters_places_daily_systems",
        "visualRecognitionMechanism": "local_landmarks_palette_props_routines",
        "scale": "village_to_small_region",
        "timeStructure": "seasonal_or_daily_cycle",
        "difficultyProfile": "subtle_world_identity",
        "ips": [
            "Animal Crossing",
            "Stardew Valley",
            "Moomin",
            "Hilda",
            "Over the Garden Wall",
            "Rune Factory",
            "Harvest Moon",
            "Chiikawa",
            "The Wind in the Willows",
            "My Neighbor Totoro",
        ],
    },
    {
        "id": "surreal_concept_heavy",
        "label": "Surreal or Concept-Heavy",
        "secondaryLens": "story_engine_board",
        "assetCenterOfGravity": "characters_systems_symbols_locations",
        "visualRecognitionMechanism": "shape_language_symbols_color_logic",
        "scale": "mixed_scale",
        "timeStructure": "dreamlike_or_layered",
        "difficultyProfile": "concept_translation_risk",
        "ips": [
            "Adventure Time",
            "FLCL",
            "Paprika",
            "Control",
            "Disco Elysium",
            "JoJo's Bizarre Adventure",
            "Persona",
            "Kingdom Hearts",
            "Mononoke",
            "Twin Peaks",
        ],
    },
]


TENSION_STYLE_TARGET = {
    "mythic_fantasy": "luminous_ethereal",
    "political_institutional": "retro_printmaking",
    "gothic_horror": "graphic_illustration",
    "youth_adventure": "solarpunk_futurist",
    "modern_heroic": "tactile_handcrafted",
    "military_industrial": "painterly_mythic",
    "science_fiction_cosmic": "animation_toon",
    "creature_ecology": "gothic_baroque",
    "cozy_community": "surreal_scene_readable",
    "surreal_concept_heavy": "cinematic_noir",
}


PROMPT_PACK_OVERRIDES = {
    "the_lord_of_the_rings": {
        "primaryCharacterAnchor": "Aragorn as a weathered ranger-king with layered travel leathers, a worn cloak, a sword with lineage weight, and a restrained heroic bearing.",
        "primaryWorldAnchor": "Rivendell and the wider Middle-earth frontier with ancient stone, deep forests, river light, and signs of lost kingdoms.",
        "iconicStaticMoment": "A quiet council-like gathering where lineage, landscape, and artifact all read clearly in one frame.",
        "dynamicEventMoment": "A desperate mounted push through mud, banners, steel, and fractured light as mythic scale meets battlefield urgency.",
        "closeFramingDescription": "Character-first medium close framing that preserves costume texture, lineage symbols, and emotional gravity.",
        "wideFramingDescription": "Epic environmental framing that keeps ruins, topography, and journey scale readable around the cast.",
        "brightReadableLightDescription": "Open daylight or silver dawn light with high material readability and clear separation between character and landscape.",
        "darkDramaticLightDescription": "Torch, moon, or storm-cut low light with dramatic contrast while keeping heraldry and silhouette legible.",
    },
    "mobile_suit_gundam": {
        "primaryCharacterAnchor": "A young pilot under military pressure, grounded by uniform detail, cockpit ritual, and the scale contrast between human and machine.",
        "primaryWorldAnchor": "A war theater of colonies, carriers, launch bays, and scarred terrain where mobile suits read as industrial military objects, not fantasy robots.",
        "iconicStaticMoment": "A launch-bay readiness scene with pilot, machine, and command structure visible in one disciplined composition.",
        "dynamicEventMoment": "A high-velocity mobile-suit clash with contrails, debris, beam flare, and clear machine silhouettes.",
        "closeFramingDescription": "Human-first close framing that still hints at cockpit interfaces, insignia, and war strain.",
        "wideFramingDescription": "Large-scale battlefield framing that preserves machine readability and command-space geography.",
        "brightReadableLightDescription": "Harsh daylight, hangar light, or orbital white light that reveals panel lines, markings, and terrain logic.",
        "darkDramaticLightDescription": "Combat-night or interior emergency light with disciplined contrast and strong silhouette separation.",
    },
    "pokemon": {
        "primaryCharacterAnchor": "A young trainer paired with one flagship creature, emphasizing bond, silhouette clarity, and adventure-forward optimism.",
        "primaryWorldAnchor": "A route-based world of towns, paths, biomes, stadiums, and creature habitats with readable ecological variety.",
        "iconicStaticMoment": "A badge-journey pause where trainer, partner creature, and regional environment are all clearly legible.",
        "dynamicEventMoment": "A creature battle burst with readable move energy, trainer intent, and clean type identity rather than chaotic effects soup.",
        "closeFramingDescription": "Trainer-and-partner close framing that protects facial readability, creature silhouette, and relationship energy.",
        "wideFramingDescription": "Regional environment framing that keeps habitat logic and creature scale consistent.",
        "brightReadableLightDescription": "Clear daylight or stadium light with cheerful color fidelity and easy creature identification.",
        "darkDramaticLightDescription": "Storm, cave, or night battle light that adds tension without obscuring species identity or move readability.",
    },
    "dune": {
        "primaryCharacterAnchor": "Paul Atreides at the intersection of nobility, prophecy, and survival, with stillsuit function and political weight both readable.",
        "primaryWorldAnchor": "Arrakis as heat, sand, fortress geometry, ritual scale, and scarcity-driven technology rather than generic desert spectacle.",
        "iconicStaticMoment": "A ceremonial or strategic pause where costume, hierarchy, and desert architecture all register cleanly.",
        "dynamicEventMoment": "A sand-driven movement scene with scale shock, military threat, and environmental hostility all active together.",
        "closeFramingDescription": "Controlled close framing that keeps eyes, stillsuit details, and prophetic tension dominant.",
        "wideFramingDescription": "Monumental environmental framing where horizon, fortress mass, and desert conditions carry the world identity.",
        "brightReadableLightDescription": "Hard desert daylight that preserves texture, heat contrast, and political costume readability.",
        "darkDramaticLightDescription": "Firelit, eclipse-like, or interior low light that sharpens ritual power without muddying the stillsuit forms.",
    },
}


PROMPT_PACK_FIELDS = [
    "primaryCharacterAnchor",
    "primaryWorldAnchor",
    "iconicStaticMoment",
    "dynamicEventMoment",
    "closeFramingDescription",
    "wideFramingDescription",
    "brightReadableLightDescription",
    "darkDramaticLightDescription",
]


FAMILY_PROMPT_TEMPLATES = {
    "mythic_fantasy": {
        "primaryCharacterAnchor": "A signature hero, ruler, or feared wanderer from {ip_name}, with costume lineage, travel wear, weapons, and mythic bearing all reading cleanly.",
        "primaryWorldAnchor": "{ip_name} as a realm of old architecture, layered landscapes, sacred objects, contested borders, and deep historical weight rather than generic fantasy haze.",
        "iconicStaticMoment": "A ceremonial, council, or threshold pause where costume language, hierarchy, and place identity from {ip_name} are all visible in one frame.",
        "dynamicEventMoment": "A high-stakes clash, ride, or traversal through weather, terrain, magic, and steel that feels unmistakably native to {ip_name}.",
        "closeFramingDescription": "Character-first close or medium-close framing that preserves facial gravity, heraldry, gear detail, and narrative age.",
        "wideFramingDescription": "Epic wide framing that keeps routes, ruins, topography, and scale legible around the cast.",
        "brightReadableLightDescription": "Clear dawn, daylight, or silver-sky light with readable materials, visible costume structure, and crisp separation from the environment.",
        "darkDramaticLightDescription": "Torch, moon, storm, or fire-cut low light with strong contrast while keeping silhouettes, weapons, and place identity legible.",
    },
    "political_institutional": {
        "primaryCharacterAnchor": "A central heir, strategist, ruler, or operator from {ip_name}, with status signals, restraint, and institutional pressure visible in pose and costume.",
        "primaryWorldAnchor": "{ip_name} as a world of factions, halls of power, ritual architecture, strategic spaces, and systems shaped by hierarchy rather than generic spectacle.",
        "iconicStaticMoment": "A negotiation, briefing, coronation, or tense political pause where rank, allegiance, and setting all read immediately.",
        "dynamicEventMoment": "A movement scene driven by unrest, military response, collapse, or strategic maneuvering where the power structure of {ip_name} remains visible.",
        "closeFramingDescription": "Controlled close framing that keeps expression, insignia, and political tension dominant.",
        "wideFramingDescription": "Institution-first wide framing that makes architecture, crowd order, and power geometry readable.",
        "brightReadableLightDescription": "Hard daylight or disciplined interior light that clarifies rank markers, materials, and spatial hierarchy.",
        "darkDramaticLightDescription": "Low-key chamber, eclipse, firelit, or emergency light that sharpens intrigue without muddying faces or symbols.",
    },
    "gothic_horror": {
        "primaryCharacterAnchor": "A hunter, survivor, noble monster, or cursed figure from {ip_name}, with silhouette, costume decay, and threat readability held in balance.",
        "primaryWorldAnchor": "{ip_name} as haunted architecture, ritual space, rot, relics, and lurking danger instead of generic darkness.",
        "iconicStaticMoment": "A chapel, hallway, gate, or confrontation pause where dread, architecture, and character silhouette are all readable at once.",
        "dynamicEventMoment": "A pursuit, eruption, hunt, or revelation scene with violent motion, environmental menace, and clear monster or weapon logic.",
        "closeFramingDescription": "Close framing that protects face, wound, costume, and fear detail without losing silhouette clarity.",
        "wideFramingDescription": "Wide framing that treats the cursed location itself as a co-star around the figure.",
        "brightReadableLightDescription": "Cold overcast, pale daylight, or clinical spill light that reveals surfaces, stains, and gothic form cleanly.",
        "darkDramaticLightDescription": "Candle, moon, ember, or emergency low light with dramatic contrast while keeping threat shapes legible.",
    },
    "youth_adventure": {
        "primaryCharacterAnchor": "A young protagonist and their defining companion, tool, or power from {ip_name}, with optimism, silhouette clarity, and growth energy front and center.",
        "primaryWorldAnchor": "{ip_name} as a route-based or discovery-driven world of towns, thresholds, creatures, schools, ships, or biomes with strong readability and invitation.",
        "iconicStaticMoment": "A journey pause, arrival, or badge-like milestone where hero identity, companion logic, and regional setting all register cleanly.",
        "dynamicEventMoment": "A training burst, chase, battle, or traversal scene with readable action beats, rule-system logic, and youthful momentum.",
        "closeFramingDescription": "Close framing that protects expression, companion relationship, and iconic costume or prop readability.",
        "wideFramingDescription": "Wide framing that makes the destination, route, habitat, or adventure space clearly understandable.",
        "brightReadableLightDescription": "Open daylight or celebratory light with cheerful color fidelity and easy identification of characters and creatures.",
        "darkDramaticLightDescription": "Night, cave, storm, or battle light that adds tension without obscuring identity or action readability.",
    },
    "modern_heroic": {
        "primaryCharacterAnchor": "A defining hero, antihero, or team lead from {ip_name}, with silhouette, costume logic, power signature, and urban or civic presence clearly readable.",
        "primaryWorldAnchor": "{ip_name} as a city, civic zone, or crisis theater shaped by teams, powers, landmarks, and public stakes rather than generic action blur.",
        "iconicStaticMoment": "A rooftop, team lineup, aftermath, or pre-crisis pause where identity, power language, and city context all read immediately.",
        "dynamicEventMoment": "A rescue, pursuit, impact, or power collision with readable motion lines, environment damage, and controlled spectacle.",
        "closeFramingDescription": "Close framing that emphasizes mask, face, emblem, armor, or power effect clarity without clutter.",
        "wideFramingDescription": "Wide framing that treats the city or crisis field as an active part of the image, not just a backdrop.",
        "brightReadableLightDescription": "Daylight, broadcast, or industrial spill light that keeps costume structure and power effects readable.",
        "darkDramaticLightDescription": "Noir, rain, night, or emergency low light with enough separation to keep hero shapes instantly recognizable.",
    },
    "military_industrial": {
        "primaryCharacterAnchor": "A pilot, soldier, commander, or operator from {ip_name}, with disciplined gear, role signals, and human-to-machine scale contrast reading clearly.",
        "primaryWorldAnchor": "{ip_name} as carriers, bases, cockpits, fronts, factories, colonies, or war-scarred terrain where vehicles and command structure stay readable.",
        "iconicStaticMoment": "A launch, deployment, briefing, or maintenance-ready pause where command chain, machine presence, and theater identity all read in one frame.",
        "dynamicEventMoment": "A mechanized clash, sortie, bombardment, or tactical retreat with clear vehicle silhouettes, debris logic, and battlefield geography.",
        "closeFramingDescription": "Close framing that holds onto human stress, insignia, cockpit ritual, or tactical equipment detail.",
        "wideFramingDescription": "Wide framing that preserves machine readability, formation logic, and command-space scale.",
        "brightReadableLightDescription": "Harsh daylight, orbital white, or hangar light that reveals markings, panel lines, terrain, and mechanical structure.",
        "darkDramaticLightDescription": "Combat-night, emergency, or hangar low light with disciplined contrast and strong silhouette separation.",
    },
    "science_fiction_cosmic": {
        "primaryCharacterAnchor": "A signature explorer, officer, drifter, hunter, or cosmic protagonist from {ip_name}, with technology, costume, and attitude specific enough to read at a glance.",
        "primaryWorldAnchor": "{ip_name} as ships, stations, alien horizons, strange skies, engineered interiors, and speculative systems rather than generic sci-fi glow.",
        "iconicStaticMoment": "A bridge, docking, arrival, or discovery pause where scale, tech language, and character role all read immediately.",
        "dynamicEventMoment": "A launch, chase, breach, encounter, or zero-gravity conflict where movement, machinery, and cosmic scale stay legible.",
        "closeFramingDescription": "Close framing that keeps face, gear, interface-adjacent objects, and species or faction markers clear without UI clutter.",
        "wideFramingDescription": "Wide framing that makes ships, stations, terrain, or sky phenomena do real worldbuilding work.",
        "brightReadableLightDescription": "Clean daylight, ship interior white, or high-visibility cosmic light that clarifies structure and materials.",
        "darkDramaticLightDescription": "Nebula, starlight, reactor, or corridor low light with clear silhouette separation and readable tech forms.",
    },
    "creature_ecology": {
        "primaryCharacterAnchor": "A field survivor, rider, researcher, guardian, or creature-linked lead from {ip_name}, grounded by scale contrast with a defining species or biome.",
        "primaryWorldAnchor": "{ip_name} as habitat logic, creature ecology, weather, terrain, and material textures that feel studied rather than decorative.",
        "iconicStaticMoment": "A tracking, feeding, lookout, or quiet encounter moment where creature identity, human relation, and biome all read clearly.",
        "dynamicEventMoment": "A hunt, migration, defense, escape, or ecosystem rupture scene with readable creature motion and terrain logic.",
        "closeFramingDescription": "Close framing that preserves species silhouette, hide, fur, scale, or mask detail alongside human reaction.",
        "wideFramingDescription": "Wide framing that makes biome structure and creature scale relationships immediately understandable.",
        "brightReadableLightDescription": "Clear daylight or atmospheric natural light that reveals texture, color, and ecological detail cleanly.",
        "darkDramaticLightDescription": "Storm, underwater, cave, forest, or volcanic low light with tension while keeping species identity readable.",
    },
    "cozy_community": {
        "primaryCharacterAnchor": "A defining resident, wanderer, helper, or local pair from {ip_name}, with friendly silhouette, routine props, and emotional warmth clearly readable.",
        "primaryWorldAnchor": "{ip_name} as a lived-in town, village, valley, woodland, or neighborhood with local landmarks, seasonal cues, and small-scale world identity.",
        "iconicStaticMoment": "A shopfront, porch, path, festival, or everyday milestone where character, place, and routine all register at once.",
        "dynamicEventMoment": "A weather shift, delivery run, harvest burst, communal task, or playful scramble with motion that stays gentle and readable.",
        "closeFramingDescription": "Close framing that protects expression, prop charm, and fabric or object detail without crowding the image.",
        "wideFramingDescription": "Wide framing that lets the settlement layout, pathways, and local landmarks carry the world identity.",
        "brightReadableLightDescription": "Soft daylight, golden hour, or clear seasonal light with clean palette separation and welcoming detail.",
        "darkDramaticLightDescription": "Rainy evening, lantern, snowfall, or moonlit low light that stays cozy and legible rather than muddy.",
    },
    "surreal_concept_heavy": {
        "primaryCharacterAnchor": "A signature dreamer, investigator, performer, or symbolic protagonist from {ip_name}, with distinct silhouette and concept language readable in one glance.",
        "primaryWorldAnchor": "{ip_name} as a system of symbols, altered spaces, uncanny objects, impossible transitions, and layered reality that still reads as a scene.",
        "iconicStaticMoment": "A threshold, stage, room, or symbolic encounter where the visual logic of {ip_name} feels strange but interpretable.",
        "dynamicEventMoment": "A transformation, chase, collapse, or psychic event where surreal motion and symbolic logic stay readable instead of dissolving into noise.",
        "closeFramingDescription": "Close framing that keeps expression, signature objects, and visual metaphor sharp without abstracting the image away.",
        "wideFramingDescription": "Wide framing that explains the spatial weirdness of the world while keeping a stable focal hierarchy.",
        "brightReadableLightDescription": "Daylit, spotlight, or clear-color surreal lighting that keeps symbols, textures, and character edges distinct.",
        "darkDramaticLightDescription": "Dream-night, theater, alley, or liminal low light with controlled contrast and readable visual logic.",
    },
}


RUN_TEMPLATE = [
    {"runIndex": 1, "styleRole": "fit", "subjectCenter": "character_led", "sceneMode": "iconic_static", "shotMode": "close", "lightMode": "bright"},
    {"runIndex": 2, "styleRole": "fit", "subjectCenter": "character_led", "sceneMode": "iconic_static", "shotMode": "wide", "lightMode": "dark"},
    {"runIndex": 3, "styleRole": "fit", "subjectCenter": "world_led", "sceneMode": "dynamic_event", "shotMode": "close", "lightMode": "bright"},
    {"runIndex": 4, "styleRole": "fit", "subjectCenter": "world_led", "sceneMode": "dynamic_event", "shotMode": "wide", "lightMode": "dark"},
    {"runIndex": 5, "styleRole": "tension", "subjectCenter": "character_led", "sceneMode": "dynamic_event", "shotMode": "close", "lightMode": "dark"},
    {"runIndex": 6, "styleRole": "tension", "subjectCenter": "character_led", "sceneMode": "dynamic_event", "shotMode": "wide", "lightMode": "bright"},
    {"runIndex": 7, "styleRole": "tension", "subjectCenter": "world_led", "sceneMode": "iconic_static", "shotMode": "close", "lightMode": "dark"},
    {"runIndex": 8, "styleRole": "tension", "subjectCenter": "world_led", "sceneMode": "iconic_static", "shotMode": "wide", "lightMode": "bright"},
]


def slugify(value):
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def strip_leading_article(value):
    return re.sub(r"^(the|a|an)\s+", "", value, flags=re.IGNORECASE).strip()


def load_moodboards():
    with SOURCE.open() as f:
        raw = json.load(f)
    unique = {}
    for item in raw:
        name = item["name"].strip()
        existing = unique.get(name)
        score = item.get("imageCount") or item.get("totalImages") or 0
        if existing is None or score > (existing.get("imageCount") or existing.get("totalImages") or 0):
            unique[name] = item
    return list(unique.values())


def build_blob(item):
    return " ".join(
        [
            item.get("name", ""),
            item.get("styleDescription", ""),
            " ".join(item.get("styleKeywords", [])),
        ]
    ).lower()


def risk_flags(blob):
    flags = []
    for key, tokens in RISK_FLAGS.items():
        if any(token in blob for token in tokens):
            flags.append(key)
    return flags


def suitability_score(blob):
    read_hits = sum(1 for token in SUBJECT_READABILITY_TOKENS if token in blob)
    ban_hits = sum(1 for token in BANNED_STYLE_TOKENS if token in blob)
    return read_hits * 2 - ban_hits * 4


def classify_styles(moodboards):
    by_family = defaultdict(list)
    family_by_label = {family["label"]: family for family in STYLE_FAMILIES}
    for item in moodboards:
        name = item["name"].strip()
        if name in STYLE_MANUAL_EXCLUDE:
            continue
        blob = build_blob(item)
        suit = suitability_score(blob)
        if suit < -2:
            continue
        flags = risk_flags(blob)
        for family in STYLE_FAMILIES:
            hits = sum(blob.count(keyword) for keyword in family["keywords"])
            if hits == 0:
                continue
            score = hits * 10 + suit + min(item.get("imageCount") or item.get("totalImages") or 0, 16) / 8
            if family["id"] == "cinematic_noir" and "ui_overlay_risk" in flags:
                score -= 6
            if family["id"] == "solarpunk_futurist" and "ui_overlay_risk" in flags:
                score -= 10
            if family["id"] == "surreal_scene_readable" and "macro_bias" in flags:
                score -= 8
            if family["id"] == "luminous_ethereal" and "abstraction_risk" in flags:
                score -= 6
            by_family[family["label"]].append(
                {
                    "name": name,
                    "familyId": family["id"],
                    "familyLabel": family["label"],
                    "selectionScore": round(score, 2),
                    "suitabilityScore": suit,
                    "riskFlags": flags,
                    "styleKeywords": item.get("styleKeywords", []),
                    "styleDescription": item.get("styleDescription", ""),
                    "imageCount": item.get("imageCount") or item.get("totalImages") or 0,
                    "sourceMoodboardId": item.get("id"),
                    "previewImages": [image["url"] for image in item.get("previewImages", [])[:4]],
                }
            )
    selected = []
    selected_names = set()
    for family in STYLE_FAMILIES:
        family_label = family["label"]
        family_items = sorted(by_family[family_label], key=lambda item: (-item["selectionScore"], item["name"]))
        promoted = STYLE_MANUAL_PROMOTE.get(family_label, [])
        promoted_lookup = {item["name"]: item for item in family_items}
        picks = []
        for name in promoted:
            item = promoted_lookup.get(name)
            if item and item["name"] not in selected_names and item["name"] not in {pick["name"] for pick in picks}:
                picks.append(item)
        for item in family_items:
            if item["name"] in selected_names or item["name"] in {pick["name"] for pick in picks}:
                continue
            picks.append(item)
            if len(picks) == 10:
                break
        if len(picks) < 10:
            raise RuntimeError(f"Could not find 10 styles for family {family_label}")
        family_selected = picks[:10]
        for index, item in enumerate(family_selected, start=1):
            selected_names.add(item["name"])
            item["styleId"] = f"style_{family['id']}_{index:02d}"
            item["familyIndex"] = index
            selected.append(item)
    return selected


def build_ip_pool():
    pool = []
    for family in IP_FAMILIES:
        for index, name in enumerate(family["ips"], start=1):
            pool.append(
                {
                    "ipId": f"ip_{family['id']}_{index:02d}",
                    "slug": slugify(name),
                    "name": name,
                    "primaryFamily": family["id"],
                    "primaryFamilyLabel": family["label"],
                    "secondaryLens": family["secondaryLens"],
                    "assetCenterOfGravity": family["assetCenterOfGravity"],
                    "visualRecognitionMechanism": family["visualRecognitionMechanism"],
                    "scale": family["scale"],
                    "timeStructure": family["timeStructure"],
                    "difficultyProfile": family["difficultyProfile"],
                    "familyIndex": index,
                }
            )
    return pool


def build_assignments(styles, ips):
    styles_by_family = defaultdict(list)
    for style in styles:
        styles_by_family[style["familyId"]].append(style)
    ips_by_family = defaultdict(list)
    for ip in ips:
        ips_by_family[ip["primaryFamily"]].append(ip)
    assignments = []
    style_usage = defaultdict(int)
    for family in IP_FAMILIES:
        ip_family = family["id"]
        fit_style_family = {
            "mythic_fantasy": "painterly_mythic",
            "political_institutional": "graphic_illustration",
            "gothic_horror": "gothic_baroque",
            "youth_adventure": "animation_toon",
            "modern_heroic": "cinematic_noir",
            "military_industrial": "retro_printmaking",
            "science_fiction_cosmic": "solarpunk_futurist",
            "creature_ecology": "luminous_ethereal",
            "cozy_community": "tactile_handcrafted",
            "surreal_concept_heavy": "surreal_scene_readable",
        }[ip_family]
        tension_style_family = TENSION_STYLE_TARGET[ip_family]
        ip_list = ips_by_family[ip_family]
        fit_style_list = styles_by_family[fit_style_family]
        tension_style_list = styles_by_family[tension_style_family]
        for index, ip in enumerate(ip_list):
            fit_style = fit_style_list[index]
            tension_style = tension_style_list[index]
            assignments.append(
                {
                    "ipId": ip["ipId"],
                    "ipName": ip["name"],
                    "ipFamily": ip["primaryFamily"],
                    "styleRole": "fit",
                    "styleId": fit_style["styleId"],
                    "styleName": fit_style["name"],
                    "styleFamily": fit_style["familyId"],
                }
            )
            assignments.append(
                {
                    "ipId": ip["ipId"],
                    "ipName": ip["name"],
                    "ipFamily": ip["primaryFamily"],
                    "styleRole": "tension",
                    "styleId": tension_style["styleId"],
                    "styleName": tension_style["name"],
                    "styleFamily": tension_style["familyId"],
                }
            )
            style_usage[fit_style["styleId"]] += 1
            style_usage[tension_style["styleId"]] += 1
    if any(count != 2 for count in style_usage.values()):
        bad = {style_id: count for style_id, count in style_usage.items() if count != 2}
        raise RuntimeError(f"Style usage imbalance: {bad}")
    return assignments


def aspect_profile(subject_center, shot_mode):
    if subject_center == "character_led" and shot_mode == "close":
        return "portrait_4x5"
    if subject_center == "world_led" and shot_mode == "wide":
        return "landscape_16x9"
    return "square_1x1"


def build_run_matrix(ips, assignments):
    assignment_lookup = {(row["ipId"], row["styleRole"]): row for row in assignments}
    rows = []
    for ip in ips:
        for template in RUN_TEMPLATE:
            style_row = assignment_lookup[(ip["ipId"], template["styleRole"])]
            rows.append(
                {
                    "runId": f"{ip['ipId']}_r{template['runIndex']:02d}",
                    "ipId": ip["ipId"],
                    "ipName": ip["name"],
                    "ipFamily": ip["primaryFamily"],
                    "styleRole": template["styleRole"],
                    "styleId": style_row["styleId"],
                    "styleName": style_row["styleName"],
                    "styleFamily": style_row["styleFamily"],
                    "subjectCenter": template["subjectCenter"],
                    "sceneMode": template["sceneMode"],
                    "shotMode": template["shotMode"],
                    "lightMode": template["lightMode"],
                    "aspectProfile": aspect_profile(template["subjectCenter"], template["shotMode"]),
                    "seedSlot": template["runIndex"],
                }
            )
    return rows


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def validate_prompt_pack(payload):
    missing = [field for field in PROMPT_PACK_FIELDS if not payload.get(field)]
    if missing:
        raise RuntimeError(f"Prompt pack missing fields: {missing}")


def build_default_prompt_pack(ip):
    template = FAMILY_PROMPT_TEMPLATES[ip["primaryFamily"]]
    ip_name = ip["name"]
    ip_short = strip_leading_article(ip_name)
    payload = {
        field: value.format(ip_name=ip_name, ip_short=ip_short)
        for field, value in template.items()
    }
    validate_prompt_pack(payload)
    return payload


def build_prompt_pack(ip):
    payload = build_default_prompt_pack(ip)
    override = PROMPT_PACK_OVERRIDES.get(ip["slug"])
    if override:
        payload.update(override)
    validate_prompt_pack(payload)
    return payload


def write_prompt_packs(ips):
    PROMPT_PACKS.mkdir(parents=True, exist_ok=True)
    for path in PROMPT_PACKS.glob("*.json"):
        path.unlink()
    for ip in ips:
        write_json(PROMPT_PACKS / f"{ip['slug']}.json", build_prompt_pack(ip))


def write_readme(styles, ips, assignments, run_matrix):
    lines = [
        "# Krea Neta Studio Diagonal Eval Delivery",
        "",
        "This package contains the first-pass 800-run diagonal eval setup.",
        "",
        f"- Styles: {len(styles)}",
        f"- IPs: {len(ips)}",
        f"- Style/IP assignment rows: {len(assignments)}",
        f"- Run matrix rows: {len(run_matrix)}",
        "",
        "Files:",
        "",
        "- `style_pool_100.json` contains the 100-style shortlist with family tags, selection scores, risk flags, and preview URLs.",
        "- `ip_pool_100.json` contains the 100-IP shortlist with Neta diagnosis tags.",
        "- `style_ip_assignment.csv` maps every IP to one fit style and one tension style.",
        "- `run_matrix_800.csv` contains the 800-run diagonal matrix ready for execution.",
        "- `prompt_packs/` contains one prompt pack for each of the 100 IPs in the run matrix.",
        "- `delivery_summary.json` records the count checks.",
        "- `source/moodboards.json` is the local cache of the harvested Krea moodboard library used to build the shortlist.",
        "",
        "Executor:",
        "",
        "- `node tools/run_krea_neta_diagonal_eval.mjs inspect` checks package completeness.",
        "- `node tools/run_krea_neta_diagonal_eval.mjs dry-run` renders all 800 request payloads without submitting jobs.",
        "- `node tools/run_krea_neta_diagonal_eval.mjs run --ip-slugs foundation --limit 1` submits a real smoke job.",
        "- Real runs write request JSON, job evidence, summary JSON, and downloaded image files under `execution_runs/`.",
        "",
        "Execution notes:",
        "",
        "- Every style is used exactly twice across the assignment table.",
        "- Every IP receives exactly 8 runs in the matrix.",
        "- Native Krea moodboard injection remains out of scope. Style is represented through the external shortlist and prompt-pack route.",
    ]
    (DELIVERY / "README.md").write_text("\n".join(lines) + "\n")


def main():
    DELIVERY.mkdir(parents=True, exist_ok=True)
    moodboards = load_moodboards()
    styles = classify_styles(moodboards)
    ips = build_ip_pool()
    assignments = build_assignments(styles, ips)
    run_matrix = build_run_matrix(ips, assignments)

    write_json(DELIVERY / "style_pool_100.json", styles)
    write_json(DELIVERY / "ip_pool_100.json", ips)
    write_csv(
        DELIVERY / "style_ip_assignment.csv",
        assignments,
        ["ipId", "ipName", "ipFamily", "styleRole", "styleId", "styleName", "styleFamily"],
    )
    write_csv(
        DELIVERY / "run_matrix_800.csv",
        run_matrix,
        [
            "runId",
            "ipId",
            "ipName",
            "ipFamily",
            "styleRole",
            "styleId",
            "styleName",
            "styleFamily",
            "subjectCenter",
            "sceneMode",
            "shotMode",
            "lightMode",
            "aspectProfile",
            "seedSlot",
        ],
    )
    write_prompt_packs(ips)
    summary = {
        "styles": len(styles),
        "ips": len(ips),
        "assignmentRows": len(assignments),
        "runRows": len(run_matrix),
        "styleFamilies": {family["id"]: 10 for family in STYLE_FAMILIES},
        "ipFamilies": {family["id"]: 10 for family in IP_FAMILIES},
        "styleUsageCheck": "pass",
        "runTemplateRowsPerIp": 8,
        "promptPackCount": len(ips),
        "manualPromptPackOverrides": sorted(
            slug for slug in PROMPT_PACK_OVERRIDES.keys() if slug in {ip["slug"] for ip in ips}
        ),
    }
    write_json(DELIVERY / "delivery_summary.json", summary)
    write_readme(styles, ips, assignments, run_matrix)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
