const cloudflarePromptLimit = 2048;

let speciesPortraitRules = {};

try {
    const speciesPortraitRulesData = require("../../data/species-portrait-rules.json");
    speciesPortraitRules =
        speciesPortraitRulesData.speciesPortraitRules ||
        speciesPortraitRulesData ||
        {};
} catch (error) {
    console.warn("species-portrait-rules.json could not be loaded. Falling back to built-in species prompts.");
}

function normaliseText(value) {
    return String(value || "").trim().toLowerCase();
}

function normaliseKey(value) {
    return normaliseText(value).replace(/[^a-z0-9]/g, "");
}

function toSentenceList(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }

    return [];
}

function findSpeciesPortraitRule(species) {
    const requestedKey = normaliseKey(species);

    return Object.entries(speciesPortraitRules).find(([speciesName]) => {
        return normaliseKey(speciesName) === requestedKey;
    })?.[1] || null;
}

function speciesAllowsPointedEars(species) {
    const value = normaliseText(species);

    return (
        value === "elf" ||
        value === "half-elf" ||
        value === "gnome" ||
        value === "goblin" ||
        value === "tiefling"
    );
}

function getGenderPresentationInstruction(genderOrPresentation) {
    const value = normaliseText(genderOrPresentation);

    if (value === "male" || value === "masculine") {
        return "Portrait presentation: masculine styling.";
    }

    if (value === "female" || value === "feminine") {
        return "Portrait presentation: feminine styling.";
    }

    if (
        value === "non gendered" ||
        value === "non binary" ||
        value === "unknown" ||
        value === "prefer not to say" ||
        value === "androgynous" ||
        value === "no strong gendered features"
    ) {
        return "Portrait presentation: neutral androgynous styling. Use practical neutral clothing and neutral facial styling. Do not use a strongly feminine face, seductive styling, pronounced breasts, heavy makeup, beard, moustache or strongly masculine styling.";
    }

    return "Portrait presentation: neutral unless clearly stated otherwise.";
}

function isNeutralGender(genderOrPresentation) {
    const value = normaliseText(genderOrPresentation);

    return (
        value === "non gendered" ||
        value === "non binary" ||
        value === "unknown" ||
        value === "prefer not to say" ||
        value === "androgynous" ||
        value === "no strong gendered features"
    );
}

function getSpeciesVisualInstruction(species) {
    const value = normaliseText(species);

    if (value === "dragonborn") {
        return [
            "Species accuracy: dragonborn.",
            "The character themselves must be a Dragonborn, not a human, elf or tiefling wearing dragon-themed clothing.",
            "Show a wingless bipedal dragon person with a fully reptilian draconic head.",
            "The face must have a clear dragon snout or muzzle, scaled brow ridges, visible scales, reptilian facial structure and predator teeth.",
            "Show scales across the face, neck, shoulders and upper torso.",
            "Do not show a human face, human nose, human ears, elf ears, smooth human skin, human hair, white human hair, long hair, fringe, ponytail, plaits or braids.",
            "Do not show a dragon helmet, dragon hood, dragon mask, dragon headpiece, separate dragon head behind the character, pet dragon, dragon companion or second creature.",
            "The character is the Dragonborn."
        ].join(" ");
    }

    const rule = findSpeciesPortraitRule(species);

    if (rule) {
        const priority = toSentenceList(rule.priority);
        const baseLook = toSentenceList(rule.baseLook);
        const anatomy = toSentenceList(rule.anatomy);
        const requiredFeatures = toSentenceList(rule.requiredFeatures);
        const allowedFeatures = toSentenceList(rule.allowedFeatures);
        const mustShow = toSentenceList(rule.mustShow);

        const combinedRules = [
            ...priority,
            ...baseLook,
            ...anatomy,
            ...requiredFeatures,
            ...mustShow,
            ...allowedFeatures
        ];

        if (combinedRules.length > 0) {
            return [
                `Species accuracy: ${species}.`,
                "The species anatomy is the highest priority.",
                ...combinedRules
            ].join(" ");
        }
    }

    if (value === "elf") {
        return "Species accuracy: elf, clearly pointed elf ears, elegant elven features, graceful humanoid face, not human, not goblin, not tiefling.";
    }

    if (value === "half-elf") {
        return "Species accuracy: half-elf, mostly human-like with subtle elven grace and subtly pointed ears, not fully elven.";
    }

    if (value === "aasimar") {
        return "Species accuracy: aasimar, mostly human with subtle celestial or radiant features, no elf ears, no tiefling horns.";
    }

    if (value === "dwarf") {
        return "Species accuracy: dwarf, short, sturdy, broad and compact, strong dwarven face, not tall or elven, no elf ears.";
    }

    if (value === "halfling") {
        return "Species accuracy: halfling, small adult humanoid, warm grounded features, rounded or softly shaped ears, no long elf ears.";
    }

    if (value === "gnome") {
        return "Species accuracy: gnome, small petite humanoid, lively features, large expressive eyes, pointed gnome ears, not a tall elf, not a human child.";
    }

    if (value === "tiefling") {
        return "Species accuracy: tiefling, visible horns, infernal features, pointed tiefling ears, unusual eyes, not an elf, not a dragonborn.";
    }

    if (value === "half-orc") {
        return "Species accuracy: half-orc, strong jaw, heavy brow, powerful build, clear orcish ancestry, small tusks or lower canines, no elf ears.";
    }

    if (value === "orc") {
        return "Species accuracy: orc, powerful orc humanoid, heavy brow, broad nose, strong jaw, visible tusks, rugged features, no elf ears.";
    }

    if (value === "goblin") {
        return "Species accuracy: goblin, small goblinoid body, flat pushed-in face, broad nose, sloped-back forehead, wide mouth, small sharp fangs, large long pointed goblin ears, beady eyes, non-human goblin skin, not an elf, not human.";
    }

    if (value === "goliath") {
        return "Species accuracy: goliath, very tall, powerful giant-blooded humanoid, massive frame, strong bone structure, not slender or elven.";
    }

    if (value === "human") {
        return "Species accuracy: human, normal rounded human ears, human face and body, no elf ears, no horns, no tusks, no scales, no snout, no fantasy creature anatomy.";
    }

    return `Species accuracy: ${species}, must visually match that species first before class clothing, beauty styling or background.`;
}

