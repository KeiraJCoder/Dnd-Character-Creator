/* =========================================================
    Dicebound
    Portrait Prompt Builder
    ---------------------------------------------------------
    This file builds portrait prompts from the completed
    character object.

    Responsibilities:
    - combine character-specific appearance details
    - apply species instructions from external species JSON data
    - add class, weapon, build, age and presentation details
    - add notable feature prompt instructions when available
    - build compact Cloudflare prompts within provider limits
    - build dynamic negative prompt terms for debugging and
        provider support

    This file should not duplicate full species anatomy rules.
    Species anatomy belongs in species-portrait-rules.json and
    is exposed through speciesPromptService.js.

    This file should not duplicate the full notable feature
    catalogue. Notable feature wording belongs in
    notable-features.json. This file supports both the newer
    feature object structure and older string-only feature data.
   ========================================================= */

const cloudflarePromptLimit = 2048;
const maxCloudflareAvoidTerms = 48;

const {
    findSpeciesPortraitRule,
    speciesAllowsPointedEars,
    getSpeciesVisualInstruction,
    getSpeciesNegativeTerms,
    getSpeciesKey
} = require("./speciesPromptService");


/* =========================================================
   1. External Data
   ========================================================= */

const speciesCoreData = loadOptionalJson([
    "../../data/species-core.json",
    "../data/species-core.json"
]);

const speciesAppearanceData = loadOptionalJson([
    "../../data/species-appearance.json",
    "../data/species-appearance.json"
]);

function loadOptionalJson(filePaths) {
    for (const filePath of filePaths) {
        try {
            return require(filePath);
        } catch {
            // Try the next likely path.
        }
    }

    return {};
}


/* =========================================================
   2. General Helpers
   ========================================================= */

