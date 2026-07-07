/* =========================================================
   Dicebound
   Portrait Prompt Builder
   ---------------------------------------------------------
   This file builds portrait prompts from the completed
   character object.

   Responsibilities:
   - combine character-specific appearance details
   - apply species instructions from speciesPromptService.js
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

function getCharacterSpeciesName(character) {
    if (typeof character?.species === "string") {
        return character.species;
    }

    return character?.species?.name || "Unknown Species";
}

function getCharacterPromptInfo(character = {}) {
    const species = getCharacterSpeciesName(character);
    const notableFeatureDetails = getNotableFeatureDetails(character.notableFeature);

    return {
        name: character.name || "Unnamed character",
        species,
        speciesKey: getSpeciesKey(species),
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

function getGenderPresentationInstruction(genderOrPresentation) {
    const value = normaliseText(genderOrPresentation);

    if (value === "male" || value === "masculine") {
        return "Portrait presentation: masculine styling.";
    }

    if (value === "female" || value === "feminine") {
        return "Portrait presentation: feminine styling.";
    }

    if (isNeutralGender(value)) {
        return "Portrait presentation: neutral androgynous styling. Use practical neutral clothing and neutral facial styling. Do not use a strongly feminine face, seductive styling, pronounced breasts, heavy makeup, beard, moustache or strongly masculine styling.";
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
        return "Body type: thin, narrow frame, slim arms, slim shoulders, slight build. Do not make them muscular, broad or heavy-set.";
    }

    if (value === "lean") {
        return "Body type: lean, athletic but slim, lightly built, not bulky, not heavily muscular.";
    }

    if (value === "average build") {
        return "Body type: average build, natural proportions, neither thin nor muscular nor large-bodied.";
    }

    if (value === "broad") {
        return "Body type: broad and stocky, wide shoulders, wide torso, solid frame, thick neck, not slim, not narrow, not only bodybuilder muscular.";
    }

    if (value === "heavy-set") {
        return "Body type: fat, heavy-set, large-bodied, soft round face, thick neck, broad torso, visible body weight, not slim, not lean, not muscular.";
    }

    if (value === "fat") {
        return "Body type: fat, large-bodied, round face, soft jawline, thick neck, broad torso, visible body weight, not slim, not lean, not muscular.";
    }

    if (value === "stocky") {
        return "Body type: stocky, compact, broad, solid, thick torso, shorter-looking proportions, not slim or narrow.";
    }

    if (value === "muscular") {
        return "Body type: muscular, visibly strong, defined arms and shoulders, athletic power, not thin, not soft-bodied.";
    }

    return "Body type: match the listed build exactly. Make the body shape visible.";
}

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

function getFeaturePromptInstruction(notableFeature, species) {
    const feature = getNotableFeatureDetails(notableFeature);
    const speciesKey = getSpeciesKey(species);

    if (isNoNotableFeature(feature.name)) {
        return "No unusual facial mark, scar, tattoo, piercing, missing feature, glowing feature or added body detail.";
    }

    const structuredInstructions = dedupeList([
        feature.promptInstruction,
        feature.visibilityInstruction
    ]);

    if (structuredInstructions.length > 0) {
        if (speciesKey === "dragonborn" && normaliseText(feature.name).includes("hair")) {
            return [
                ...structuredInstructions,
                "Because the species is Dragonborn, do not add human hair. Only show this feature if it can be represented without mammalian hair."
            ].join(" ");
        }

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

function getHairVisualInstruction(hairColour, hairStyle, species) {
    const rule = findSpeciesPortraitRule(species);
    const speciesKey = getSpeciesKey(species);
    const colourValue = normaliseText(hairColour);
    const styleValue = normaliseText(hairStyle);

    if (speciesKey === "dragonborn") {
        return [
            "Dragonborn head detail:",
            `Listed head, horn, spine or crest colour: ${hairColour || "Unknown"}. This is not human hair colour.`,
            `Listed head style: ${hairStyle || "Unknown"}.`,
            "Show the listed head style as Dragonborn anatomy: horns, crown of horns, crest ridges, head frill, bone crest, scaled crest, spines or smooth scaled skull.",
            "If the listed style is Smooth Scaled Head, show a smooth scaled skull with no human hair, no crest, no frill, no spines and no crown of horns.",
            "If the listed style is Crown Of Horns, show a crown-like arrangement of horns growing from the Dragonborn head.",
            "If the listed style is Long Head Spines, show several long visible spines growing from the top or back of the head.",
            "Dragonborn must not have mammalian hair or human hair.",
            "Do not show loose hair, white human hair, long hair, short human hair, ponytail, plaits, braids, fringe, bangs, beard or moustache.",
            "Do not interpret the head style as a helmet, hood, mask, headpiece, separate dragon head or pet dragon."
        ].join(" ");
    }

    if (
        colourValue === "no hair" ||
        colourValue === "bald" ||
        colourValue === "hairless" ||
        styleValue === "no hair" ||
        styleValue === "bald" ||
        styleValue === "shaved head"
    ) {
        return "Hair: completely bald or hairless head. No fringe, no loose strands, no ponytail, no plaits, no braids and no visible hairstyle.";
    }

    if (rule?.hairInstruction) {
        return [
            rule.hairInstruction,
            `Listed hair colour: ${hairColour || "Unknown"}.`,
            `Listed hair style: ${hairStyle || "Unknown"}.`,
            "The selected hair colour and hair style must remain visible and accurate.",
            "Do not default to long loose hair unless the listed style is Long Loose Hair."
        ].join(" ");
    }

    return [
        `Hair colour: ${hairColour || "Unknown"}.`,
        `Hair style: ${hairStyle || "Unknown"}.`,
        "The selected hair colour and hair style must remain visible and accurate.",
        "Do not default to long loose hair unless the listed style is Long Loose Hair."
    ].join(" ");
}

function getSkinVisualInstruction(skinTone, species) {
    const rule = findSpeciesPortraitRule(species);
    const speciesKey = getSpeciesKey(species);

    if (speciesKey === "dragonborn") {
        return [
            `Scale colour: ${skinTone || "Unknown"}.`,
            "Show this as visible Dragonborn scale colour across the face, snout, neck, shoulders, chest and upper torso.",
            "Do not turn the scale colour into clothing colour, background colour, lighting or smooth human skin.",
            "The Dragonborn should have visible scale texture, not bare human shoulders."
        ].join(" ");
    }

    if (rule?.skinInstruction) {
        return `${rule.skinInstruction} Listed skin colour or tone: ${skinTone || "Unknown"}. Do not replace this colour with a different skin tone.`;
    }

    return `Skin colour or tone: ${skinTone || "Unknown"}. This must be visible and accurate.`;
}

function getEyeVisualInstruction(eyeColour, species) {
    const speciesKey = getSpeciesKey(species);

    if (speciesKey === "dragonborn") {
        return [
            `Eye colour: ${eyeColour || "Unknown"}.`,
            "The visible Dragonborn eyes or irises must clearly use this exact eye colour.",
            "Do not replace the selected eye colour with red, orange, yellow, gold, amber, green, blue or black unless that is the listed colour."
        ].join(" ");
    }

    return [
        `Eye colour: ${eyeColour || "Unknown"}.`,
        "The visible eyes or irises must clearly use this exact eye colour."
    ].join(" ");
}

function buildAppearancePriorityBlock(character) {
    const info = getCharacterPromptInfo(character);

    return `
NON-NEGOTIABLE APPEARANCE DETAILS:
- Species: ${info.species}
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

Highest priority order:
1. Species anatomy must be correct first.
2. Species-specific features such as ears, horns, scales, snout, tusks, fangs, face shape and skin texture must match the species.
3. Character sheet appearance details must be followed exactly.
4. Skin, scale, eye, hair and head-detail colours must stay accurate.
5. Class clothing, beauty styling, pose and background are lower priority than species accuracy.
    `.trim();
}

function getCompactSpeciesInstruction(species, maxSentences = 10) {
    const rule = findSpeciesPortraitRule(species);

    if (!rule) {
        return getSpeciesVisualInstruction(species);
    }

    return dedupeList([
        ...toSentenceList(rule.priority),
        ...toSentenceList(rule.baseLook),
        ...toSentenceList(rule.mustShow),
        ...toSentenceList(rule.skinInstruction),
        ...toSentenceList(rule.hairInstruction)
    ])
        .slice(0, maxSentences)
        .join(" ");
}

function buildAvoidInstructions(character, maxTerms = null) {
    let avoidTerms = getAvoidTerms(character);

    if (Number.isInteger(maxTerms) && maxTerms > 0) {
        avoidTerms = avoidTerms.slice(0, maxTerms);
    }

    return `AVOID THE FOLLOWING:\n- ${avoidTerms.join("\n- ")}`;
}

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
            "Avoid moustache",
            "Use practical neutral clothing"
        );
    }

    if (build === "thin") {
        avoid.push(
            "Do not make the character broad",
            "Do not make the character heavy-set",
            "Do not make the character muscular"
        );
    }

    if (build === "lean") {
        avoid.push(
            "Do not make the character bulky",
            "Do not make the character heavy-set",
            "Do not make the character bodybuilder muscular"
        );
    }

    if (build === "broad") {
        avoid.push(
            "Do not make the character slim",
            "Do not make the character narrow-shouldered",
            "Do not make the character delicate"
        );
    }

    if (build === "heavy-set" || build === "fat") {
        avoid.push(
            "Do not make the character slim",
            "Do not make the character lean",
            "Do not make the character narrow-faced",
            "Do not make the character muscular instead of fat",
            "Do not hide the body shape with oversized armour"
        );
    }

    if (build === "stocky") {
        avoid.push(
            "Do not make the character slim",
            "Do not make the character tall and narrow",
            "Do not make the character delicate"
        );
    }

    if (build === "muscular") {
        avoid.push(
            "Do not make the character frail",
            "Do not make the character slender",
            "Do not make the character soft-bodied"
        );
    }

    if (
        info.speciesKey === "dragonborn" ||
        hairColour.includes("no hair") ||
        hairColour.includes("bald") ||
        hairColour.includes("hairless") ||
        hairStyle.includes("no hair") ||
        hairStyle.includes("bald") ||
        hairStyle.includes("shaved head") ||
        hairStyle.includes("smooth scaled head")
    ) {
        avoid.push(
            "Do not add human hair",
            "Do not add mammalian hair",
            "Do not add long hair",
            "Do not add short human hair",
            "Do not add fringe",
            "Do not add bangs",
            "Do not add a ponytail",
            "Do not add plaits",
            "Do not add braids",
            "Do not add loose hair"
        );
    }

    if (hairStyle.includes("short") && info.speciesKey !== "dragonborn") {
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

    if (hairColour.includes("silver") && info.speciesKey !== "dragonborn") {
        avoid.push("Do not change the hair to black, brown, blonde or red");
    }

    if (hairColour.includes("red") && info.speciesKey !== "dragonborn") {
        avoid.push("Do not change the hair to black, blonde, grey or silver");
    }

    if (hairColour.includes("black") && info.speciesKey !== "dragonborn") {
        avoid.push("Do not change the hair to blonde, red, silver or white");
    }

    if (
        skinTone.includes("deep brown") ||
        skinTone.includes("warm brown") ||
        skinTone.includes("bronze") ||
        skinTone.includes("copper")
    ) {
        avoid.push("Do not make the skin pale, fair, white or light");
    }

    if (skinTone.includes("scales") || info.speciesKey === "dragonborn") {
        avoid.push(
            "Do not show smooth human skin",
            "Do not show bare human shoulders",
            "Do not replace scales with clothing texture",
            "Do not turn scale colour into background lighting"
        );
    }

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

    return dedupeList(avoid);
}

function buildPortraitPrompt(character) {
    const info = getCharacterPromptInfo(character);
    const coreTraits = Array.isArray(info.profile.traits)
        ? info.profile.traits.join(", ")
        : "Unknown";

    return `
Create a highly accurate fantasy character portrait for a DnD-inspired character generator.
This portrait must closely follow the character sheet.

${buildAppearancePriorityBlock(character)}

SPECIES ANATOMY REQUIREMENT:
${getSpeciesVisualInstruction(info.species)}

VISUAL REQUIREMENTS:
- ${getGenderPresentationInstruction(info.portraitPresentation)}
- ${getAgeVisualInstruction(info.ageRange)}
- ${getBuildVisualInstruction(info.build)}
- ${getSkinVisualInstruction(info.skinTone, info.species)}
- ${getHairVisualInstruction(info.hairColour, info.hairStyle, info.species)}
- ${getEyeVisualInstruction(info.eyeColour, info.species)}
- ${getFeaturePromptInstruction(info.notableFeatureDetails, info.species)}
- ${getClassVisualInstruction(info.className, info.weaponName)}

SECONDARY ROLEPLAY FLAVOUR:
- Core traits: ${coreTraits}
- Alignment: ${info.profile.alignment || "Unknown"}
- Religious outlook: ${info.profile.faithProfile || "Unknown"}
- Weakness: ${info.profile.weakness || "Unknown"}

COMPOSITION:
One single character only. Waist-up or chest-up portrait. Clear view of the face, head, species anatomy, shoulders and upper torso. Simple fantasy background. No extra characters.

${buildAvoidInstructions(character)}

STYLE:
Detailed fantasy digital painting, polished RPG portrait art, cinematic lighting, accurate anatomy, no text, no signature, no watermark.
    `.trim();
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
    const speciesRule = getCompactSpeciesInstruction(
        info.species,
        info.speciesKey === "dragonborn" ? 12 : 8
    );

    const appearanceBlock = getCloudflareAppearanceBlock(info);
    const featureRule = getFeaturePromptInstruction(info.notableFeatureDetails, info.species);
    const classRule = getClassVisualInstruction(info.className, info.weaponName);
    const genderRule = getGenderPresentationInstruction(info.portraitPresentation);
    const ageRule = getAgeVisualInstruction(info.ageRange);
    const buildRule = getBuildVisualInstruction(info.build);
    const avoidTerms = getAvoidTerms(character)
        .slice(0, maxCloudflareAvoidTerms)
        .join(", ");

    return normalisePromptWhitespace(`
Create one single fantasy RPG waist-up portrait. One character only. Clear face, head, species anatomy, shoulders, chest and upper torso. No text, no signature, no watermark, no logo, no extra faces, no second character, no character sheet layout.

SPECIES FIRST:
Species: ${info.species}. ${speciesRule}

EXACT CHARACTER DETAILS:
Name: ${info.name}. Gender identity: ${info.gender}. Portrait presentation: ${info.portraitPresentation}. ${genderRule}
Age: ${info.ageRange}. ${ageRule}
Height: ${info.height}. Build: ${info.build}. ${buildRule}
${appearanceBlock}
Class: ${info.className}. Weapon: ${info.weaponName}. ${classRule}

NOTABLE FEATURE:
${info.notableFeature}. ${featureRule}

STRICT PRIORITY:
Species anatomy wins over beauty styling, class clothing, gender presentation, pose and background. Skin or scale colour, eye colour, hair colour, hair style or Dragonborn head detail must match the character sheet exactly. Do not hide species features, eyes, ears, horns, head detail, hair style or notable feature with helmets, hoods, masks, shadows, hair, armour or cropping.

AVOID:
${avoidTerms}

STYLE:
Detailed fantasy digital painting, polished RPG portrait art, simple dark fantasy background.
    `);
}

function buildCompactCloudflarePrompt(character, info) {
    const speciesRule = getCompactSpeciesInstruction(
        info.species,
        info.speciesKey === "dragonborn" ? 8 : 5
    );

    const avoidTerms = getAvoidTerms(character)
        .slice(0, 35)
        .join(", ");

    const prompt = normalisePromptWhitespace(`
One single waist-up fantasy RPG portrait, one character only, clear face, head, shoulders and upper torso. No text, no watermark, no extra people.

Species: ${info.species}. ${speciesRule}
${getCloudflareAppearanceBlock(info)}

Name: ${info.name}. Class: ${info.className}. Weapon: ${info.weaponName}.
Gender identity: ${info.gender}. Presentation: ${info.portraitPresentation}. Age: ${info.ageRange}. Height: ${info.height}. Build: ${info.build}.
Notable feature: ${info.notableFeature}. ${getFeaturePromptInstruction(info.notableFeatureDetails, info.species)}

Species anatomy is highest priority. Exact skin or scale colour, eye colour, hair colour, hair style or Dragonborn head detail must match. Do not hide ears, horns, snout, scales, tusks, hair style, eyes or notable feature.

Avoid: ${avoidTerms}.
Detailed fantasy digital painting, simple dark fantasy background.
    `);

    return prompt.slice(0, cloudflarePromptLimit);
}

function getCloudflareAppearanceBlock(info) {
    if (info.speciesKey === "dragonborn") {
        return [
            `Dragonborn scale colour: ${info.skinTone}. Use this colour on visible scales across face, snout, neck, shoulders, chest and upper torso. Do not make smooth human skin.`,
            `Dragonborn eye colour: ${info.eyeColour}. Visible reptilian eyes must clearly be this colour.`,
            `Dragonborn head-detail colour: ${info.hairColour}. This is horn, crest, spine or frill colour, not hair.`,
            `Dragonborn head style: ${info.hairStyle}. Show this exact Dragonborn head anatomy. No human hair, no mammalian hair, no ponytail, no braids, no fringe, no beard, no moustache.`,
            "The character must be a Dragonborn, not a human, elf or tiefling wearing dragon-themed clothing."
        ].join(" ");
    }

    return [
        getSkinVisualInstruction(info.skinTone, info.species),
        getHairVisualInstruction(info.hairColour, info.hairStyle, info.species),
        getEyeVisualInstruction(info.eyeColour, info.species)
    ].join(" ");
}

function buildDynamicNegativePrompt(character) {
    return getAvoidTerms(character)
        .map(term => {
            return term
                .replace(/^No\s+/i, "")
                .replace(/^Avoid\s+/i, "")
                .replace(/^Do not\s+/i, "");
        })
        .map(term => term.trim())
        .filter(Boolean)
        .join(", ");
}

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