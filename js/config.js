/* =========================================================
    Dicebound
    Frontend Configuration
    ---------------------------------------------------------
    This file stores shared frontend constants used by the
    modular Dicebound browser app.

    Responsibilities:
    - define core ability abbreviations
    - define the Level 1 proficiency bonus
    - select the correct portrait API URL for local or hosted use
    - define JSON data file paths
    - provide safe fallback values if optional data files are
        missing or incomplete
    - provide shared default text and loading button labels

    Species-specific appearance data should normally come from
    data/species-appearance.json. The fallback physical traits
    below are only a safety net, not the main species data source.
   ========================================================= */


/* =========================================================
    1. Core Game Constants
   ========================================================= */

export const abilities = [
    "STR",
    "DEX",
    "CON",
    "INT",
    "WIS",
    "CHA"
];

export const proficiencyBonus = 2;

export const portraitApiUrl =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001/api/generate-portrait"
        : "https://dnd-character-creator-0aqj.onrender.com/api/generate-portrait";


/* =========================================================
    2. Data File Paths
   ========================================================= */

export const dataPaths = {
    names: [
        "data/names.json",
        "names.json"
    ],

    classes: "data/classes.json",

    questions: "data/questions.json",

    speciesCore: "data/species-core.json",

    speciesAppearance: "data/species-appearance.json",

    speciesProfile: "data/species-profile.json",

    notableFeatures: "data/notable-features.json"
};


/* =========================================================
    3. Default Fallback Character Data
   ========================================================= */

export const defaultPhysicalTraits = {
    heights: [
        "Short",
        "Average Height",
        "Tall",
        "Very Tall"
    ],

    builds: [
        "Thin",
        "Lean",
        "Average Build",
        "Stocky",
        "Broad",
        "Heavy-Set",
        "Fat",
        "Muscular"
    ],

    eyeColours: [
        "Amber",
        "Black",
        "Blue",
        "Brown",
        "Gold",
        "Green",
        "Grey",
        "Hazel",
        "Red",
        "Silver",
        "Violet",
        "White",
        "Yellow"
    ],

    hairColours: [
        "Ash-Grey",
        "Auburn",
        "Black",
        "Blonde",
        "Brown",
        "Copper",
        "Dark Blue",
        "Gold",
        "Grey",
        "Red",
        "Silver",
        "White"
    ],

    hairStyles: [
        "Long Loose Hair",
        "Shoulder-Length Hair",
        "Short Hair",
        "Short Back And Sides",
        "Ponytail",
        "Single Plait",
        "Twin Plaits",
        "Braided Hair",
        "Messy Hair",
        "Curly Hair",
        "Shaved Sides",
        "Shaved Head",
        "Bald",
        "No Hair"
    ],

    skinTones: [
        "Ashen",
        "Blue-Grey",
        "Bronze",
        "Copper-Toned",
        "Deep Brown",
        "Fair",
        "Golden",
        "Green",
        "Grey",
        "Grey-Green",
        "Olive",
        "Pale",
        "Pale Grey",
        "Purple",
        "Red",
        "Stone Grey",
        "Warm Brown",
        "Yellow-Green"
    ],

    notableFeatures: [
        "No Obvious Unusual Feature"
    ]
};


/* =========================================================
    4. Default Text Values
   ========================================================= */

export const defaultText = {
    unnamedCharacter: "Unnamed Adventurer",
    noSpeciesBackground: "No species background is available.",
    flexiblePlaystyle: "Flexible Problem-Solver",
    noSpeciesWeakness: "No specific species weakness is defined.",
    noTypicalTraits: "No typical traits listed",
    noNotableFeature: "No Obvious Unusual Feature"
};


/* =========================================================
    5. Loading Button Text
   ========================================================= */

export const loadingText = {
    loadingData: "Loading Data...",
    dataFileMissing: "Data File Missing",
    randomiseCharacter: "Randomise Character",
    loadingSpecies: "Loading Species...",
    speciesDataMissing: "Species Data Missing",
    loadingNotableFeatures: "Loading Visual Features...",
    notableFeaturesMissing: "Visual Features Missing",
    choose: "Choose..."
};