/* =========================================================
    Dicebound
    Export And Printable Character Sheet
     ========================================================= */

import {
    abilities
} from "./config.js";

import {
    state
} from "./state.js";

import {
    copyTextToClipboard,
    createSafeFileName,
    escapeHtml,
    formatModifier,
    getImageExtensionFromDataUrl,
    getModifier,
    setText
} from "./utils.js";


/* =========================================================
    1. DOM References
     ========================================================= */

export const exportElements = {
    copyCharacterSummaryButton: document.getElementById("copyCharacterSummaryButton"),
    copyPortraitPromptButton: document.getElementById("copyPortraitPromptButton"),
    downloadPortraitButton: document.getElementById("downloadPortraitButton"),
    printCharacterSheetButton: document.getElementById("printCharacterSheetButton"),
    exportStatus: document.getElementById("exportStatus"),

    printableCharacterSheet: document.getElementById("printableCharacterSheet"),
    printName: document.getElementById("printName"),
    printSubtitle: document.getElementById("printSubtitle"),
    printPortrait: document.getElementById("printPortrait"),
    printSpecies: document.getElementById("printSpecies"),
    printClass: document.getElementById("printClass"),
    printGender: document.getElementById("printGender"),
    printPortraitPresentation: document.getElementById("printPortraitPresentation"),
    printAgeRange: document.getElementById("printAgeRange"),
    printHeight: document.getElementById("printHeight"),
    printBuild: document.getElementById("printBuild"),
    printEyes: document.getElementById("printEyes"),
    printHair: document.getElementById("printHair"),
    printHairStyle: document.getElementById("printHairStyle"),
    printSkin: document.getElementById("printSkin"),
    printFeature: document.getElementById("printFeature"),
    printHP: document.getElementById("printHP"),
    printWeapon: document.getElementById("printWeapon"),
    printSkills: document.getElementById("printSkills"),
    printSaves: document.getElementById("printSaves"),
    printStatsGrid: document.getElementById("printStatsGrid"),
    printIdentity: document.getElementById("printIdentity"),
    printTraits: document.getElementById("printTraits"),
    printAlignment: document.getElementById("printAlignment"),
    printFaith: document.getElementById("printFaith"),
    printWeakness: document.getElementById("printWeakness"),
    printPlaystyle: document.getElementById("printPlaystyle"),
    printSpeciesBackground: document.getElementById("printSpeciesBackground"),

    characterPortrait: document.getElementById("characterPortrait"),
    profileTitle: document.getElementById("profileTitle")
};

const {
    exportStatus,

    printableCharacterSheet,
    printName,
    printSubtitle,
    printPortrait,
    printSpecies,
    printClass,
    printGender,
    printPortraitPresentation,
    printAgeRange,
    printHeight,
    printBuild,
    printEyes,
    printHair,
    printHairStyle,
    printSkin,
    printFeature,
    printHP,
    printWeapon,
    printSkills,
    printSaves,
    printStatsGrid,
    printIdentity,
    printTraits,
    printAlignment,
    printFaith,
    printWeakness,
    printPlaystyle,
    printSpeciesBackground,

    characterPortrait,
    profileTitle
} = exportElements;


/* =========================================================
    2. Export Status
     ========================================================= */

export function setExportStatus(message) {
    if (exportStatus) {
        exportStatus.textContent = message || "";
    }
}


/* =========================================================
    3. Printable Portrait Helpers
     ========================================================= */

