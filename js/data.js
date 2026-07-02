/* =========================================================
    Dicebound
    Data Loading
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
    let lastError = null;

    for (const filePath of filePaths) {
        try {
            return await fetchJson(filePath);
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}


/* =========================================================
    2. Data Validation Helpers
     ========================================================= */

export function getValidPool(pool, fallbackPool) {
    return hasItems(pool) ? pool : fallbackPool;
}

function getFallbackHairStyles() {
    return getValidPool(
        defaultPhysicalTraits.hairStyles,
        [
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
            "No Hair",
            "Smooth Scaled Head",
            "Horned Crest",
            "Bone Crest",
            "Scaled Crest",
            "Spined Crest",
            "Short Head Spines",
            "Long Head Spines",
            "Crown Of Horns",
            "Swept-Back Horns",
            "Head Frill"
        ]
    );
}

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
            getFallbackHairStyles()
        ),

        skinTones: getValidPool(
            physicalTraits.skinTones,
            defaultPhysicalTraits.skinTones
        )
    };
}

function cleanStringList(items) {
    if (!hasItems(items)) {
        return [];
    }

    return [...new Set(
        items
            .map(item => String(item || "").trim())
            .filter(item => item.length > 0)
    )];
}

function normaliseFeatureName(featureName) {
    return String(featureName || "").trim();
}

function normaliseAllowedSpecies(allowedSpecies) {
    if (!allowedSpecies || allowedSpecies === "all") {
        return "all";
    }

    if (!Array.isArray(allowedSpecies)) {
        return "all";
    }

    const cleanedSpecies = cleanStringList(allowedSpecies);

    return cleanedSpecies.length > 0
        ? cleanedSpecies
        : "all";
}

function normaliseNotableFeatureItem(feature) {
    if (typeof feature === "string") {
        const name = normaliseFeatureName(feature);

        if (!name) {
            return null;
        }

        return {
            name,
            allowedSpecies: "all"
        };
    }

    if (typeof feature === "object" && feature !== null) {
        const name = normaliseFeatureName(feature.name);

        if (!name) {
            return null;
        }

        return {
            name,
            allowedSpecies: normaliseAllowedSpecies(feature.allowedSpecies)
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
                allowedSpecies: "all"
            };
        });
    }

    return [
        {
            name: defaultText.noNotableFeature,
            allowedSpecies: "all"
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
            const key = feature.name.toLowerCase();

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
    3. Species Data Merging
     ========================================================= */

export function mergeSpeciesData(
    speciesCoreData,
    speciesAppearanceData,
    speciesProfileData
) {
    const speciesCoreList = speciesCoreData.species;
    const appearanceBySpecies = speciesAppearanceData.speciesAppearance;
    const profileBySpecies = speciesProfileData.speciesProfiles;

    return speciesCoreList.map(speciesCore => {
        const appearance = appearanceBySpecies[speciesCore.name] || {};
        const profile = profileBySpecies[speciesCore.name] || {};

        return {
            name: speciesCore.name,

            description:
                speciesCore.description ||
                defaultText.noSpeciesBackground,

            typicalTraits:
                speciesCore.typicalTraits ||
                [],

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
    4. Individual Data Loaders
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
    5. Combined Data Loader
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