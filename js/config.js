/* =========================================================
    Dicebound
    Config
     ========================================================= */


/* =========================================================
    1. Core Game Constants
     ========================================================= */

export const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const proficiencyBonus = 2;

export const portraitApiUrl = window.location.hostname === "localhost" ||
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
    "Bone Crest",
    "Brown",
    "Copper",
    "Dark Blue",
    "Gold",
    "Grey",
    "Horned Crest",
    "No Hair",
    "Red",
    "Scaled Crest",
    "Silver",
    "Spined Crest",
    "White"
],

skinTones: [
    "Ashen",
    "Black Scales",
    "Blue-Grey",
    "Blue Scales",
    "Bronze",
    "Bronze Scales",
    "Copper Scales",
    "Copper-Toned",
    "Deep Brown",
    "Fair",
    "Gold Scales",
    "Golden",
    "Green",
    "Green Scales",
    "Grey",
    "Grey-Green",
    "Olive",
    "Pale",
    "Pale Grey",
    "Purple",
    "Red",
    "Red Scales",
    "Silver Scales",
    "Stone Grey",
    "Warm Brown",
    "White Scales",
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