export function createPrintableFallbackPortrait() {
    const character = state.character;

    if (!character) {
        return "";
    }

    const initial = escapeHtml(character.name.charAt(0).toUpperCase());
    const name = escapeHtml(character.name);
    const subtitle = escapeHtml(`${character.species.name} ${character.className}`);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1b120c"/>
            <stop offset="50%" stop-color="#3f2412"/>
            <stop offset="100%" stop-color="#0e0a06"/>
        </linearGradient>
    </defs>

    <rect width="800" height="800" fill="url(#bg)"/>

    <circle cx="400" cy="285" r="120" fill="#d6a84f" opacity="0.16"/>
    <circle cx="400" cy="285" r="95" fill="#0e0a06" stroke="#d6a84f" stroke-width="4"/>

    <text x="400" y="325" text-anchor="middle" fill="#d6a84f" font-size="110" font-family="Georgia, serif" font-weight="700">${initial}</text>

    <text x="400" y="530" text-anchor="middle" fill="#f7ead8" font-size="44" font-family="Georgia, serif" font-weight="700">${name}</text>
    <text x="400" y="590" text-anchor="middle" fill="#f4d9a9" font-size="30" font-family="Arial, sans-serif" font-weight="700">${subtitle}</text>

    <text x="400" y="700" text-anchor="middle" fill="#dbc59d" font-size="22" font-family="Arial, sans-serif">
        Generate a portrait to include artwork here
    </text>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getPortraitForExport() {
    if (state.character?.portraitUrl) {
        return state.character.portraitUrl;
    }

    if (
        characterPortrait &&
        characterPortrait.src &&
        !characterPortrait.classList.contains("hidden")
    ) {
        return characterPortrait.src;
    }

    return createPrintableFallbackPortrait();
}


/* =========================================================
    4. Printable Character Sheet
     ========================================================= */

export function populatePrintableCharacterSheet() {
    const character = state.character;

    if (!character || !printableCharacterSheet) {
        return;
    }

    const profile = character.generatedProfile || {};

    setText(printName, character.name);
    setText(printSubtitle, `Level 1 ${character.species.name} ${character.className}`);

    if (printPortrait) {
        printPortrait.src = getPortraitForExport();
    }

    setText(printSpecies, character.species.name);
    setText(printClass, `Level 1 ${character.className}`);
    setText(printGender, character.gender);
    setText(printPortraitPresentation, character.portraitPresentation || character.gender || "");
    setText(printAgeRange, character.ageRange);
    setText(printHeight, character.height);
    setText(printBuild, character.build);
    setText(printEyes, character.eyeColour);
    setText(printHair, character.hairColour);
    setText(printHairStyle, character.hairStyle || "");
    setText(printSkin, character.skinTone);
    setText(printFeature, character.notableFeature);

    setText(printHP, character.hp);

    setText(
        printWeapon,
        `${character.weapon.name}, ${character.weapon.damage}, uses ${character.weapon.ability}`
    );

    setText(printSkills, character.classInfo.skills.join(", "));
    setText(printSaves, character.classInfo.saves.join(", "));

    if (printStatsGrid) {
        printStatsGrid.innerHTML = "";

        abilities.forEach(ability => {
            const score = character.stats[ability];
            const modifier = getModifier(score);

            const stat = document.createElement("div");
            stat.className = "print-stat";

            stat.innerHTML = `
                <strong>${escapeHtml(ability)}</strong>
                <span>Score ${escapeHtml(String(score))}</span>
                <span>Mod ${escapeHtml(formatModifier(modifier))}</span>
            `;

            printStatsGrid.appendChild(stat);
        });
    }

    setText(printIdentity, profile.identityText || "");
    setText(printTraits, profile.traits ? profile.traits.join(", ") : "");
    setText(printAlignment, profile.alignment || "");
    setText(printFaith, profile.faithProfile || "");
    setText(printWeakness, profile.weakness || "");
    setText(printPlaystyle, profile.playstyle || "");
    setText(printSpeciesBackground, profile.speciesProfileText || "");
}


/* =========================================================
    5. Character Summary Text
     ========================================================= */

export function buildCharacterSummaryText() {
    const character = state.character;

    if (!character) {
        return "";
    }

    const profile = character.generatedProfile || {};
    const title = profileTitle?.textContent || `${character.name}, ${character.species.name} ${character.className}`;
    const portraitPresentation = character.portraitPresentation || character.gender || "";

    return `
DICEBOUND CHARACTER SUMMARY

Name: ${character.name}
Species: ${character.species.name}
Class: Level 1 ${character.className}
Gender: ${character.gender}
Portrait Presentation: ${portraitPresentation}
Age Range: ${character.ageRange}

APPEARANCE
Height: ${character.height}
Build: ${character.build}
Eyes: ${character.eyeColour}
Hair: ${character.hairColour}
Hair Style: ${character.hairStyle || ""}
Skin: ${character.skinTone}
Notable Feature: ${character.notableFeature}

COMBAT BASICS
Hit Points: ${character.hp}
Weapon: ${character.weapon.name}, ${character.weapon.damage}, uses ${character.weapon.ability}
Skill Proficiencies: ${character.classInfo.skills.join(", ")}
Saving Throws: ${character.classInfo.saves.join(", ")}

ABILITY SCORES
${abilities.map(ability => {
    const score = character.stats[ability];
    return `${ability}: ${score} (${formatModifier(getModifier(score))})`;
}).join("\n")}

CHARACTER PROFILE
Title: ${title}
Core Traits: ${profile.traits ? profile.traits.join(", ") : ""}
Moral Alignment: ${profile.alignment || ""}
Religious Outlook: ${profile.faithProfile || ""}
Weakness: ${profile.weakness || ""}
Roleplay Style: ${profile.playstyle || ""}

CHARACTER IDENTITY
${profile.identityText || ""}

SPECIES BACKGROUND
${profile.speciesProfileText || ""}
    `.trim();
}


/* =========================================================
    6. Copy Tools
     ========================================================= */

export async function copyCharacterSummary() {
    if (!state.character) {
        setExportStatus("Create a character first.");
        return;
    }

    try {
        const copied = await copyTextToClipboard(buildCharacterSummaryText());

        setExportStatus(
            copied
                ? "Character summary copied."
                : "Could not copy character summary."
        );
    } catch (error) {
        console.error("Copy character summary failed.", error);
        setExportStatus("Could not copy character summary.");
    }
}

export async function copyPortraitPrompt() {
    if (!state.character) {
        setExportStatus("Create a character first.");
        return;
    }

    if (!state.character.portraitPrompt) {
        setExportStatus("Generate a portrait first, then copy the prompt.");
        return;
    }

    try {
        const copied = await copyTextToClipboard(state.character.portraitPrompt);

        setExportStatus(
            copied
                ? "Portrait prompt copied."
                : "Could not copy portrait prompt."
        );
    } catch (error) {
        console.error("Copy portrait prompt failed.", error);
        setExportStatus("Could not copy portrait prompt.");
    }
}


/* =========================================================
    7. Download And Print Tools
     ========================================================= */

export function downloadPortrait() {
    const character = state.character;

    if (!character) {
        setExportStatus("Create a character first.");
        return;
    }

    if (!character.portraitUrl) {
        setExportStatus("Generate a portrait first, then download it.");
        return;
    }

    const extension = getImageExtensionFromDataUrl(character.portraitUrl);
    const link = document.createElement("a");

    link.href = character.portraitUrl;
    link.download = createSafeFileName(character.name, extension);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportStatus("Portrait download started.");
}

export function printCharacterSheet() {
    if (!state.character) {
        setExportStatus("Create a character first.");
        return;
    }

    populatePrintableCharacterSheet();

    setExportStatus("Print view opened. Choose Save as PDF to export.");

    setTimeout(() => {
        window.print();
    }, 150);
}