function getSpeciesNegativeTerms(species) {
    const rule = findSpeciesPortraitRule(species);

    const jsonTerms = rule
        ? [
            ...toSentenceList(rule.mustNotShow),
            ...toSentenceList(rule.negativePrompt),
            ...toSentenceList(rule.forbiddenFeatures),
            ...toSentenceList(rule.avoid)
        ]
        : [];

    const value = normaliseText(species);
    const fallbackTerms = [];

    if (!speciesAllowsPointedEars(species)) {
        fallbackTerms.push("elf ears", "pointed ears", "elven face");
    }

    if (value === "dragonborn") {
        fallbackTerms.push(
            "human face",
            "human woman",
            "human man",
            "human nose",
            "human ears",
            "elf ears",
            "pointed elf ears",
            "elven face",
            "smooth human skin",
            "human skin",
            "human hair",
            "white human hair",
            "flowing hair",
            "long hair",
            "short human hair",
            "fringe",
            "bangs",
            "ponytail",
            "plaits",
            "braids",
            "pretty human",
            "fashion model face",
            "human glamour portrait",
            "tiefling",
            "dragon helmet",
            "dragon hood",
            "dragon mask",
            "dragon headpiece",
            "separate dragon head",
            "dragon head behind character",
            "pet dragon",
            "dragon companion",
            "second creature",
            "tail",
            "wings"
        );
    }   

    if (value === "goblin") {
        fallbackTerms.push(
            "beautiful elf",
            "elegant elf",
            "tall elf",
            "human face",
            "normal human proportions",
            "smooth perfect skin",
            "fashion model face"
        );
    }

    if (value === "human") {
        fallbackTerms.push(
            "horns",
            "tusks",
            "scales",
            "snout",
            "fangs",
            "dragon face",
            "goblin face"
        );
    }

    if (value === "gnome") {
        fallbackTerms.push(
            "tall elf",
            "human child",
            "long elegant elf ears",
            "goblin face",
            "dragon scales"
        );
    }

    if (value === "dwarf") {
        fallbackTerms.push(
            "tall body",
            "slender body",
            "delicate frame",
            "elf ears"
        );
    }

    return [...new Set([...jsonTerms, ...fallbackTerms].filter(Boolean))];
}

function getClassVisualInstruction(className, weaponName) {
    const classValue = normaliseText(className);
    const weaponValue = weaponName || "weapon";

    const map = {
        fighter: `Class: fighter. Practical armour or battle gear. Show ${weaponValue} if possible.`,
        rogue: `Class: rogue. Light armour, stealth clothing, subtle shadows. Show ${weaponValue} if possible.`,
        ranger: `Class: ranger. Travel gear, outdoors clothing, scout styling. Show ${weaponValue} if possible.`,
        cleric: `Class: cleric. Divine, temple, priestly or holy styling. Show ${weaponValue} if possible.`,
        wizard: `Class: wizard. Arcane robes, spellbook or subtle magic. Show ${weaponValue} if possible.`,
        barbarian: `Class: barbarian. Rugged primal warrior styling. Show ${weaponValue} if possible.`,
        bard: `Class: bard. Artistic expressive performer styling. Show ${weaponValue} if possible.`,
        druid: `Class: druid. Nature-themed clothing. Show ${weaponValue} if possible.`,
        monk: `Class: monk. Simple martial attire. Show ${weaponValue} if possible.`,
        paladin: `Class: paladin. Noble armoured holy styling. Show ${weaponValue} if possible.`,
        sorcerer: `Class: sorcerer. Arcane innate magic styling. Show ${weaponValue} if possible.`,
        warlock: `Class: warlock. Arcane eerie pact-magic styling. Show ${weaponValue} if possible.`
    };

    return map[classValue] || `Class: ${className}. Fantasy ${className} styling. Show ${weaponValue} if possible.`;
}

function getAgeVisualInstruction(ageRange) {
    const value = normaliseText(ageRange);

    if (value === "young adult") {
        return "Age: young adult.";
    }

    if (value === "adult") {
        return "Age: mature adult.";
    }

    if (value === "middle-aged") {
        return "Age: visibly middle-aged.";
    }

    if (value === "elder") {
        return "Age: elderly, older or aged.";
    }

    return "Age: do not strongly emphasise age.";
}