function normaliseText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function normalisePromptWhitespace(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function normaliseAvoidTermKey(value) {
    return normaliseText(value)
        .replace(/^(no|avoid|do not)\s+/i, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function trimPromptToLimit(prompt, maxLength) {
    const text = normalisePromptWhitespace(prompt);

    if (text.length <= maxLength) {
        return text;
    }

    const safeText = text.slice(0, maxLength - 1);

    const lastSentenceEnd = Math.max(
        safeText.lastIndexOf("."),
        safeText.lastIndexOf("!"),
        safeText.lastIndexOf("?")
    );

    if (lastSentenceEnd > maxLength * 0.75) {
        return safeText.slice(0, lastSentenceEnd + 1).trim();
    }

    const lastComma = safeText.lastIndexOf(",");

    if (lastComma > maxLength * 0.75) {
        return `${safeText.slice(0, lastComma).trim()}.`;
    }

    const lastSpace = safeText.lastIndexOf(" ");

    if (lastSpace > maxLength * 0.75) {
        return `${safeText.slice(0, lastSpace).trim()}.`;
    }

    return `${safeText.trim()}.`;
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

function dedupeTerms(items) {
    const seen = new Set();
    const output = [];

    items.forEach(item => {
        const term = String(item || "")
            .replace(/\s+/g, " ")
            .trim();

        const key = normaliseAvoidTermKey(term);

        if (!term || !key || seen.has(key)) {
            return;
        }

        seen.add(key);
        output.push(term);
    });

    return output;
}

function joinPromptSections(sections) {
    return sections
        .filter(Boolean)
        .map(section => String(section).trim())
        .filter(Boolean)
        .join("\n\n")
        .trim();
}

function getCharacterSpeciesName(character) {
    if (typeof character?.species === "string") {
        return character.species;
    }

    return character?.species?.name || "Unknown Species";
}

function getExternalSpeciesCore(species) {
    const speciesList = Array.isArray(speciesCoreData.species)
        ? speciesCoreData.species
        : [];

    const speciesKey = getSpeciesKey(species);

    return speciesList.find(entry => {
        return getSpeciesKey(entry?.name) === speciesKey;
    }) || {};
}

function getExternalSpeciesAppearance(species) {
    const appearanceMap =
        speciesAppearanceData.speciesAppearance ||
        speciesAppearanceData ||
        {};

    const speciesKey = getSpeciesKey(species);

    const matchingEntry = Object.entries(appearanceMap).find(([name]) => {
        return getSpeciesKey(name) === speciesKey;
    });

    return matchingEntry?.[1] || {};
}

function getExternalSpeciesTraits(character, species) {
    const characterTraits = typeof character?.species === "object"
        ? toSentenceList(character.species.typicalTraits)
        : [];

    const externalSpecies = getExternalSpeciesCore(species);
    const externalTraits = toSentenceList(externalSpecies.typicalTraits);

    return dedupeList([
        ...characterTraits,
        ...externalTraits
    ]);
}

function getCharacterPromptInfo(character = {}) {
    const species = getCharacterSpeciesName(character);
    const notableFeatureDetails = getNotableFeatureDetails(character.notableFeature);

    return {
        name: character.name || "Unnamed character",
        species,
        speciesKey: getSpeciesKey(species),
        speciesTraits: getExternalSpeciesTraits(character, species),
        speciesAppearance: getExternalSpeciesAppearance(species),
        className: character.className || character.class?.name || "Adventurer",
        weaponName: character.weapon?.name || "weapon",
        gender: character.gender || "Unknown",
        portraitPresentation: character.portraitPresentation || character.gender || "Unknown",
        ageRange: character.ageRange || "Unknown",
        height: character.height || "Unknown",
        build: character.build || "Unknown",
        skinTone: character.skinTone || "Unknown",
        hairColour: character.hairColour || "Unknown",
        hairStyle: character.hairStyle || "Unknown",
        eyeColour: character.eyeColour || "Unknown",
        notableFeature: notableFeatureDetails.name,
        notableFeatureDetails,
        profile: character.generatedProfile || {}
    };
}


/* =========================================================
   3. Generic Visual Instructions
   ========================================================= */

function getGenderPresentationInstruction(genderOrPresentation) {
    const value = normaliseText(genderOrPresentation);

    if (value === "male" || value === "masculine") {
        return "Portrait presentation: masculine styling.";
    }

    if (value === "female" || value === "feminine") {
        return "Portrait presentation: feminine styling.";
    }

    if (isNeutralGender(value)) {
        return "Portrait presentation: androgynous styling. Use neutral facial styling, practical neutral clothing and balanced features. Do not make the character strongly feminine or strongly masculine unless selected.";
    }

    return "Portrait presentation: neutral unless clearly stated otherwise.";
}

function isNeutralGender(genderOrPresentation) {
    const value = normaliseText(genderOrPresentation);

    return (
        value === "non gendered" ||
        value === "non binary" ||
        value === "non-binary" ||
        value === "unknown" ||
        value === "prefer not to say" ||
        value === "androgynous" ||
        value === "no strong gendered features"
    );
}

function getClassVisualInstruction(className, weaponName) {
    const classValue = normaliseText(className);
    const weaponValue = weaponName || "weapon";

    const classInstructions = {
        barbarian: `Class: Barbarian. Rugged primal warrior styling. Show ${weaponValue} if possible.`,
        bard: `Class: Bard. Artistic expressive performer styling. Show ${weaponValue} if possible.`,
        cleric: `Class: Cleric. Divine, temple, priestly or holy styling. Show ${weaponValue} if possible.`,
        druid: `Class: Druid. Nature-themed clothing. Show ${weaponValue} if possible.`,
        fighter: `Class: Fighter. Practical armour or battle gear. Show ${weaponValue} if possible.`,
        monk: `Class: Monk. Simple martial attire. Show ${weaponValue} if possible.`,
        paladin: `Class: Paladin. Noble armoured holy styling. Show ${weaponValue} if possible.`,
        ranger: `Class: Ranger. Travel gear, outdoors clothing, scout styling. Show ${weaponValue} if possible.`,
        rogue: `Class: Rogue. Light armour, stealth clothing, subtle shadows. Show ${weaponValue} if possible.`,
        sorcerer: `Class: Sorcerer. Arcane innate magic styling. Show ${weaponValue} if possible.`,
        warlock: `Class: Warlock. Arcane eerie pact-magic styling. Show ${weaponValue} if possible.`,
        wizard: `Class: Wizard. Arcane robes, spellbook or subtle magic. Show ${weaponValue} if possible.`
    };

    return classInstructions[classValue] || `Class: ${className}. Fantasy adventurer styling. Show ${weaponValue} if possible.`;
}

function getAgeVisualInstruction(ageRange) {
    const value = normaliseText(ageRange);

    if (value === "young adult") {
        return "Age: young adult.";
    }

    if (value === "adult") {
        return "Age: mature adult.";
    }

    if (value === "middle-aged" || value === "middle aged") {
        return "Age: visibly middle-aged.";
    }

    if (value === "elder" || value === "elderly") {
        return "Age: elderly, older or aged.";
    }

    return "Age: do not strongly emphasise age.";
}

function getBuildVisualInstruction(build) {
    const value = normaliseText(build);

    if (value === "thin") {
        return "Body type: thin, narrow frame, slim arms, slim shoulders, slight build.";
    }

    if (value === "lean") {
        return "Body type: lean, athletic but slim, lightly built, not bulky.";
    }

    if (value === "average build") {
        return "Body type: average build, natural proportions.";
    }

    if (value === "broad") {
        return "Body type: broad, wide shoulders, wide torso, solid frame.";
    }

    if (value === "heavy-set") {
        return "Body type: heavy-set, large-bodied, soft round face, thick neck, broad torso, visible body weight.";
    }

    if (value === "fat") {
        return "Body type: fat, large-bodied, round face, soft jawline, thick neck, broad torso, visible body weight.";
    }

    if (value === "stocky") {
        return "Body type: stocky, compact, broad, solid, thick torso, shorter-looking proportions.";
    }

    if (value === "muscular") {
        return "Body type: muscular, visibly strong, defined arms and shoulders, athletic power.";
    }

    return "Body type: match the listed build exactly. Make the body shape visible.";
}


/* =========================================================
   4. Species And Appearance Instructions
   ========================================================= */

function isCharacterSpecificSpeciesLine(line) {
    const value = normaliseText(line);

    return (
        value.includes("selected ") ||
        value.includes("listed ") ||
        value.includes("eye colour") ||
        value.includes("hair colour") ||
        value.includes("hair style") ||
        value.includes("skin tone") ||
        value.includes("scale colour")
    );
}

function getSpeciesAnatomyInstruction(species) {
    const rule = findSpeciesPortraitRule(species);

    if (!rule) {
        return getSpeciesVisualInstruction(species);
    }

    const anatomyLines = dedupeList([
        ...toSentenceList(rule.priority),
        ...toSentenceList(rule.baseLook),
        ...toSentenceList(rule.mustShow)
    ]).filter(line => {
        return !isCharacterSpecificSpeciesLine(line);
    });

    if (anatomyLines.length === 0) {
        return getSpeciesVisualInstruction(species);
    }

    return [
        `Species accuracy: ${species}.`,
        "Species anatomy is the highest priority.",
        ...anatomyLines
    ].join(" ");
}

function getCompactSpeciesInstruction(species, maxSentences = 8) {
    const rule = findSpeciesPortraitRule(species);

    if (!rule) {
        return getSpeciesVisualInstruction(species);
    }

    return dedupeList([
        ...toSentenceList(rule.priority),
        ...toSentenceList(rule.baseLook),
        ...toSentenceList(rule.mustShow)
    ])
        .filter(line => {
            return !isCharacterSpecificSpeciesLine(line);
        })
        .slice(0, maxSentences)
        .join(" ");
}

function getSkinVisualInstruction(skinTone, species) {
    const rule = findSpeciesPortraitRule(species);
    const speciesInstruction = rule?.skinInstruction
        ? `${rule.skinInstruction} `
        : "";

    return [
        `${speciesInstruction}Selected skin or scale colour: ${skinTone || "Unknown"}.`,
        "Use this exact selected colour. Do not replace it with a different skin, scale or lighting colour."
    ].join(" ");
}

function getHairVisualInstruction(hairColour, hairStyle, species) {
    const rule = findSpeciesPortraitRule(species);
    const colourValue = normaliseText(hairColour);
    const styleValue = normaliseText(hairStyle);

    if (
        colourValue === "no hair" ||
        colourValue === "bald" ||
        colourValue === "hairless" ||
        styleValue === "no hair" ||
        styleValue === "bald" ||
        styleValue === "shaved head"
    ) {
        return "Hair or head detail: completely bald or hairless head. No fringe, no loose strands, no ponytail, no plaits, no braids and no visible hairstyle.";
    }

    const speciesInstruction = rule?.hairInstruction
        ? `${rule.hairInstruction} `
        : "";

    return [
        `${speciesInstruction}Selected hair or head-detail colour: ${hairColour || "Unknown"}.`,
        `Selected hair style or head style: ${hairStyle || "Unknown"}.`,
        "Keep the selected colour and selected style visible and accurate.",
        "Do not default to long loose hair unless the selected style is Long Loose Hair."
    ].join(" ");
}

function getEyeVisualInstruction(eyeColour) {
    return [
        `Eye colour: ${eyeColour || "Unknown"}.`,
        "The visible eyes or irises must clearly use this exact selected eye colour."
    ].join(" ");
}

function buildSelectedAppearanceBlock(info) {
    return `
SELECTED APPEARANCE:
- Gender identity: ${info.gender}.
- Gender presentation: ${info.portraitPresentation}. ${getGenderPresentationInstruction(info.portraitPresentation)}
- ${getAgeVisualInstruction(info.ageRange)}
- ${getBuildVisualInstruction(info.build)}
- ${getSkinVisualInstruction(info.skinTone, info.species)}
- ${getHairVisualInstruction(info.hairColour, info.hairStyle, info.species)}
- ${getEyeVisualInstruction(info.eyeColour)}
    `.trim();
}


/* =========================================================
   5. Notable Feature Instructions
   ========================================================= */

function getNotableFeatureDetails(notableFeature) {
    if (notableFeature && typeof notableFeature === "object") {
        return {
            name: notableFeature.name || "No Obvious Unusual Feature",
            category: notableFeature.category || "",
            visibility: notableFeature.visibility || "",
            promptInstruction: notableFeature.promptInstruction || "",
            visibilityInstruction: notableFeature.visibilityInstruction || "",
            negativePrompt: toSentenceList(notableFeature.negativePrompt)
        };
    }

    const name = String(notableFeature || "No Obvious Unusual Feature").trim();

    return {
        name,
        category: "",
        visibility: "",
        promptInstruction: "",
        visibilityInstruction: "",
        negativePrompt: []
    };
}

function isNoNotableFeature(notableFeatureName) {
    const value = normaliseText(notableFeatureName);

    return (
        !value ||
        value.includes("no obvious") ||
        value === "none" ||
        value === "no notable feature"
    );
}

function getFeaturePromptInstruction(notableFeature) {
    const feature = getNotableFeatureDetails(notableFeature);

    if (isNoNotableFeature(feature.name)) {
        return "No unusual facial mark, scar, tattoo, piercing, missing feature, glowing feature or added body detail.";
    }

    const structuredInstructions = dedupeList([
        feature.promptInstruction,
        feature.visibilityInstruction
    ]);

    if (structuredInstructions.length > 0) {
        return structuredInstructions.join(" ");
    }

    return [
        `Visible notable feature: ${feature.name}.`,
        "Show this feature clearly and naturally in the portrait.",
        "Do not hide it with angle, cropping, shadows, armour, hair, helmet, hood or pose.",
        "Do not turn scars into tattoos, face paint or dirt."
    ].join(" ");
}

function getNotableFeatureNegativeTerms(notableFeature) {
    const feature = getNotableFeatureDetails(notableFeature);

    if (isNoNotableFeature(feature.name)) {
        return [
            "scar",
            "tattoo",
            "face mark",
            "missing eye",
            "missing finger",
            "piercing",
            "glowing eyes",
            "broken horn"
        ];
    }

    return feature.negativePrompt;
}

function buildNotableFeatureBlock(info) {
    if (isNoNotableFeature(info.notableFeature)) {
        return `
NOTABLE FEATURE:
${info.notableFeature}. ${getFeaturePromptInstruction(info.notableFeatureDetails)}
        `.trim();
    }

    return `
MANDATORY VISIBLE FEATURE:
${info.notableFeature}. ${getFeaturePromptInstruction(info.notableFeatureDetails)}
    `.trim();
}


/* =========================================================
   6. Prompt Blocks
   ========================================================= */

function buildCharacterDetailsBlock(info) {
    return `
EXACT CHARACTER SHEET:
- Name: ${info.name}
- Species: ${info.species}
- Class: ${info.className}
- Weapon: ${info.weaponName}
- Gender Identity: ${info.gender}
- Portrait Presentation: ${info.portraitPresentation}
- Age Range: ${info.ageRange}
- Height: ${info.height}
- Build: ${info.build}
- Skin Colour / Scale Colour: ${info.skinTone}
- Hair Colour / Head Detail Colour: ${info.hairColour}
- Hair Style / Head Style: ${info.hairStyle}
- Eye Colour: ${info.eyeColour}
- Notable Feature: ${info.notableFeature}
    `.trim();
}

function buildPriorityBlock(info) {
    return `
STRICT PRIORITY:
1. Species anatomy is highest priority.
2. Species-specific features must match ${info.species}.
3. Exact character sheet details must be followed.
4. Selected skin or scale colour, eye colour, hair or head-detail colour, and hair or head style must remain accurate.
5. The notable feature must be visible unless it is "No Obvious Unusual Feature".
6. Class styling, pose, beauty styling, lighting and background are lower priority than species and character accuracy.
    `.trim();
}

function buildRoleplayFlavourBlock(info) {
    const traits = Array.isArray(info.profile.traits)
        ? info.profile.traits.join(", ")
        : "";

    const speciesTraits = Array.isArray(info.speciesTraits) && info.speciesTraits.length > 0
        ? info.speciesTraits.join(", ")
        : "";

    const parts = [];

    if (traits) {
        parts.push(`Core traits: ${traits}`);
    }

    if (speciesTraits) {
        parts.push(`Typical species traits from species data: ${speciesTraits}`);
    }

    if (info.profile.alignment) {
        parts.push(`Alignment: ${info.profile.alignment}`);
    }

    if (info.profile.weakness) {
        parts.push(`Weakness: ${info.profile.weakness}`);
    }

    if (parts.length === 0) {
        return "";
    }

    return `
SECONDARY ROLEPLAY FLAVOUR:
${parts.map(part => `- ${part}`).join("\n")}
Use this only for subtle expression, posture or mood. Do not let roleplay flavour override species anatomy or exact character sheet details.
    `.trim();
}

function buildCompositionBlock() {
    return `
COMPOSITION AND STYLE:
One single character only. Waist-up or chest-up portrait. Clear view of the face, head, species anatomy, shoulders and upper torso. Simple fantasy background. Detailed fantasy digital painting, polished RPG portrait art, cinematic lighting, accurate anatomy.
    `.trim();
}

function buildAvoidInstructions(character, maxTerms = null) {
    let avoidTerms = getAvoidTerms(character);

    if (Number.isInteger(maxTerms) && maxTerms > 0) {
        avoidTerms = avoidTerms.slice(0, maxTerms);
    }

    if (avoidTerms.length === 0) {
        return "";
    }

    return `AVOID:\n- ${avoidTerms.join("\n- ")}`;
}


/* =========================================================
   7. Avoid Terms
   ========================================================= */

function getAvoidTerms(character) {
    const info = getCharacterPromptInfo(character);

    const gender = normaliseText(info.portraitPresentation || info.gender);
    const build = normaliseText(info.build);
    const hairColour = normaliseText(info.hairColour);
    const hairStyle = normaliseText(info.hairStyle);
    const skinTone = normaliseText(info.skinTone);
    const eyeColour = normaliseText(info.eyeColour);

    const avoid = [
        "No text",
        "No letters",
        "No captions",
        "No labels",
        "No signature",
        "No artist signature",
        "No watermark",
        "No logo",
        "No character sheet layout",
        "No concept art sheet",
        "No multiple views",
        "No inset images",
        "No extra faces",
        "No extra characters",
        "No second portrait",
        "No collage",
        "No side panel",
        "No comic layout",
        ...getSpeciesNegativeTerms(info.species),
        ...getNotableFeatureNegativeTerms(info.notableFeatureDetails)
    ];

    if (!speciesAllowsPointedEars(info.species)) {
        avoid.push(
            "No pointed ears",
            "No elf ears",
            "No elven face"
        );
    }

    if (isNeutralGender(gender)) {
        avoid.push(
            "Avoid strongly masculine styling",
            "Avoid strongly feminine styling",
            "Avoid seductive styling",
            "Avoid heavy makeup",
            "Avoid pronounced breasts",
            "Avoid beard",
            "Avoid moustache"
        );
    }

    addBuildAvoidTerms(avoid, build);
    addHairAvoidTerms(avoid, hairColour, hairStyle);
    addSkinAvoidTerms(avoid, skinTone);
    addEyeAvoidTerms(avoid, eyeColour);

    return dedupeTerms(avoid);
}

function addBuildAvoidTerms(avoid, build) {
    const buildAvoidTerms = {
        thin: [
            "Do not make the character broad",
            "Do not make the character heavy-set",
            "Do not make the character muscular"
        ],
        lean: [
            "Do not make the character bulky",
            "Do not make the character heavy-set",
            "Do not make the character bodybuilder muscular"
        ],
        broad: [
            "Do not make the character slim",
            "Do not make the character narrow-shouldered",
            "Do not make the character delicate"
        ],
        "heavy-set": [
            "Do not make the character slim",
            "Do not make the character lean",
            "Do not make the character narrow-faced",
            "Do not make the character muscular instead of heavy-set",
            "Do not hide the body shape with oversized armour"
        ],
        fat: [
            "Do not make the character slim",
            "Do not make the character lean",
            "Do not make the character narrow-faced",
            "Do not make the character muscular instead of fat",
            "Do not hide the body shape with oversized armour"
        ],
        stocky: [
            "Do not make the character slim",
            "Do not make the character tall and narrow",
            "Do not make the character delicate"
        ],
        muscular: [
            "Do not make the character frail",
            "Do not make the character slender",
            "Do not make the character soft-bodied"
        ]
    };

    avoid.push(...(buildAvoidTerms[build] || []));
}

function addHairAvoidTerms(avoid, hairColour, hairStyle) {
    if (
        hairColour.includes("no hair") ||
        hairColour.includes("bald") ||
        hairColour.includes("hairless") ||
        hairStyle.includes("no hair") ||
        hairStyle.includes("bald") ||
        hairStyle.includes("shaved head")
    ) {
        avoid.push(
            "Do not add hair",
            "Do not add loose hair",
            "Do not add fringe",
            "Do not add bangs",
            "Do not add a ponytail",
            "Do not add plaits",
            "Do not add braids"
        );
    }

    if (hairStyle.includes("short")) {
        avoid.push(
            "Do not show long hair",
            "Do not show waist-length hair",
            "Do not show hair flowing over the shoulders"
        );
    }

    if (hairStyle.includes("pony")) {
        avoid.push(
            "Do not show loose hair hanging down",
            "Do not show unbound hair",
            "Do not show plaits instead of a ponytail"
        );
    }

    if (hairStyle.includes("plait") || hairStyle.includes("braid")) {
        avoid.push(
            "Do not show loose unbraided hair",
            "Do not show a plain ponytail instead of braids or plaits"
        );
    }

    if (hairStyle.includes("long loose")) {
        avoid.push(
            "Do not show ponytail",
            "Do not show braids",
            "Do not show plaits",
            "Do not show short hair"
        );
    }

    if (hairStyle.includes("shaved sides")) {
        avoid.push("Do not hide the shaved sides with loose hair");
    }

    if (hairColour.includes("silver")) {
        avoid.push("Do not change the selected hair or head-detail colour to black, brown, blonde or red");
    }

    if (hairColour.includes("red")) {
        avoid.push("Do not change the selected hair or head-detail colour to black, blonde, grey or silver");
    }

    if (hairColour.includes("black")) {
        avoid.push("Do not change the selected hair or head-detail colour to blonde, red, silver or white");
    }
}

function addSkinAvoidTerms(avoid, skinTone) {
    if (
        skinTone.includes("deep brown") ||
        skinTone.includes("warm brown") ||
        skinTone.includes("bronze") ||
        skinTone.includes("copper")
    ) {
        avoid.push("Do not make the skin or scales pale, fair, white or light");
    }

    if (skinTone.includes("scale") || skinTone.includes("scales")) {
        avoid.push(
            "Do not show smooth human skin where scales are selected",
            "Do not replace scales with clothing texture",
            "Do not turn scale colour into background lighting"
        );
    }
}

function addEyeAvoidTerms(avoid, eyeColour) {
    if (eyeColour.includes("green")) {
        avoid.push("Do not change the eyes to blue, brown or grey");
    }

    if (eyeColour.includes("blue")) {
        avoid.push("Do not change the eyes to brown, green, gold, amber, yellow or red");
    }

    if (eyeColour.includes("black")) {
        avoid.push("Do not change the eyes to green, blue, yellow, gold, amber, brown or grey");
    }

    if (eyeColour.includes("violet") || eyeColour.includes("purple")) {
        avoid.push("Do not change the eyes to blue, brown or green");
    }

    if (eyeColour.includes("gold") || eyeColour.includes("amber")) {
        avoid.push("Do not change the eyes to blue, brown or green");
    }

    if (eyeColour.includes("grey") || eyeColour.includes("gray")) {
        avoid.push("Do not change the eyes to blue, brown or green");
    }
}


/* =========================================================
   8. Main Prompt Builders
   ========================================================= */

function buildPortraitPrompt(character) {
    const info = getCharacterPromptInfo(character);

    return joinPromptSections([
        "STRICT DICEBOUND CHARACTER PORTRAIT. Follow the completed character sheet literally. Selected values are mandatory, not suggestions.",
        buildCharacterDetailsBlock(info),
        buildPriorityBlock(info),
        `SPECIES ANATOMY:\n${getSpeciesAnatomyInstruction(info.species)}`,
        buildSelectedAppearanceBlock(info),
        buildNotableFeatureBlock(info),
        `CLASS STYLE:\n${getClassVisualInstruction(info.className, info.weaponName)}`,
        buildRoleplayFlavourBlock(info),
        buildCompositionBlock(),
        buildAvoidInstructions(character)
    ]);
}

function buildCloudflarePrompt(character) {
    const info = getCharacterPromptInfo(character);
    const prompt = buildFullCloudflarePrompt(character, info);

    if (prompt.length <= cloudflarePromptLimit) {
        return prompt;
    }

    return buildCompactCloudflarePrompt(character, info);
}

function buildFullCloudflarePrompt(character, info) {
    const speciesRule = getCompactSpeciesInstruction(info.species);
    const appearanceBlock = buildCompactAppearanceBlock(info);
    const featureRule = getFeaturePromptInstruction(info.notableFeatureDetails);
    const classRule = getClassVisualInstruction(info.className, info.weaponName);
    const avoidTerms = getAvoidTerms(character)
        .slice(0, maxCloudflareAvoidTerms)
        .join(", ");

    return normalisePromptWhitespace(`
Create one single fantasy RPG waist-up portrait. One character only. Clear face, head, species anatomy, shoulders, chest and upper torso.

Species: ${info.species}. ${speciesRule}

Character: ${info.name}. Class: ${info.className}. Weapon: ${info.weaponName}. Age: ${info.ageRange}. Height: ${info.height}. Build: ${info.build}.

${appearanceBlock}

Mandatory feature: ${info.notableFeature}. ${featureRule}

Class style: ${classRule}

Priority: Species anatomy first. Exact selected appearance values must match. Do not hide species features, eyes, hair or head details, or notable feature.

Avoid: ${avoidTerms}.

Detailed fantasy digital painting, polished RPG portrait art, simple dark fantasy background.
    `);
}

function buildCompactCloudflarePrompt(character, info) {
    const speciesRule = getCompactSpeciesInstruction(info.species, 5);
    const avoidTerms = getAvoidTerms(character)
        .slice(0, 35)
        .join(", ");

    const prompt = normalisePromptWhitespace(`
One single waist-up fantasy RPG portrait, one character only, clear face, head, shoulders and upper torso.

Species: ${info.species}. ${speciesRule}

Name: ${info.name}. Class: ${info.className}. Weapon: ${info.weaponName}. Age: ${info.ageRange}. Height: ${info.height}. Build: ${info.build}.

${buildCompactAppearanceBlock(info)}

Mandatory feature: ${info.notableFeature}. ${getFeaturePromptInstruction(info.notableFeatureDetails)}

Species anatomy is highest priority. Exact selected appearance values must match. Do not hide species features, eyes, hair or head details, or notable feature.

Avoid: ${avoidTerms}.

Detailed fantasy digital painting, simple dark fantasy background.
    `);

    return trimPromptToLimit(prompt, cloudflarePromptLimit);
}

function buildCompactAppearanceBlock(info) {
    return [
        `Gender identity: ${info.gender}.`,
        `Gender presentation: ${info.portraitPresentation}.`,
        getGenderPresentationInstruction(info.portraitPresentation),
        `Selected skin or scale colour: ${info.skinTone}.`,
        `Selected hair or head-detail colour: ${info.hairColour}.`,
        `Selected hair style or head style: ${info.hairStyle}.`,
        `Selected eye colour: ${info.eyeColour}.`,
        getSkinVisualInstruction(info.skinTone, info.species),
        getHairVisualInstruction(info.hairColour, info.hairStyle, info.species),
        getEyeVisualInstruction(info.eyeColour)
    ].join(" ");
}

function buildDynamicNegativePrompt(character) {
    const strippedTerms = getAvoidTerms(character)
        .map(term => {
            return term
                .replace(/^No\s+/i, "")
                .replace(/^Avoid\s+/i, "")
                .replace(/^Do not\s+/i, "");
        })
        .map(term => term.trim())
        .filter(Boolean);

    return dedupeTerms(strippedTerms).join(", ");
}


/* =========================================================
    9. Exports
   ========================================================= */

module.exports = {
    buildPortraitPrompt,
    buildCloudflarePrompt,
    buildDynamicNegativePrompt,
    getGenderPresentationInstruction,
    isNeutralGender,
    getSpeciesVisualInstruction,
    getClassVisualInstruction,
    getAgeVisualInstruction,
    getBuildVisualInstruction,
    getFeaturePromptInstruction,
    getHairVisualInstruction,
    getSkinVisualInstruction,
    getEyeVisualInstruction,
    getSpeciesNegativeTerms,
    getNotableFeatureDetails,
    getNotableFeatureNegativeTerms
};