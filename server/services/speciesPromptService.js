/* =========================================================
    Dicebound
    Species Prompt Service
    ---------------------------------------------------------
    This file converts species portrait rules into prompt text
    for the backend portrait generation system.

    Responsibilities:
    - load species anatomy rules from species-portrait-rules.json
    - provide species visual instructions to promptBuilder.js
    - provide species-specific negative prompt terms
    - normalise species names and aliases
    - ignore unsupported legacy species if they appear in old data

    This file should not duplicate full species anatomy rules.
    Species anatomy belongs in species-portrait-rules.json.
    Character-specific details such as scale colour, eye colour,
    hair colour, head style, class, weapon and notable features
    belong in promptBuilder.js.

    Supported species are the official 2024 Player's Handbook
    core species used by Dicebound:
    Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling,
    Human, Orc and Tiefling.
   ========================================================= */

const speciesAliases = {
    aasimar: "aasimar",
    aasimarfolk: "aasimar",

    dragonborn: "dragonborn",

    dwarf: "dwarf",
    dwarves: "dwarf",
    dwarven: "dwarf",

    elf: "elf",
    elves: "elf",
    elven: "elf",

    gnome: "gnome",
    gnomes: "gnome",
    gnomish: "gnome",

    goliath: "goliath",
    goliaths: "goliath",

    halfling: "halfling",
    halflings: "halfling",

    human: "human",
    humans: "human",

    orc: "orc",
    orcs: "orc",
    orcish: "orc",

    tiefling: "tiefling",
    tieflings: "tiefling"
};

const supportedSpeciesKeys = new Set([
    "aasimar",
    "dragonborn",
    "dwarf",
    "elf",
    "gnome",
    "goliath",
    "halfling",
    "human",
    "orc",
    "tiefling"
]);

let speciesPortraitRules = loadSpeciesPortraitRules();

function loadSpeciesPortraitRules() {
    const possiblePaths = [
        "../../data/species-portrait-rules.json",
        "../data/species-portrait-rules.json"
    ];

    for (const filePath of possiblePaths) {
        try {
            const speciesPortraitRulesData = require(filePath);

            const rules =
                speciesPortraitRulesData.speciesPortraitRules ||
                speciesPortraitRulesData ||
                {};

            return filterSupportedSpeciesRules(rules);
        } catch {
            // Try the next likely path.
        }
    }

    console.warn(
        "species-portrait-rules.json could not be loaded. Falling back to generic species prompt handling."
    );

    return {};
}

function filterSupportedSpeciesRules(rules) {
    return Object.entries(rules).reduce((filteredRules, [speciesName, rule]) => {
        const speciesKey = getSpeciesKey(speciesName);

        if (!supportedSpeciesKeys.has(speciesKey)) {
            return filteredRules;
        }

        filteredRules[speciesName] = rule;

        return filteredRules;
    }, {});
}

function normaliseText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function normaliseKey(value) {
    return normaliseText(value).replace(/[^a-z0-9]/g, "");
}

function getSpeciesName(species) {
    if (typeof species === "string") {
        return species;
    }

    return species?.name || "Unknown Species";
}

function getSpeciesKey(species) {
    const key = normaliseKey(getSpeciesName(species));

    return speciesAliases[key] || key;
}

function toSentenceList(value) {
    if (Array.isArray(value)) {
        return value
            .filter(Boolean)
            .map(item => String(item).trim())
            .filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }

    return [];
}

function dedupeList(items) {
    return [
        ...new Set(
            items
                .filter(Boolean)
                .map(item => String(item).trim())
                .filter(Boolean)
        )
    ];
}

function findSpeciesPortraitRule(species) {
    const requestedSpeciesKey = getSpeciesKey(species);

    if (!supportedSpeciesKeys.has(requestedSpeciesKey)) {
        return null;
    }

    return Object.entries(speciesPortraitRules).find(([speciesName]) => {
        return getSpeciesKey(speciesName) === requestedSpeciesKey;
    })?.[1] || null;
}

function speciesAllowsPointedEars(species) {
    const speciesKey = getSpeciesKey(species);

    return (
        speciesKey === "elf" ||
        speciesKey === "gnome" ||
        speciesKey === "tiefling"
    );
}

function getSpeciesVisualInstruction(species) {
    const speciesName = getSpeciesName(species);
    const speciesKey = getSpeciesKey(species);
    const rule = findSpeciesPortraitRule(species);

    if (!supportedSpeciesKeys.has(speciesKey)) {
        return [
            `Species accuracy: ${speciesName}.`,
            "This species is not part of the current Dicebound 2024 core species list.",
            "Use a grounded fantasy adventurer appearance and avoid unsupported legacy species anatomy."
        ].join(" ");
    }

    if (!rule) {
        return [
            `Species accuracy: ${speciesName}.`,
            "The species anatomy is the highest priority.",
            "The character must visually match the selected species before class clothing, beauty styling, gender presentation or background."
        ].join(" ");
    }

    const ruleSentences = getSpeciesAnatomySentences(rule);

    return [
        `Species accuracy: ${speciesName}.`,
        "The species anatomy is the highest priority.",
        "Do not override species anatomy with class clothing, beauty styling, gender presentation or background.",
        ...ruleSentences
    ].join(" ");
}

function getSpeciesAnatomySentences(rule) {
    return dedupeList([
        ...toSentenceList(rule.priority),
        ...toSentenceList(rule.baseLook),
        ...toSentenceList(rule.anatomy),
        ...toSentenceList(rule.requiredFeatures),
        ...toSentenceList(rule.mustShow),
        ...toSentenceList(rule.allowedFeatures)
    ]);
}

function getSpeciesNegativeTerms(species) {
    const speciesKey = getSpeciesKey(species);
    const rule = findSpeciesPortraitRule(species);

    const jsonTerms = rule
        ? getRuleNegativeTerms(rule)
        : [];

    const fallbackTerms = getFallbackNegativeTerms(speciesKey);

    return dedupeList([
        ...jsonTerms,
        ...fallbackTerms
    ]);
}

function getRuleNegativeTerms(rule) {
    return [
        ...toSentenceList(rule.mustNotShow),
        ...toSentenceList(rule.negativePrompt),
        ...toSentenceList(rule.forbiddenFeatures),
        ...toSentenceList(rule.avoid)
    ];
}

function getFallbackNegativeTerms(speciesKey) {
    const terms = [];

    if (!speciesAllowsPointedEars(speciesKey)) {
        terms.push(
            "elf ears",
            "pointed ears",
            "elven face"
        );
    }

    if (!supportedSpeciesKeys.has(speciesKey)) {
        terms.push(
            "half-elf",
            "half-orc",
            "goblin",
            "legacy species",
            "unsupported species anatomy"
        );
    }

    return terms;
}

function reloadSpeciesPortraitRulesForTesting() {
    speciesPortraitRules = loadSpeciesPortraitRules();

    return speciesPortraitRules;
}

module.exports = {
    findSpeciesPortraitRule,
    speciesAllowsPointedEars,
    getSpeciesVisualInstruction,
    getSpeciesNegativeTerms,
    getSpeciesKey,
    reloadSpeciesPortraitRulesForTesting
};