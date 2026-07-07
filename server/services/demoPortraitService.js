/* =========================================================
    Dicebound
    Demo Portrait Fallback Service
    ---------------------------------------------------------
    This file creates a local SVG portrait when real image
    generation is unavailable.

    Responsibilities:
    - always return a usable image data URL
    - display key character details clearly
    - provide a lightweight visual fallback for each species
    - avoid calling external APIs
    - avoid duplicating AI prompt-building logic

    This is not an image-generation prompt service. Species
    prompt rules belong in speciesPromptService.js and
    promptBuilder.js. This file only creates a simple local
    placeholder so the frontend still receives something useful
    when demo mode is active or external image generation fails.
   ========================================================= */

const defaultImageSize = 1024;
const defaultAccentColour = "#d6a84f";
const defaultSkinColour = "#d8b08c";
const defaultHairColour = "#4a2c1a";
const defaultEyeColour = "#facc15";

const colourMaps = {
    classAccents: {
        barbarian: "#991b1b",
        bard: "#be185d",
        cleric: "#ca8a04",
        druid: "#15803d",
        fighter: "#b45309",
        monk: "#7c2d12",
        paladin: "#d6a84f",
        ranger: "#15803d",
        rogue: "#6d28d9",
        sorcerer: "#dc2626",
        warlock: "#7c3aed",
        wizard: "#2563eb"
    },
    skin: {
        pale: "#ead7c5",
        fair: "#e8c7a3",
        olive: "#b89768",
        golden: "#d6a05f",
        bronze: "#a97142",
        "warm brown": "#8b5a3c",
        "deep brown": "#5c3728",
        ashen: "#9ca3af",
        grey: "#9ca3af",
        "pale grey": "#c7c9cc",
        "stone grey": "#8b9096",
        green: "#6b8f5a",
        "grey-green": "#6f8072",
        "yellow-green": "#9a9f45",
        red: "#9f3a2f",
        purple: "#7651a8",
        "blue-grey": "#6f86a3",
        "copper-toned": "#b8734f",
        "black scales": "#1f2937",
        "blue scales": "#315a9e",
        "bronze scales": "#8a5a2b",
        "copper scales": "#b8734f",
        "gold scales": "#c49a3a",
        "green scales": "#2f7d45",
        "red scales": "#9f3a2f",
        "silver scales": "#cbd5e1",
        "white scales": "#e5e7eb"
    },
    hair: {
        black: "#111111",
        brown: "#4a2c1a",
        auburn: "#7c2d12",
        red: "#b91c1c",
        blonde: "#d6b25e",
        white: "#f3f4f6",
        silver: "#cbd5e1",
        grey: "#9ca3af",
        "ash-grey": "#858b92",
        copper: "#b87333",
        "dark blue": "#1e3a8a",
        gold: "#d6a84f",
        bone: "#e5dcc8",
        "black horns": "#111111",
        "bone-coloured horns": "#e5dcc8",
        "bronze horns": "#8a5a2b",
        "copper horns": "#b8734f",
        "gold horns": "#d6a84f",
        "ivory horns": "#f3ead7",
        "silver horns": "#cbd5e1",
        "white horns": "#f3f4f6"
    },
    eyes: {
        amber: "#f59e0b",
        black: "#111827",
        blue: "#38bdf8",
        brown: "#7c4a25",
        gold: "#facc15",
        green: "#22c55e",
        grey: "#94a3b8",
        hazel: "#a87932",
        red: "#dc2626",
        silver: "#cbd5e1",
        violet: "#8b5cf6",
        white: "#f8fafc",
        yellow: "#facc15"
    }
};