function getBuildVisualInstruction(build) {
    const value = normaliseText(build);

    if (value === "thin") {
        return "Body type: thin, narrow frame, slim arms, slim shoulders, slight build. Do not make them muscular or broad.";
    }

    if (value === "lean") {
        return "Body type: lean, athletic but slim, lightly built, not bulky, not heavily muscular.";
    }

    if (value === "average build") {
        return "Body type: average build, natural proportions, neither thin nor muscular nor large-bodied.";
    }

    if (value === "broad") {
        return "Body type: broad and stocky, wide shoulders, wide torso, solid frame, thick neck, not slim, not narrow, not bodybuilder muscular.";
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

function getFeaturePromptInstruction(notableFeature, species) {
    const feature = String(notableFeature || "").trim();
    const value = feature.toLowerCase();
    const speciesValue = normaliseText(species);

    if (!feature || value.includes("no obvious")) {
        return "No unusual facial mark, scar, tattoo or missing feature.";
    }

    if (value.includes("one shortened horn")) {
        if (speciesValue === "tiefling" || speciesValue === "dragonborn") {
            return "One horn is visibly shorter than the other. The shortened horn must be clear and asymmetrical.";
        }

        return "One small horn-like protrusion is visibly shortened. Show it as the notable feature, but do not turn the character into a tiefling unless the species is Tiefling.";
    }

    if (value.includes("scar across one eyebrow")) {
        return "A realistic healed scar cutting through one eyebrow. It must look like a scar, not a tattoo, not face paint.";
    }

    if (value.includes("small scar on face")) {
        return "A small realistic facial scar. It must look like healed skin damage, not a tattoo or painted mark.";
    }

    if (value.includes("large scar on face")) {
        return "A large realistic facial scar. It must look like damaged or healed skin, not a tattoo or painted mark.";
    }

    if (value.includes("scar across the nose")) {
        return "A realistic scar crossing the nose. It must look like healed skin damage.";
    }

    if (value.includes("scar across one cheek")) {
        return "A realistic scar across one cheek. It must look like healed skin damage.";
    }

    if (value.includes("jagged scar")) {
        return "A jagged realistic scar along the jaw. It must look like healed skin damage.";
    }

    if (value.includes("burn scar")) {
        return "A visible burn scar. It must look like healed burn damage, not a tattoo or face paint.";
    }

    if (value.includes("small face tattoo")) {
        return "A small visible face tattoo. It must look like an intentional tattoo, not a scar, not dirt and not shading.";
    }

    if (value.includes("full face tattoo")) {
        return "A large full-face tattoo covering much of the face.";
    }

    if (value.includes("tattoo around one eye")) {
        return "A visible tattoo around one eye.";
    }

    if (value.includes("ritual mark")) {
        return `A visible ${feature.toLowerCase()}. It should look like a deliberate mark or symbol.`;
    }

    if (value.includes("one missing eye")) {
        return "One eye is missing or covered by an eyepatch.";
    }

    if (value.includes("one clouded eye") || value.includes("blind in one eye")) {
        return "One eye is visibly clouded or blind.";
    }

    if (value.includes("birthmark")) {
        return `Visible ${feature.toLowerCase()}.`;
    }

    if (value.includes("freckles")) {
        return "Visible freckles across the nose and cheeks.";
    }

    if (value.includes("crooked nose")) {
        return "A visibly crooked or slightly bent nose. The nose should look asymmetrical, not perfectly straight.";
    }

    if (value.includes("broken nose")) {
        return "A visibly broken nose that healed slightly crooked. The nose should not look perfectly straight.";
    }

    if (value.includes("split lip")) {
        return "A visible split-lip scar.";
    }

    if (value.includes("missing fingertip")) {
        return "One fingertip is missing if the hands are visible.";
    }

    if (value.includes("missing finger")) {
        return "One finger is missing if the hands are visible.";
    }

    if (value.includes("missing ear tip")) {
        return "One ear has a missing tip.";
    }

    if (value.includes("notched ear")) {
        return "One ear has a visible notch.";
    }

    if (value.includes("eyebrow piercing")) {
        return "A visible eyebrow piercing.";
    }

    if (value.includes("nose piercing")) {
        return "A visible nose piercing.";
    }

    if (value.includes("lip piercing")) {
        return "A visible lip piercing.";
    }

    if (value.includes("ear piercings")) {
        return "Several visible ear piercings.";
    }

    if (value.includes("silver streak")) {
        return "A visible silver streak through the hair.";
    }

    if (value.includes("white streak")) {
        return "A visible white streak through the hair.";
    }

    if (value.includes("glowing eyes")) {
        return "Glowing eyes that still match the listed eye colour.";
    }

    if (value.includes("unusually bright eyes")) {
        return "Unusually bright eyes that still match the listed eye colour.";
    }

    if (value.includes("sharp fangs")) {
        return "Subtle sharp fangs visible if the mouth is slightly open.";
    }

    if (
        value.includes("broken horn") ||
        value.includes("chipped horn") ||
        value.includes("shortened horn") ||
        value.includes("cracked horn")
    ) {
        return `Visible ${feature.toLowerCase()}. The horn damage must be clear and asymmetrical if horns are visible.`;
    }

    if (value.includes("gold tooth")) {
        return "A visible gold tooth if the mouth is slightly open.";
    }

    if (value.includes("ink-stained fingers")) {
        return "Ink-stained fingers if the hands are visible.";
    }

    if (value.includes("calloused hands")) {
        return "Calloused hands if the hands are visible.";
    }

    return `Visible notable feature: ${feature}. Show it naturally and accurately.`;
}

function getHairVisualInstruction(hairColour, hairStyle, species) {
    const rule = findSpeciesPortraitRule(species);
    const speciesValue = normaliseText(species);
    const colourValue = normaliseText(hairColour);
    const styleValue = normaliseText(hairStyle);

    if (speciesValue === "dragonborn") {
        return [
            "Dragonborn head detail:",
            `Listed head, horn or crest colour: ${hairColour || "Unknown"}. This is not human hair colour.`,
            `Listed head style: ${hairStyle || "Unknown"}.`,
            "Show the listed head style as Dragonborn anatomy: horns, crown of horns, crest ridges, head frill, bone crest, scaled crest, spines or smooth scaled head.",
            "If the listed style is Crown Of Horns, show a crown-like arrangement of horns growing from the Dragonborn head.",
            "Dragonborn must not have mammalian hair or human hair.",
            "Do not show loose hair, white human hair, long hair, ponytails, plaits, braids, fringe, bangs, beard or moustache.",
            "Do not interpret the head style as a helmet, hood, mask or separate dragon head."
        ].join(" ");
    }

    if (rule?.hairInstruction) {
        return [
            rule.hairInstruction,
            `Listed hair colour: ${hairColour || "Unknown"}.`,
            `Listed hair style: ${hairStyle || "Unknown"}.`,
            "The hair style must be visible and accurate. Do not default to long loose hair unless the listed style is Long Loose Hair."
        ].join(" ");
    }

    if (
        colourValue === "no hair" ||
        colourValue === "bald" ||
        colourValue === "hairless" ||
        colourValue === "shaved head" ||
        styleValue === "no hair" ||
        styleValue === "bald" ||
        styleValue === "shaved head" ||
        styleValue === "smooth scaled head"
    ) {
        return "Hair: completely bald or species-appropriate hairless head. No fringe, no loose strands, no ponytail, no plaits, no braids and no visible hairstyle.";
    }

    if (hairStyle) {
        return `Hair colour: ${hairColour}. Hair style: ${hairStyle}. This hairstyle must be visible and accurate. Do not default to long loose hair unless the listed style is Long Loose Hair.`;
    }

    return `Hair colour: ${hairColour}. This must be accurate. Do not default to long loose hair unless clearly requested.`;
}

function getSkinVisualInstruction(skinTone, species) {
    const rule = findSpeciesPortraitRule(species);
    const speciesValue = normaliseText(species);

    if (rule?.skinInstruction) {
        return `${rule.skinInstruction} Listed skin or scale colour: ${skinTone || "Unknown"}.`;
    }

    if (speciesValue === "dragonborn") {
        return `Scale colour: ${skinTone || "Unknown"}. Show this as full visible dragon scales across the face, neck, shoulders and upper torso. Do not show smooth human skin.`;
    }

    if (speciesValue === "goblin") {
        return `Skin colour: ${skinTone || "Unknown"}. Show this as non-human goblin skin. If the listed tone is vague, keep the face and body clearly goblinoid.`;
    }

    return `Skin colour or tone: ${skinTone || "Unknown"}.`;
}

function buildAppearancePriorityBlock(character) {
    return `
NON-NEGOTIABLE APPEARANCE DETAILS:
- Species: ${character.species?.name || "Unknown"}
- Gender Identity: ${character.gender || "Unknown"}
- Portrait Presentation: ${character.portraitPresentation || character.gender || "Unknown"}
- Age Range: ${character.ageRange || "Unknown"}
- Height: ${character.height || "Unknown"}
- Build: ${character.build || "Unknown"}
- Skin Colour / Tone: ${character.skinTone || "Unknown"}
- Hair Colour: ${character.hairColour || "Unknown"}
- Hair Style: ${character.hairStyle || "Unknown"}
- Eye Colour: ${character.eyeColour || "Unknown"}
- Notable Feature: ${character.notableFeature || "None given"}

Highest priority order:
1. Species anatomy must be correct first.
2. Species-specific features such as ears, horns, scales, snout, tusks, fangs, face shape and skin texture must match the species.
3. Character sheet appearance details, including hair colour and hair style, must be followed exactly.
4. Class clothing, beauty styling, pose and background are lower priority than species accuracy.
    `.trim();
}

function buildAvoidInstructions(character) {
    const speciesName = character.species?.name || "";
    const species = normaliseText(speciesName);
    const gender = normaliseText(character.portraitPresentation || character.gender);
    const eyeColour = normaliseText(character.eyeColour);
    const build = normaliseText(character.build);
    const hairColour = normaliseText(character.hairColour);
    const hairStyle = normaliseText(character.hairStyle);
    const skinTone = normaliseText(character.skinTone);

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
        ...getSpeciesNegativeTerms(speciesName)
    ];

    if (!speciesAllowsPointedEars(speciesName)) {
        avoid.push("No pointed ears");
        avoid.push("No elf ears");
        avoid.push("No elven face");
    }

    if (species === "human") {
        avoid.push("Do not add horns, tusks, scales or non-human anatomy");
        avoid.push("Do not add pointed ears");
    }

    if (species === "aasimar") {
        avoid.push("Do not add elf ears");
        avoid.push("Do not make the character look like a tiefling");
    }

    if (species === "dwarf") {
        avoid.push("Do not make the character tall and slender");
        avoid.push("Do not give the character elf ears");
    }

    if (species === "dragonborn") {
        avoid.push("Do not make the character human-looking");
        avoid.push("Do not make a human woman with dragon styling");
        avoid.push("Do not make an elf woman with dragon styling");
        avoid.push("Do not give the character smooth skin");
        avoid.push("Do not give the character human skin");
        avoid.push("Do not give the character bare human shoulders");
        avoid.push("Do not give the character human hair");
        avoid.push("Do not give the character white human hair");
        avoid.push("Do not give the character long hair");
        avoid.push("Do not give the character a human nose");
        avoid.push("Do not give the character human ears");
        avoid.push("Do not give the character elf ears");
        avoid.push("Do not make the character a tiefling");
        avoid.push("Do not show ponytail, plaits, braids, fringe, bangs or loose hair");
        avoid.push("Do not show a dragon helmet");
        avoid.push("Do not show a dragon hood");
        avoid.push("Do not show a dragon mask");
        avoid.push("Do not show a dragon headpiece");
        avoid.push("Do not show a separate dragon head behind the character");
        avoid.push("Do not show a pet dragon or dragon companion");
        avoid.push("The character themselves must be the Dragonborn");
    }       

    if (species === "goblin") {
        avoid.push("Do not make the character tall");
        avoid.push("Do not make the character elegant");
        avoid.push("Do not give the character refined elf features");
        avoid.push("Do not give the character normal human proportions");
    }

    if (isNeutralGender(gender)) {
        avoid.push("Avoid strongly masculine styling");
        avoid.push("Avoid strongly feminine styling");
        avoid.push("Avoid seductive styling");
        avoid.push("Avoid heavy makeup");
        avoid.push("Avoid pronounced breasts");
        avoid.push("Avoid beard");
        avoid.push("Avoid moustache");
        avoid.push("Use practical neutral clothing");
    }

    if (build === "thin") {
        avoid.push("Do not make the character broad");
        avoid.push("Do not make the character heavy-set");
        avoid.push("Do not make the character muscular");
    }

    if (build === "lean") {
        avoid.push("Do not make the character bulky");
        avoid.push("Do not make the character heavy-set");
        avoid.push("Do not make the character bodybuilder muscular");
    }

    if (build === "broad") {
        avoid.push("Do not make the character slim");
        avoid.push("Do not make the character narrow-shouldered");
        avoid.push("Do not make the character delicate");
        avoid.push("Do not make the character only muscular");
    }

    if (build === "heavy-set" || build === "fat") {
        avoid.push("Do not make the character slim");
        avoid.push("Do not make the character lean");
        avoid.push("Do not make the character narrow-faced");
        avoid.push("Do not make the character muscular instead of fat");
        avoid.push("Do not hide the body shape with oversized armour");
    }

    if (build === "stocky") {
        avoid.push("Do not make the character slim");
        avoid.push("Do not make the character tall and narrow");
        avoid.push("Do not make the character delicate");
    }

    if (build === "muscular") {
        avoid.push("Do not make the character frail or slender");
        avoid.push("Do not make the character soft-bodied");
    }

    if (
        hairColour.includes("no hair") ||
        hairColour.includes("bald") ||
        hairColour.includes("hairless") ||
        hairColour.includes("shaved head") ||
        hairStyle.includes("no hair") ||
        hairStyle.includes("bald") ||
        hairStyle.includes("shaved head") ||
        hairStyle.includes("smooth scaled head") ||
        species === "dragonborn"
    ) {
        avoid.push("Do not add human hair");
        avoid.push("Do not add long hair");
        avoid.push("Do not add short human hair");
        avoid.push("Do not add fringe");
        avoid.push("Do not add bangs");
        avoid.push("Do not add a ponytail");
        avoid.push("Do not add plaits");
        avoid.push("Do not add braids");
        avoid.push("Do not add loose hair");
    }

    if (hairStyle.includes("short")) {
        avoid.push("Do not show long hair");
        avoid.push("Do not show waist-length hair");
        avoid.push("Do not show hair flowing over the shoulders");
    }

    if (hairStyle.includes("pony")) {
        avoid.push("Do not show loose hair hanging down");
        avoid.push("Do not show unbound hair");
        avoid.push("Do not show plaits instead of a ponytail");
    }

    if (hairStyle.includes("plait") || hairStyle.includes("braid")) {
        avoid.push("Do not show loose unbraided hair");
        avoid.push("Do not show a plain ponytail instead of braids or plaits");
    }

    if (hairStyle.includes("long loose")) {
        avoid.push("Do not show ponytail");
        avoid.push("Do not show braids");
        avoid.push("Do not show plaits");
        avoid.push("Do not show short hair");
    }

    if (hairStyle.includes("shaved sides")) {
        avoid.push("Do not hide the shaved sides with loose hair");
    }

    if (hairColour.includes("silver") && species !== "dragonborn") {
        avoid.push("Do not change the hair to black, brown, blonde or red");
    }

    if (hairColour.includes("red") && species !== "dragonborn") {
        avoid.push("Do not change the hair to black, blonde, grey or silver");
    }

    if (hairColour.includes("black") && species !== "dragonborn") {
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

    if (skinTone.includes("scales") || species === "dragonborn") {
        avoid.push("Do not show smooth human skin");
        avoid.push("Do not show bare human shoulders");
        avoid.push("Do not replace scales with clothing texture");
    }

    if (eyeColour.includes("green")) {
        avoid.push("Do not change the eyes to blue, brown or grey");
    }

    if (eyeColour.includes("blue")) {
        avoid.push("Do not change the eyes to brown, green or gold");
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

    return `AVOID THE FOLLOWING:\n- ${[...new Set(avoid)].join("\n- ")}`;
}

function buildPortraitPrompt(character) {
    const species = character.species?.name || "Unknown Species";
    const className = character.className || "Adventurer";
    const weaponName = character.weapon?.name || "weapon";
    const portraitPresentation = character.portraitPresentation || character.gender || "Unknown";
    const profile = character.generatedProfile || {};
    const coreTraits = Array.isArray(profile.traits) ? profile.traits.join(", ") : "Unknown";

    return `
Create a highly accurate fantasy character portrait for a DnD-inspired character generator.
This portrait must closely follow the character sheet.

${buildAppearancePriorityBlock(character)}

SPECIES ANATOMY REQUIREMENT:
${getSpeciesVisualInstruction(species)}

VISUAL REQUIREMENTS:
- ${getGenderPresentationInstruction(portraitPresentation)}
- ${getAgeVisualInstruction(character.ageRange)}
- ${getBuildVisualInstruction(character.build)}
- ${getSkinVisualInstruction(character.skinTone, species)}
- ${getHairVisualInstruction(character.hairColour, character.hairStyle, species)}
- Eye colour: ${character.eyeColour || "Unknown"}.
- ${getFeaturePromptInstruction(character.notableFeature, species)}
- ${getClassVisualInstruction(className, weaponName)}

SECONDARY ROLEPLAY FLAVOUR:
- Core traits: ${coreTraits}
- Alignment: ${profile.alignment || "Unknown"}
- Religious outlook: ${profile.faithProfile || "Unknown"}
- Weakness: ${profile.weakness || "Unknown"}

COMPOSITION:
One single character only. Waist-up or chest-up portrait. Clear view of the face and species anatomy. Simple fantasy background. No extra characters.

${buildAvoidInstructions(character)}

STYLE:
Detailed fantasy digital painting, polished RPG portrait art, cinematic lighting, accurate anatomy, no text, no signature, no watermark.
    `.trim();
}

function buildDragonbornCloudflarePrompt(character) {
    const species = character.species?.name || "Dragonborn";
    const className = character.className || "adventurer";
    const weaponName = character.weapon?.name || "weapon";

    const name = character.name || "Unnamed character";
    const gender = character.gender || "Unknown";
    const portraitPresentation = character.portraitPresentation || gender || "Unknown";
    const ageRange = character.ageRange || "Unknown";
    const height = character.height || "Unknown";
    const build = character.build || "Unknown";
    const skinTone = character.skinTone || "Unknown";
    const hairColour = character.hairColour || "Unknown";
    const hairStyle = character.hairStyle || "Unknown";
    const eyeColour = character.eyeColour || "Unknown";
    const notableFeature = character.notableFeature || "No Obvious Unusual Feature";

    const featureRule = getFeaturePromptInstruction(notableFeature, species);
    const classRule = getClassVisualInstruction(className, weaponName);
    const buildRule = getBuildVisualInstruction(build);
    const genderRule = getGenderPresentationInstruction(portraitPresentation);
    const ageRule = getAgeVisualInstruction(ageRange);

    return `
Create one single fantasy RPG waist-up portrait of ${name}. The character themselves must be a Dragonborn. Do not make a human, elf or tiefling with dragon-themed styling.

SPECIES:
Dragonborn. Wingless bipedal dragon person. Fully reptilian draconic head. Clear dragon snout or muzzle. Scaled brow ridges. Visible scales across face, neck, shoulders, chest and upper torso. Predator teeth. No human face.

APPEARANCE:
Gender identity: ${gender}. Portrait presentation: ${portraitPresentation}. ${genderRule}
If the gender identity or portrait presentation is non binary, non gendered, androgynous or no strong gendered features, use neutral body styling and do not emphasise breasts, hips, beard, moustache, heavy makeup or strongly gendered features.
Age: ${ageRange}. ${ageRule}
Height: ${height}.
Build: ${build}. ${buildRule}
Scale colour: ${skinTone}. Show this as real Dragonborn scales, not smooth human skin.
Head, horn or crest colour: ${hairColour}. This is not human hair.
Head style: ${hairStyle}. Show this exact Dragonborn head style. If it says Smooth Scaled Head, show a smooth scaled skull with no head hair, no head spines, no crest, no frill and no crown of horns. If it says Long Head Spines, show several long visible spines growing from the back/top of the head, not just horns or a frill. If it says Crown Of Horns, show a crown-like arrangement of horns growing from the Dragonborn head.
Eye colour: ${eyeColour}. The visible eyes must clearly be ${eyeColour}. If the eye colour is Black, show black or near-black eyes, not green, blue, yellow, gold, amber or brown.
Class: ${className}. Weapon: ${weaponName}. ${classRule}

NOTABLE FEATURE:
${notableFeature}. ${featureRule}
This notable feature must be clearly visible on the face or head. Do not hide it with angle, cropping, shadows, armour or pose. If the feature says one missing eye, one eye must be visibly missing or covered by an eyepatch.

STRICT RULES:
The character is the Dragonborn. Do not show wings, a tail, a separate dragon head behind them, a pet dragon, dragon companion, dragon helmet, dragon hood, dragon mask or dragon headpiece.
Do not show human face, human nose, human ears, elf ears, smooth human skin, bare human shoulders, human hair, white human hair, long hair, short human hair, fringe, bangs, ponytail, plaits or braids.
Feminine or masculine presentation must not override Dragonborn reptilian anatomy.
Keep the head and face clear and unobstructed. No helmets, hoods, masks, heavy shadows or tight cropping hiding the Dragonborn anatomy.

STYLE:
Detailed fantasy digital painting, polished RPG portrait art, simple dark fantasy background, one character only, clear face, no text, no signature, no watermark.
    `.trim().slice(0, cloudflarePromptLimit);
}

function buildCloudflarePrompt(character) {
    const species = character.species?.name || "fantasy character";
    const className = character.className || "adventurer";
    const weaponName = character.weapon?.name || "weapon";

    const name = character.name || "Unnamed character";
    const gender = character.gender || "Unknown";
    const portraitPresentation = character.portraitPresentation || gender || "Unknown";
    const ageRange = character.ageRange || "Unknown";
    const height = character.height || "Unknown";
    const build = character.build || "Unknown";
    const skinTone = character.skinTone || "Unknown";
    const hairColour = character.hairColour || "Unknown";
    const hairStyle = character.hairStyle || "Unknown";
    const eyeColour = character.eyeColour || "Unknown";
    const notableFeature = character.notableFeature || "No Obvious Unusual Feature";

    if (normaliseText(species) === "dragonborn") {
        return buildDragonbornCloudflarePrompt(character);
    }

    const speciesRule = getSpeciesVisualInstruction(species);
    const genderRule = getGenderPresentationInstruction(portraitPresentation);
    const ageRule = getAgeVisualInstruction(ageRange);
    const buildRule = getBuildVisualInstruction(build);
    const skinRule = getSkinVisualInstruction(skinTone, species);
    const hairRule = getHairVisualInstruction(hairColour, hairStyle, species);
    const featureRule = getFeaturePromptInstruction(notableFeature, species);
    const classRule = getClassVisualInstruction(className, weaponName);

    const buildValue = normaliseText(build);
    const speciesValue = normaliseText(species);

    const strongBodyAnchor = (
        buildValue === "fat" ||
        buildValue === "heavy-set"
    )
        ? "This character must visibly be fat and large-bodied, with a rounder face, thick neck, broad upper torso and visible body weight. Do not make them slim, lean, athletic or muscular."
        : buildValue === "broad"
            ? "This character must visibly have a broad body, wide shoulders, wide upper torso and solid frame. Do not make them slim or narrow."
            : buildValue === "stocky"
                ? "This character must visibly be stocky, compact, solid and broad through the upper torso. Do not make them slim or narrow."
                : buildRule;

    const neutralPresentationExtra = isNeutralGender(portraitPresentation)
        ? "Neutral androgynous styling. Practical neutral clothing. No beard. No moustache. No heavy makeup. No seductive styling. No pronounced breasts. No strongly gendered styling."
        : "";

    const speciesPriorityWarning = (
        speciesValue === "dragonborn"
            ? "If there is any conflict between attractive human portrait styling and Dragonborn anatomy, Dragonborn anatomy wins. The result must not look human."
            : speciesValue === "goblin"
                ? "If there is any conflict between attractive elf styling and Goblin anatomy, Goblin anatomy wins. The result must not look elven."
                : "Species anatomy is the highest priority."
    );

    const prompt = `
Create one single fantasy RPG waist-up portrait. One character only. Show the face, head, ears or horns, neck, shoulders, chest and upper torso clearly. No text, no signature, no artist signature, no watermark, no logo, no extra faces, no second character, no character sheet layout.

PRIMARY SPECIES REQUIREMENT:
Species: ${species}.
${speciesRule}
${speciesPriorityWarning}

PRIMARY CHARACTER DETAILS:
Name: ${name}.
Gender identity: ${gender}.
Portrait presentation: ${portraitPresentation}. ${neutralPresentationExtra}
Age range: ${ageRange}.
Height: ${height}.
Build: ${build}.
${strongBodyAnchor}
${skinRule}
${hairRule}
Eye colour: ${eyeColour}.
Class: ${className}.
Weapon: ${weaponName}.

PRIMARY FACIAL OR BODY FEATURE:
The character must visibly have this notable feature: ${notableFeature}.
${featureRule}
The face and head must be clear, close enough, and unobstructed so the notable feature, hair style and species anatomy are easy to see.

VISUAL RULES:
${genderRule}
${ageRule}
${classRule}

IMPORTANT:
Species anatomy must be correct before beauty, clothing, pose or background.
Hair style must match the listed hair style exactly.
Do not default to long loose hair unless the listed hair style is Long Loose Hair.
Do not convert non-human species into attractive humans.
Do not hide species features with hair, helmets, hoods, cloaks, shadows or cropping.
Do not hide the hair style with helmets, hoods, cloaks, shadows or tight cropping.
Do not crop the image so tightly that the build, hair style and species anatomy are invisible.
Do not default to elf ears unless the species is actually Elf or Half-Elf.
Do not ignore the notable feature.
Do not turn scars into tattoos or face paint.
Do not add hair if the character is bald, has no hair, or is Dragonborn.

Accuracy priority:
1. Species anatomy must be visibly correct.
2. Species-specific ears, horns, snout, scales, tusks, fangs or facial structure must be correct.
3. Hair colour and hair style must be visibly correct.
4. Body build must be visibly correct.
5. Notable feature must be visibly correct.
6. Skin or scale colour and eye colour must match.
7. Age and portrait presentation must match.

${buildAvoidInstructions(character)}

Detailed fantasy digital painting, simple dark fantasy background.
    `.trim();

    if (prompt.length <= cloudflarePromptLimit) {
        return prompt;
    }

    return `
One single fantasy RPG waist-up portrait. Show clear face, head, species anatomy, hair style, shoulders, chest and upper torso. No text, no signature, no watermark, no extra faces.

Species: ${species}.
${speciesRule}
${speciesPriorityWarning}

${name}, ${species} ${className}.
Gender identity: ${gender}. Portrait presentation: ${portraitPresentation}. ${neutralPresentationExtra}
Age: ${ageRange}. Height: ${height}.
Build: ${build}. ${strongBodyAnchor}
${skinRule}
${hairRule}
Eyes: ${eyeColour}. Weapon: ${weaponName}.

Main feature: ${notableFeature}.
${featureRule}

${genderRule}
${ageRule}

Hair style must match exactly. Do not default to long loose hair unless the listed hair style is Long Loose Hair. Do not hide species anatomy or hair style with hair, helmets, hoods, cloaks, armour, shadows or tight cropping. Do not make Dragonborn human-looking. Do not make Goblins look like elves. Do not use elf ears unless the species is Elf or Half-Elf. Do not ignore the notable feature.

${buildAvoidInstructions(character)}
    `.trim().slice(0, cloudflarePromptLimit);
}

function buildDynamicNegativePrompt(character) {
    const speciesName = character.species?.name || "";
    const species = normaliseText(speciesName);
    const gender = normaliseText(character.portraitPresentation || character.gender);
    const build = normaliseText(character.build);
    const hairColour = normaliseText(character.hairColour);
    const hairStyle = normaliseText(character.hairStyle);
    const skinTone = normaliseText(character.skinTone);
    const eyeColour = normaliseText(character.eyeColour);

    const negatives = [
        "text",
        "letters",
        "caption",
        "signature",
        "artist signature",
        "watermark",
        "logo",
        "character sheet",
        "concept sheet",
        "multiple portraits",
        "multiple views",
        "extra face",
        "extra people",
        "collage",
        "panel layout",
        "comic panel",
        "inset portrait",
        ...getSpeciesNegativeTerms(speciesName)
    ];

    if (!speciesAllowsPointedEars(speciesName)) {
        negatives.push("elf ears", "pointed ears", "elven face");
    }

    if (species === "human") {
        negatives.push("horns", "tusks", "scales", "non-human anatomy", "pointed ears", "dragon face", "goblin face");
    }

    if (species === "dragonborn") {
        negatives.push(
            "human face",
            "human woman",
            "human man",
            "human nose",
            "human ears",
            "elf ears",
            "pointed elf ears",
            "elven face",
            "smooth skin",
            "smooth human skin",
            "human skin",
            "bare human shoulders",
            "human hair",
            "white human hair",
            "flowing hair",
            "long hair",
            "short human hair",
            "ponytail",
            "braids",
            "plaits",
            "fringe",
            "bangs",
            "pretty human",
            "fashion model",
            "human glamour portrait",
            "tiefling",
            "dragon helmet",
            "dragon hood",
            "dragon mask",
            "dragon headpiece",
            "separate dragon head",
            "dragon head behind character",
            "pet dragon",
            "dragon companion",
            "second creature",
            "tail",
            "wings"
        );
    }

    if (species === "goblin") {
        negatives.push(
            "beautiful elf",
            "tall elf",
            "elegant elf",
            "human face",
            "normal human proportions",
            "smooth perfect skin",
            "fashion model"
        );
    }

    if (species === "dwarf") {
        negatives.push("tall body", "slender body", "delicate frame", "elf ears");
    }

    if (isNeutralGender(gender)) {
        negatives.push(
            "strongly feminine",
            "strongly masculine",
            "seductive",
            "heavy makeup",
            "pronounced breasts",
            "beard",
            "moustache"
        );
    }

    if (build === "thin") {
        negatives.push("broad body", "heavy-set body", "fat body", "muscular body");
    }

    if (build === "lean") {
        negatives.push("bulky body", "heavy-set body", "fat body", "bodybuilder");
    }

    if (build === "broad") {
        negatives.push("thin body", "slim body", "narrow shoulders", "delicate frame");
    }

    if (build === "heavy-set" || build === "fat") {
        negatives.push("thin body", "slim body", "lean body", "narrow face", "bodybuilder", "six-pack", "defined abs");
    }

    if (build === "stocky") {
        negatives.push("thin body", "slim body", "tall narrow body", "delicate frame");
    }

    if (build === "muscular") {
        negatives.push("frail body", "slender body", "soft body");
    }

    if (
        hairColour.includes("no hair") ||
        hairColour.includes("bald") ||
        hairColour.includes("hairless") ||
        hairColour.includes("shaved head") ||
        hairStyle.includes("no hair") ||
        hairStyle.includes("bald") ||
        hairStyle.includes("shaved head") ||
        hairStyle.includes("smooth scaled head") ||
        species === "dragonborn"
    ) {
        negatives.push(
            "human hair",
            "hair",
            "long hair",
            "short human hair",
            "fringe",
            "bangs",
            "ponytail",
            "plaits",
            "braids",
            "loose hair",
            "visible human hairstyle"
        );
    }

    if (hairStyle.includes("short")) {
        negatives.push("long hair", "waist-length hair", "flowing hair");
    }

    if (hairStyle.includes("pony")) {
        negatives.push("loose hair", "hair down", "unbound hair", "braids instead of ponytail", "plaits instead of ponytail");
    }

    if (hairStyle.includes("plait") || hairStyle.includes("braid")) {
        negatives.push("loose hair", "hair down", "unbraided hair", "plain ponytail");
    }

    if (hairStyle.includes("long loose")) {
        negatives.push("ponytail", "braids", "plaits", "short hair");
    }

    if (hairStyle.includes("shaved sides")) {
        negatives.push("hair covering shaved sides");
    }

    if (hairColour.includes("silver") && species !== "dragonborn") {
        negatives.push("black hair", "brown hair", "blonde hair", "red hair");
    }

    if (hairColour.includes("red") && species !== "dragonborn") {
        negatives.push("black hair", "blonde hair", "grey hair", "silver hair");
    }

    if (hairColour.includes("black") && species !== "dragonborn") {
        negatives.push("blonde hair", "red hair", "white hair", "silver hair");
    }

    if (
        skinTone.includes("deep brown") ||
        skinTone.includes("warm brown") ||
        skinTone.includes("bronze") ||
        skinTone.includes("copper")
    ) {
        negatives.push("pale skin", "fair skin", "white skin", "light skin");
    }

    if (skinTone.includes("scales") || species === "dragonborn") {
        negatives.push("smooth skin", "human skin", "bare human shoulders");
    }

    if (eyeColour.includes("green")) {
        negatives.push("blue eyes", "brown eyes", "grey eyes");
    }

    if (eyeColour.includes("blue")) {
        negatives.push("brown eyes", "green eyes", "gold eyes");
    }

    if (eyeColour.includes("black")) {
        negatives.push("green eyes", "blue eyes", "yellow eyes", "gold eyes", "amber eyes", "brown eyes", "grey eyes");
    }

    if (eyeColour.includes("violet") || eyeColour.includes("purple")) {
        negatives.push("blue eyes", "brown eyes", "green eyes");
    }

    if (eyeColour.includes("gold") || eyeColour.includes("amber")) {
        negatives.push("blue eyes", "brown eyes", "green eyes");
    }

    if (eyeColour.includes("grey") || eyeColour.includes("gray")) {
        negatives.push("blue eyes", "brown eyes", "green eyes");
    }

    return [...new Set(negatives)].join(", ");
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
    getSpeciesNegativeTerms
};