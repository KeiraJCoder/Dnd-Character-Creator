/* =========================================================
    Dicebound
    Data Loading
    ---------------------------------------------------------
    This file loads and normalises the JSON data used by the
    Dicebound frontend.

    Responsibilities:
    - fetch JSON files from the configured data paths
    - validate required data before the app uses it
    - merge species core, appearance and profile data
    - preserve rich notable feature data for portrait prompts
    - provide safe fallback data when optional files are missing

    This file should not contain species anatomy prompt rules.
    Species anatomy belongs in species-portrait-rules.json and
    the backend speciesPromptService.js.

    This file should not contain character creation logic.
    Character object creation belongs in character.js.
   ========================================================= */

import {
    dataPaths,
    defaultPhysicalTraits,
    defaultText
} from "./config.js";

import {
    state,
    setNameData,
    setClassData,
    setQuestionData,
    setSpeciesData,
    setNotableFeatures,
    setDataLoadingError
} from "./state.js";

import {
    hasItems
} from "./utils.js";


/* =========================================================
    1. Fetch Helpers
   ========================================================= */

export async function fetchJson(filePath) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Could not load ${filePath}. Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Problem loading JSON file: ${filePath}`, error);
        throw error;
    }
}

export async function fetchJsonFromPaths(filePaths) {
    const paths = Array.isArray(filePaths)
        ? filePaths
        : [filePaths];

    let lastError = null;

    for (const filePath of paths) {
        try {
            return await fetchJson(filePath);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}


/* =========================================================
    2. General Data Validation Helpers
   ========================================================= */

export function getValidPool(pool, fallbackPool) {
    return hasItems(pool) ? pool : fallbackPool;
}

function cleanString(value) {
    return String(value || "").trim();
}

function normaliseKey(value) {
    return cleanString(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function cleanStringList(items) {
    if (!hasItems(items)) {
        return [];
    }

    return [
        ...new Set(
            items
                .map(item => cleanString(item))
                .filter(Boolean)
        )
    ];
}

function cleanOptionalString(value) {
    const cleanedValue = cleanString(value);

    return cleanedValue || "";
}


/* =========================================================
    3. Physical Trait Normalisation
   ========================================================= */

export function normalisePhysicalTraits(physicalTraits = {}) {
    return {
        heights: getValidPool(
            physicalTraits.heights,
            defaultPhysicalTraits.heights
        ),

        builds: getValidPool(
            physicalTraits.builds,
            defaultPhysicalTraits.builds
        ),

        eyeColours: getValidPool(
            physicalTraits.eyeColours,
            defaultPhysicalTraits.eyeColours
        ),

        hairColours: getValidPool(
            physicalTraits.hairColours,
            defaultPhysicalTraits.hairColours
        ),

        hairStyles: getValidPool(
            physicalTraits.hairStyles,
            defaultPhysicalTraits.hairStyles
        ),

        skinTones: getValidPool(
            physicalTraits.skinTones,
            defaultPhysicalTraits.skinTones
        )
    };
}


/* =========================================================
    4. Notable Feature Normalisation
   ========================================================= */

function normaliseFeatureName(featureName) {
    return cleanString(featureName);
}

function normaliseAllowedSpecies(allowedSpecies) {
    if (!allowedSpecies) {
        return "all";
    }

    if (typeof allowedSpecies === "string") {
        const cleanedSpecies = cleanString(allowedSpecies);

        if (!cleanedSpecies || normaliseKey(cleanedSpecies) === "all") {
            return "all";
        }

        return [cleanedSpecies];
    }

    if (!Array.isArray(allowedSpecies)) {
        return "all";
    }

    const cleanedSpecies = cleanStringList(allowedSpecies);

    return cleanedSpecies.length > 0
        ? cleanedSpecies
        : "all";
}

function normaliseNegativePrompt(negativePrompt) {
    if (typeof negativePrompt === "string") {
        return cleanString(negativePrompt)
            ? [cleanString(negativePrompt)]
            : [];
    }

    return cleanStringList(negativePrompt);
}

function normaliseNotableFeatureItem(feature) {
    if (typeof feature === "string") {
        const name = normaliseFeatureName(feature);

        if (!name) {
            return null;
        }

        return {
            name,
            allowedSpecies: "all",
            category: "",
            visibility: "",
            promptInstruction: "",
            visibilityInstruction: "",
            negativePrompt: []
        };
    }

    if (typeof feature === "object" && feature !== null) {
        const name = normaliseFeatureName(feature.name);

        if (!name) {
            return null;
        }

        return {
            name,
            allowedSpecies: normaliseAllowedSpecies(feature.allowedSpecies),
            category: cleanOptionalString(feature.category),
            visibility: cleanOptionalString(feature.visibility),
            promptInstruction: cleanOptionalString(feature.promptInstruction),
            visibilityInstruction: cleanOptionalString(feature.visibilityInstruction),
            negativePrompt: normaliseNegativePrompt(feature.negativePrompt)
        };
    }

    return null;
}

function getFallbackNotableFeatures() {
    const fallbackFeatures = cleanStringList(defaultPhysicalTraits.notableFeatures);

    if (fallbackFeatures.length > 0) {
        return fallbackFeatures.map(feature => {
            return {
                name: feature,
                allowedSpecies: "all",
                category: "",
                visibility: "",
                promptInstruction: "",
                visibilityInstruction: "",
                negativePrompt: []
            };
        });
    }

    return [
        {
            name: defaultText.noNotableFeature,
            allowedSpecies: "all",
            category: "",
            visibility: "",
            promptInstruction: "",
            visibilityInstruction: "",
            negativePrompt: []
        }
    ];
}

export function normaliseNotableFeatures(notableFeatureData) {
    const notableFeatures = Array.isArray(notableFeatureData)
        ? notableFeatureData
        : notableFeatureData?.notableFeatures;

    if (!hasItems(notableFeatures)) {
        return getFallbackNotableFeatures();
    }

    const seenFeatures = new Set();

    const cleanedFeatures = notableFeatures
        .map(normaliseNotableFeatureItem)
        .filter(Boolean)
        .filter(feature => {
            const key = normaliseKey(feature.name);

            if (seenFeatures.has(key)) {
                return false;
            }

            seenFeatures.add(key);
            return true;
        });

    if (hasItems(cleanedFeatures)) {
        return cleanedFeatures;
    }

    return getFallbackNotableFeatures();
}


/* =========================================================
    5. Species Data Merging
   ========================================================= */

function getSpeciesAppearanceForName(speciesAppearanceData, speciesName) {
    const appearanceBySpecies = speciesAppearanceData?.speciesAppearance || {};

    return appearanceBySpecies[speciesName] || {};
}

function getSpeciesProfileForName(speciesProfileData, speciesName) {
    const profileBySpecies = speciesProfileData?.speciesProfiles || {};

    return profileBySpecies[speciesName] || {};
}

export function mergeSpeciesData(
    speciesCoreData,
    speciesAppearanceData,
    speciesProfileData
) {
    const speciesCoreList = Array.isArray(speciesCoreData?.species)
        ? speciesCoreData.species
        : [];

    return speciesCoreList.map(speciesCore => {
        const speciesName = speciesCore.name;
        const appearance = getSpeciesAppearanceForName(speciesAppearanceData, speciesName);
        const profile = getSpeciesProfileForName(speciesProfileData, speciesName);

        return {
            name: speciesName,

            description:
                speciesCore.description ||
                defaultText.noSpeciesBackground,

            typicalTraits:
                Array.isArray(speciesCore.typicalTraits)
                    ? speciesCore.typicalTraits
                    : [],

            physicalTraits:
                normalisePhysicalTraits(appearance),

            profileInfluence:
                profile.profileInfluence ||
                {},

            playstyleBias:
                profile.playstyleBias ||
                defaultText.flexiblePlaystyle,

            weaknessBias:
                profile.weaknessBias ||
                defaultText.noSpeciesWeakness
        };
    });
}


/* =========================================================
    6. Individual Data Loaders
   ========================================================= */

export async function loadNameData() {
    try {
        const loadedNames = await fetchJsonFromPaths(dataPaths.names);

        if (!hasItems(loadedNames.firstNames) || !hasItems(loadedNames.lastNames)) {
            throw new Error("names.json must include firstNames and lastNames arrays.");
        }

        setNameData(loadedNames);
        return true;
    } catch (error) {
        console.error("Character names could not be loaded.", error);
        setDataLoadingError();
        return false;
    }
}

export async function loadClassData() {
    try {
        const loadedClassData = await fetchJson(dataPaths.classes);

        if (
            !loadedClassData.classes ||
            Object.keys(loadedClassData.classes).length === 0
        ) {
            throw new Error("classes.json must include a classes object.");
        }

        setClassData(loadedClassData.classes);
        return true;
    } catch (error) {
        console.error("Class data could not be loaded.", error);
        setDataLoadingError();
        return false;
    }
}

export async function loadQuestionData() {
    try {
        const loadedQuestionData = await fetchJson(dataPaths.questions);

        if (!hasItems(loadedQuestionData.questions)) {
            throw new Error("questions.json must include a questions array.");
        }

        setQuestionData(loadedQuestionData.questions);
        return true;
    } catch (error) {
        console.error("Question data could not be loaded.", error);
        setDataLoadingError();
        return false;
    }
}

export async function loadSpeciesData() {
    try {
        const [
            speciesCoreData,
            speciesAppearanceData,
            speciesProfileData
        ] = await Promise.all([
            fetchJson(dataPaths.speciesCore),
            fetchJson(dataPaths.speciesAppearance),
            fetchJson(dataPaths.speciesProfile)
        ]);

        if (!hasItems(speciesCoreData.species)) {
            throw new Error("species-core.json must include a species array.");
        }

        if (!speciesAppearanceData.speciesAppearance) {
            throw new Error("species-appearance.json must include a speciesAppearance object.");
        }

        if (!speciesProfileData.speciesProfiles) {
            throw new Error("species-profile.json must include a speciesProfiles object.");
        }

        const mergedSpeciesData = mergeSpeciesData(
            speciesCoreData,
            speciesAppearanceData,
            speciesProfileData
        );

        setSpeciesData(mergedSpeciesData);
        return true;
    } catch (error) {
        console.error("Species data could not be loaded.", error);
        setDataLoadingError();
        return false;
    }
}

export async function loadNotableFeatureData() {
    try {
        const loadedNotableFeatureData = await fetchJson(dataPaths.notableFeatures);
        const notableFeatures = normaliseNotableFeatures(loadedNotableFeatureData);

        setNotableFeatures(notableFeatures);
        return true;
    } catch (error) {
        console.warn(
            "Visual notable features could not be loaded. Falling back to default notable feature.",
            error
        );

        setNotableFeatures(getFallbackNotableFeatures());
        return true;
    }
}


/* =========================================================
    7. Combined Data Loader
   ========================================================= */

export async function loadAllData() {
    await Promise.all([
        loadNameData(),
        loadClassData(),
        loadQuestionData(),
        loadSpeciesData(),
        loadNotableFeatureData()
    ]);

    return isCoreDataLoaded();
}

export function isCoreDataLoaded() {
    return (
        state.loaded.names &&
        state.loaded.classes &&
        state.loaded.questions &&
        state.loaded.species &&
        !state.loaded.error
    );
}

export function isAllDataLoaded() {
    return (
        isCoreDataLoaded() &&
        state.loaded.notableFeatures
    );
}