function createDemoPortrait(character = {}) {
    try {
        const demoCharacter = normaliseDemoCharacter(character);
        const svg = createDemoPortraitSvg(demoCharacter);

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch (error) {
        console.error("Demo portrait fallback failed.", error);
        return createEmergencyDemoPortrait(error);
    }
}

function normaliseDemoCharacter(character) {
    const profile = character.generatedProfile || {};
    const traits = Array.isArray(profile.traits) && profile.traits.length > 0
        ? profile.traits.slice(0, 4)
        : ["Unwritten", "Mysterious", "Untested"];

    return {
        name: character.name || "Unnamed Adventurer",
        species: getSpeciesName(character.species),
        className: character.className || character.class?.name || "Unknown Class",
        gender: character.gender || "Unknown",
        ageRange: character.ageRange || "Unknown",
        height: character.height || "Unknown",
        build: character.build || "Unknown",
        eyeColour: character.eyeColour || "Unknown",
        hairColour: character.hairColour || "Unknown",
        hairStyle: character.hairStyle || "Unknown",
        skinTone: character.skinTone || "Unknown",
        notableFeature: getNotableFeatureName(character.notableFeature),
        weaponName: character.weapon?.name || "Unknown Weapon",
        weaponDamage: character.weapon?.damage || "",
        traits
    };
}

function createDemoPortraitSvg(character) {
    const speciesKey = normaliseKey(character.species);
    const classAccent = getClassAccent(character.className);
    const skinColour = getSkinColour(character.skinTone);
    const hairColour = getHairColour(character.hairColour);
    const eyeColour = getEyeColour(character.eyeColour);

    const initials = getInitials(character.name);
    const nameLines = splitTextIntoLines(character.name, 22, 2);
    const detailLines = splitTextIntoLines(`${character.species} ${character.className}`, 28, 2);
    const weaponText = character.weaponDamage
        ? `${character.weaponName}, ${character.weaponDamage}`
        : character.weaponName;
    const featureLines = splitTextIntoLines(character.notableFeature, 80, 1);
    const appearanceLines = createAppearanceLines(character, speciesKey);

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${defaultImageSize}" height="${defaultImageSize}" viewBox="0 0 ${defaultImageSize} ${defaultImageSize}">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#120c08"/>
            <stop offset="42%" stop-color="#24140b"/>
            <stop offset="100%" stop-color="#050505"/>
        </linearGradient>

        <radialGradient id="glow" cx="50%" cy="28%" r="55%">
            <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="${classAccent}" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <linearGradient id="robe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#111827" stop-opacity="0.95"/>
        </linearGradient>

        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
    </defs>

    <rect width="${defaultImageSize}" height="${defaultImageSize}" fill="url(#bg)"/>
    <rect width="${defaultImageSize}" height="${defaultImageSize}" fill="url(#glow)"/>

    <circle cx="512" cy="140" r="245" fill="${classAccent}" opacity="0.12"/>
    <circle cx="160" cy="165" r="95" fill="#facc15" opacity="0.07"/>
    <circle cx="865" cy="230" r="125" fill="#f5e6c8" opacity="0.05"/>

    <g filter="url(#shadow)">
        ${createTorso(classAccent)}
        ${createSpeciesBust(character, speciesKey, {
            classAccent,
            skinColour,
            hairColour,
            eyeColour
        })}
    </g>

    <g>
        <rect x="72" y="70" width="235" height="72" rx="18" fill="#000000" opacity="0.3" stroke="#d6a84f" stroke-opacity="0.55"/>
        <text x="190" y="115" text-anchor="middle" fill="#facc15" font-size="28" font-family="Arial, sans-serif" font-weight="700">
            DEMO MODE
        </text>
    </g>

    <g>
        <circle cx="835" cy="140" r="58" fill="#000000" opacity="0.25" stroke="#d6a84f" stroke-opacity="0.65"/>
        <text x="835" y="160" text-anchor="middle" fill="#d6a84f" font-size="46" font-family="Georgia, serif" font-weight="700">
            ${escapeSvgText(initials)}
        </text>
    </g>

    <g>
        <rect x="92" y="790" width="840" height="162" rx="28" fill="#070707" opacity="0.68" stroke="#d6a84f" stroke-opacity="0.45"/>

        ${createSvgTextLines(nameLines, 512, 840, 46, "#f7ead8", 52, "Georgia, serif", "700")}
        ${createSvgTextLines(detailLines, 512, 890, 34, "#f4d9a9", 32, "Arial, sans-serif", "600")}

        <text x="512" y="930" text-anchor="middle" fill="#cbd5e1" font-size="24" font-family="Arial, sans-serif">
            ${escapeSvgText(character.gender)} • ${escapeSvgText(character.ageRange)} • ${escapeSvgText(character.height)} • ${escapeSvgText(character.build)}
        </text>
    </g>

    <g>
        <rect x="80" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
        <text x="105" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">APPEARANCE</text>
        ${createSvgTextLines(appearanceLines, 105, 675, 30, "#f7ead8", 22, "Georgia, serif", "600", "start")}
    </g>

    <g>
        <rect x="674" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
        <text x="699" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">WEAPON</text>
        ${createSvgTextLines(splitTextIntoLines(weaponText, 17, 2), 699, 680, 30, "#f7ead8", 24, "Georgia, serif", "700", "start")}
    </g>

    <g>
        <rect x="360" y="610" width="304" height="130" rx="22" fill="#000000" opacity="0.34" stroke="#d6a84f" stroke-opacity="0.26"/>
        <text x="512" y="648" text-anchor="middle" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">CORE TRAITS</text>
        <text x="512" y="692" text-anchor="middle" fill="#f7ead8" font-size="26" font-family="Georgia, serif">
            ${escapeSvgText(character.traits.slice(0, 2).join(" • "))}
        </text>
        <text x="512" y="727" text-anchor="middle" fill="#f7ead8" font-size="24" font-family="Georgia, serif">
            ${escapeSvgText(character.traits.slice(2, 4).join(" • "))}
        </text>
    </g>

    <g>
        <text x="512" y="65" text-anchor="middle" fill="#f7ead8" font-size="28" font-family="Arial, sans-serif" opacity="0.82">
            Dicebound Character Portrait
        </text>
    </g>

    <g>
        <text x="512" y="990" text-anchor="middle" fill="#dbc59d" font-size="19" font-family="Arial, sans-serif" opacity="0.8">
            ${escapeSvgText(featureLines.join(" "))}
        </text>
    </g>
</svg>
    `.trim();
}

function createTorso(classAccent) {
    return `
        <path d="M285 780 C310 580 365 470 512 470 C659 470 714 580 739 780 Z" fill="url(#robe)"/>
        <path d="M330 785 C360 640 405 555 512 555 C619 555 664 640 694 785 Z" fill="#0f172a" opacity="0.38"/>
        <path d="M368 462 C415 535 608 535 656 462 C626 520 397 520 368 462 Z" fill="#000000" opacity="0.12"/>
        <circle cx="512" cy="515" r="38" fill="${classAccent}" opacity="0.26"/>
    `;
}

function createSpeciesBust(character, speciesKey, colours) {
    if (speciesKey === "dragonborn") {
        return createDragonbornBust(character, colours);
    }

    return createHumanoidBust(character, speciesKey, colours);
}

function createHumanoidBust(character, speciesKey, colours) {
    const glow = speciesKey === "aasimar"
        ? createAasimarGlow(colours.classAccent)
        : "";
    const horns = speciesKey === "tiefling"
        ? createTieflingHorns()
        : "";
    const ears = createHumanoidEars(speciesKey, colours.skinColour);
    const hair = createHumanoidHair(character.hairStyle, colours.hairColour, colours.skinColour);
    const faceDetails = createHumanoidFaceDetails(speciesKey, colours.eyeColour);

    return `
        ${glow}
        ${horns}
        ${ears}
        <circle cx="512" cy="330" r="150" fill="${colours.skinColour}"/>
        ${hair}
        ${faceDetails}
    `;
}

function createDragonbornBust(character, colours) {
    const headDetailColour = getHairColour(character.hairColour);
    const behindHeadDetail = createDragonbornHeadDetail(character.hairStyle, headDetailColour, "behind");
    const frontHeadDetail = createDragonbornHeadDetail(character.hairStyle, headDetailColour, "front");

    return `
        ${behindHeadDetail}

        <path d="M350 320 C360 205 432 145 512 145 C602 145 672 214 674 324 C671 418 606 491 512 491 C418 491 353 419 350 320 Z" fill="${colours.skinColour}"/>

        <path d="M414 338 C438 300 482 284 512 286 C559 289 610 313 638 356 C610 388 565 407 512 407 C462 407 425 384 414 338 Z" fill="${colours.skinColour}" stroke="#000000" stroke-opacity="0.18" stroke-width="8"/>

        <path d="M402 365 C440 417 584 417 624 365 C590 442 438 442 402 365 Z" fill="#000000" opacity="0.14"/>

        ${createDragonbornScaleMarks()}

        <ellipse cx="455" cy="332" rx="24" ry="14" fill="${colours.eyeColour}"/>
        <ellipse cx="569" cy="332" rx="24" ry="14" fill="${colours.eyeColour}"/>
        <path d="M455 318 L455 346" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
        <path d="M569 318 L569 346" stroke="#111827" stroke-width="6" stroke-linecap="round"/>

        <path d="M502 356 C508 366 516 366 522 356" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
        <path d="M470 420 C493 436 530 436 554 420" fill="none" stroke="#111827" stroke-width="7" stroke-linecap="round" opacity="0.58"/>

        <path d="M390 292 C430 254 590 254 633 295" fill="none" stroke="#111827" stroke-width="10" stroke-linecap="round" opacity="0.28"/>

        ${frontHeadDetail}
    `;
}

function createAasimarGlow(classAccent) {
    return `
        <circle cx="512" cy="315" r="190" fill="${classAccent}" opacity="0.08"/>
        <circle cx="512" cy="315" r="168" fill="none" stroke="#fef3c7" stroke-width="5" stroke-opacity="0.24"/>
    `;
}

function createTieflingHorns() {
    return `
        <path d="M425 210 C387 151 406 112 462 153 C438 166 433 188 438 225 Z" fill="#e5dcc8" stroke="#3f2412" stroke-width="6" opacity="0.95"/>
        <path d="M599 210 C637 151 618 112 562 153 C586 166 591 188 586 225 Z" fill="#e5dcc8" stroke="#3f2412" stroke-width="6" opacity="0.95"/>
    `;
}

function createHumanoidEars(speciesKey, skinColour) {
    const pointedEarSpecies = ["elf", "gnome", "tiefling"];

    if (pointedEarSpecies.includes(speciesKey)) {
        return `
            <path d="M374 318 L312 270 L340 370 Z" fill="${skinColour}" stroke="#000000" stroke-opacity="0.12" stroke-width="5"/>
            <path d="M650 318 L712 270 L684 370 Z" fill="${skinColour}" stroke="#000000" stroke-opacity="0.12" stroke-width="5"/>
        `;
    }

    return `
        <ellipse cx="363" cy="335" rx="31" ry="48" fill="${skinColour}" opacity="0.98"/>
        <ellipse cx="661" cy="335" rx="31" ry="48" fill="${skinColour}" opacity="0.98"/>
    `;
}

function createHumanoidHair(hairStyle, hairColour, skinColour) {
    const styleKey = normaliseKey(hairStyle);

    if (styleKey.includes("bald") || styleKey.includes("no hair")) {
        return "";
    }

    if (styleKey.includes("shaved head")) {
        return `
            <path d="M365 312 C374 215 435 160 512 160 C594 160 653 224 660 315 C622 255 572 230 512 230 C452 230 403 255 365 312 Z" fill="${skinColour}" opacity="0.42"/>
            <path d="M382 293 C410 205 450 170 512 170 C575 170 620 205 642 293" fill="${hairColour}" opacity="0.22"/>
        `;
    }

    const longHairBack = styleKey.includes("long") || styleKey.includes("flowing")
        ? `<path d="M348 300 C318 430 360 545 430 585 C396 485 418 400 512 400 C606 400 628 485 594 585 C664 545 706 430 676 300 Z" fill="${hairColour}" opacity="0.82"/>`
        : "";

    return `
        ${longHairBack}
        <path d="M365 318 C372 190 442 130 515 130 C602 130 675 202 664 330 C626 286 575 265 508 267 C450 269 400 288 365 318 Z" fill="${hairColour}"/>
        <path d="M365 312 C374 215 435 160 512 160 C594 160 653 224 660 315 C622 255 572 230 512 230 C452 230 403 255 365 312 Z" fill="${hairColour}" opacity="0.88"/>
    `;
}

function createHumanoidFaceDetails(speciesKey, eyeColour) {
    const heavyBrow = speciesKey === "orc" || speciesKey === "dwarf"
        ? `
            <path d="M423 310 C445 294 472 296 489 309" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round" opacity="0.38"/>
            <path d="M535 309 C554 296 581 294 603 310" fill="none" stroke="#111827" stroke-width="8" stroke-linecap="round" opacity="0.38"/>
        `
        : "";

    const tusks = speciesKey === "orc"
        ? `
            <path d="M480 407 L492 448 L505 407 Z" fill="#f3ead7" stroke="#3f2412" stroke-width="3"/>
            <path d="M544 407 L532 448 L519 407 Z" fill="#f3ead7" stroke="#3f2412" stroke-width="3"/>
        `
        : "";

    return `
        ${heavyBrow}

        <ellipse cx="455" cy="337" rx="18" ry="11" fill="${eyeColour}"/>
        <ellipse cx="569" cy="337" rx="18" ry="11" fill="${eyeColour}"/>
        <circle cx="455" cy="337" r="5" fill="#111827"/>
        <circle cx="569" cy="337" r="5" fill="#111827"/>

        <path d="M507 354 C500 382 498 390 484 394" fill="none" stroke="#3f2412" stroke-width="5" stroke-linecap="round" opacity="0.28"/>
        <path d="M470 404 C493 424 530 424 554 404" fill="none" stroke="#3f2412" stroke-width="8" stroke-linecap="round" opacity="0.55"/>

        ${tusks}
    `;
}

function createDragonbornHeadDetail(hairStyle, detailColour, layer) {
    const styleKey = normaliseKey(hairStyle);

    if (styleKey.includes("smooth scaled head")) {
        return "";
    }

    if (styleKey.includes("head frill")) {
        if (layer !== "behind") {
            return "";
        }

        return `
            <path d="M356 304 C332 210 396 158 512 148 C628 158 692 210 668 304 C620 260 578 238 512 238 C446 238 404 260 356 304 Z" fill="${detailColour}" opacity="0.72" stroke="#111827" stroke-opacity="0.22" stroke-width="6"/>
        `;
    }

    if (styleKey.includes("crown of horns")) {
        if (layer !== "behind") {
            return "";
        }

        return `
            <path d="M420 210 L390 125 L462 188 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
            <path d="M470 177 L455 95 L505 165 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
            <path d="M554 177 L569 95 L519 165 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
            <path d="M604 210 L634 125 L562 188 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
        `;
    }

    if (styleKey.includes("swept-back horns") || styleKey.includes("small horns") || styleKey.includes("horned crest")) {
        if (layer !== "behind") {
            return "";
        }

        return `
            <path d="M426 216 C390 148 417 112 474 171 C446 176 434 196 426 216 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
            <path d="M598 216 C634 148 607 112 550 171 C578 176 590 196 598 216 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5"/>
        `;
    }

    if (styleKey.includes("long head spines")) {
        if (layer !== "front") {
            return "";
        }

        return `
            <path d="M512 150 L496 82 L528 150 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="4"/>
            <path d="M480 170 L452 105 L500 166 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="4"/>
            <path d="M544 170 L572 105 L524 166 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="4"/>
            <path d="M512 205 L490 155 L534 205 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="4"/>
        `;
    }

    if (styleKey.includes("short head spines") || styleKey.includes("spined crest")) {
        if (layer !== "front") {
            return "";
        }

        return `
            <path d="M512 160 L500 120 L524 160 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="3"/>
            <path d="M482 180 L468 143 L501 176 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="3"/>
            <path d="M542 180 L556 143 L523 176 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="3"/>
        `;
    }

    if (styleKey.includes("bone crest") || styleKey.includes("scaled crest")) {
        if (layer !== "front") {
            return "";
        }

        return `
            <path d="M512 145 C495 190 494 236 512 282 C530 236 529 190 512 145 Z" fill="${detailColour}" stroke="#3f2412" stroke-width="5" opacity="0.92"/>
        `;
    }

    return "";
}

function createDragonbornScaleMarks() {
    const scalePositions = [
        [430, 306],
        [474, 294],
        [518, 292],
        [562, 298],
        [600, 318],
        [442, 376],
        [484, 390],
        [528, 390],
        [572, 378],
        [466, 455],
        [512, 466],
        [558, 455]
    ];

    return scalePositions
        .map(([cx, cy]) => {
            return `<circle cx="${cx}" cy="${cy}" r="13" fill="#000000" opacity="0.14" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>`;
        })
        .join("");
}

function createAppearanceLines(character, speciesKey) {
    if (speciesKey === "dragonborn") {
        return [
            `Scales: ${character.skinTone}`,
            `Eyes: ${character.eyeColour}`,
            `Head: ${character.hairStyle}`
        ];
    }

    return [
        `Hair: ${character.hairColour}`,
        `Eyes: ${character.eyeColour}`,
        `Skin: ${character.skinTone}`
    ];
}

function createEmergencyDemoPortrait(error) {
    const message = error?.message || "Unknown fallback error";

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${defaultImageSize}" height="${defaultImageSize}" viewBox="0 0 ${defaultImageSize} ${defaultImageSize}">
    <rect width="${defaultImageSize}" height="${defaultImageSize}" fill="#120c08"/>
    <circle cx="512" cy="330" r="170" fill="#d6a84f" opacity="0.18"/>
    <text x="512" y="300" text-anchor="middle" fill="#f7ead8" font-size="48" font-family="Georgia, serif" font-weight="700">
        Dicebound
    </text>
    <text x="512" y="360" text-anchor="middle" fill="#f4d9a9" font-size="30" font-family="Arial, sans-serif">
        Demo Portrait Fallback
    </text>
    <text x="512" y="430" text-anchor="middle" fill="#cbd5e1" font-size="22" font-family="Arial, sans-serif">
        ${escapeSvgText(message)}
    </text>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getSpeciesName(species) {
    if (typeof species === "string") {
        return species;
    }

    return species?.name || "Unknown Species";
}

function getNotableFeatureName(notableFeature) {
    if (typeof notableFeature === "string") {
        return notableFeature;
    }

    return notableFeature?.name || "No notable feature";
}

function getInitials(name) {
    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "A";
}

function splitTextIntoLines(text, maxLength, maxLines) {
    const words = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const lines = [];
    let currentLine = "";

    words.forEach(word => {
        const possibleLine = currentLine ? `${currentLine} ${word}` : word;

        if (possibleLine.length <= maxLength) {
            currentLine = possibleLine;
            return;
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        currentLine = word;
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length > maxLines) {
        const trimmedLines = lines.slice(0, maxLines);
        trimmedLines[maxLines - 1] = `${trimmedLines[maxLines - 1].replace(/\.+$/, "")}...`;

        return trimmedLines;
    }

    return lines;
}

function createSvgTextLines(
    lines,
    x,
    y,
    lineHeight,
    fill,
    fontSize,
    fontFamily,
    fontWeight,
    anchor = "middle"
) {
    return lines
        .map((line, index) => {
            return `
                <text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}">
                    ${escapeSvgText(line)}
                </text>
            `;
        })
        .join("");
}

function getClassAccent(className) {
    return getMappedColour(
        colourMaps.classAccents,
        className,
        defaultAccentColour
    );
}

function getSkinColour(skinTone) {
    return getMappedColour(
        colourMaps.skin,
        skinTone,
        defaultSkinColour
    );
}

function getHairColour(hairColour) {
    return getMappedColour(
        colourMaps.hair,
        hairColour,
        defaultHairColour
    );
}

function getEyeColour(eyeColour) {
    return getMappedColour(
        colourMaps.eyes,
        eyeColour,
        defaultEyeColour
    );
}

function getMappedColour(map, value, fallback) {
    return map[normaliseKey(value)] || fallback;
}

function normaliseKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ");
}

function escapeSvgText(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

module.exports = {
    createDemoPortrait
};