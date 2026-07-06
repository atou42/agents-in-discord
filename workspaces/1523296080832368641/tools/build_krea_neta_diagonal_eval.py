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


PILOT_PROMPT_PACKS = {
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
    "batman": {
        "primaryCharacterAnchor": "Batman as a severe urban silhouette with sculpted cowl, cape geometry, tactical restraint, and detective presence over brute spectacle.",
        "primaryWorldAnchor": "Gotham as a vertical, wet, gothic-industrial city of stone, steel, signage, alleys, rooftops, and civic decay.",
        "iconicStaticMoment": "A rooftop perch where cape shape, skyline, gargoyle architecture, and urban dread all read at once.",
        "dynamicEventMoment": "A rain-slashed pursuit through neon-shadowed streets with controlled impact, debris, and surveillance pressure.",
        "closeFramingDescription": "Face-and-shoulder or upper-body framing that emphasizes cowl silhouette, armor texture, and investigative tension.",
        "wideFramingDescription": "City-first framing that treats Gotham itself as a co-star around a lone heroic figure.",
        "brightReadableLightDescription": "Cold overcast or industrial spill light that clarifies suit structure and architectural detail without losing mood.",
        "darkDramaticLightDescription": "Low-key noir lighting with rim edges on the cape and enough value separation to keep the figure readable.",
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


def write_prompt_packs():
    PROMPT_PACKS.mkdir(parents=True, exist_ok=True)
    for slug, payload in PILOT_PROMPT_PACKS.items():
        write_json(PROMPT_PACKS / f"{slug}.json", payload)


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
        "- `prompt_packs/` contains five pilot prompt-pack examples.",
        "- `delivery_summary.json` records the count checks.",
        "- `source/moodboards.json` is the local cache of the harvested Krea moodboard library used to build the shortlist.",
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
    write_prompt_packs()
    summary = {
        "styles": len(styles),
        "ips": len(ips),
        "assignmentRows": len(assignments),
        "runRows": len(run_matrix),
        "styleFamilies": {family["id"]: 10 for family in STYLE_FAMILIES},
        "ipFamilies": {family["id"]: 10 for family in IP_FAMILIES},
        "styleUsageCheck": "pass",
        "runTemplateRowsPerIp": 8,
        "pilotPromptPacks": sorted(PILOT_PROMPT_PACKS.keys()),
    }
    write_json(DELIVERY / "delivery_summary.json", summary)
    write_readme(styles, ips, assignments, run_matrix)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
