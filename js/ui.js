/* =========================================================
    Dicebound
    User Interface And Screen Rendering
   ========================================================= */

import {
    abilities,
    portraitApiUrl
} from "./config.js";

import {
    state,
    resetCharacterProgress
} from "./state.js";

import {
    escapeHtml,
    formatModifier,
    getModifier,
    hideElement,
    setText,
    showElement
} from "./utils.js";

import {
    clearCharacterForm,
    updateBeginButton
} from "./character.js";

import {
    createGeneratedProfile
} from "./profile.js";


/* =========================================================
    1. DOM References
   ========================================================= */

export const uiElements = {
    creatorScreen: document.getElementById("creatorScreen"),
    questionScreen: document.getElementById("questionScreen"),
    summaryScreen: document.getElementById("summaryScreen"),

    sheetName: document.getElementById("sheetName"),
    sheetClass: document.getElementById("sheetClass"),
    sheetSpecies: document.getElementById("sheetSpecies"),
    sheetAppearance: document.getElementById("sheetAppearance"),
    sheetHP: document.getElementById("sheetHP"),
    sheetWeapon: document.getElementById("sheetWeapon"),
    sheetSkills: document.getElementById("sheetSkills"),
    sheetSaves: document.getElementById("sheetSaves"),
    statsGrid: document.getElementById("statsGrid"),

    portraitInitial: document.getElementById("portraitInitial"),
    characterPortrait: document.getElementById("characterPortrait"),
    generatePortraitButton: document.getElementById("generatePortraitButton"),
    portraitStatus: document.getElementById("portraitStatus"),

    profileTitle: document.getElementById("profileTitle"),
    profileIdentity: document.getElementById("profileIdentity"),
    profileSpecies: document.getElementById("profileSpecies"),
    profileTraits: document.getElementById("profileTraits"),
    profileAlignment: document.getElementById("profileAlignment"),
    profileFaith: document.getElementById("profileFaith"),
    profileWeakness: document.getElementById("profileWeakness"),
    profilePlaystyle: document.getElementById("profilePlaystyle"),

    restartButton: document.getElementById("restartButton")
    };

    const {
    creatorScreen,
    questionScreen,
    summaryScreen,

    sheetName,
    sheetClass,
    sheetSpecies,
    sheetAppearance,
    sheetHP,
    sheetWeapon,
    sheetSkills,
    sheetSaves,
    statsGrid,

    portraitInitial,
    characterPortrait,
    generatePortraitButton,
    portraitStatus,

    profileTitle,
    profileIdentity,
    profileSpecies,
    profileTraits,
    profileAlignment,
    profileFaith,
    profileWeakness,
    profilePlaystyle
    } = uiElements;


    /* =========================================================
    2. Screen Helpers
    ========================================================= */

    export function showCreatorScreen() {
    showElement(creatorScreen);
    hideElement(questionScreen);
    hideElement(summaryScreen);
    }

    export function showQuestionScreen() {
    hideElement(creatorScreen);
    showElement(questionScreen);
    hideElement(summaryScreen);
    }

    export function showSummaryScreen() {
    hideElement(creatorScreen);
    hideElement(questionScreen);
    showElement(summaryScreen);
}


/* =========================================================
    3. Character Sheet Rendering
   ========================================================= */

export function setSheetRow(element, label, value) {
    if (!element) {
        return;
    }

    element.className = "sheet-row";

    element.innerHTML = `
        <span class="sheet-label">${escapeHtml(label)}</span>
        <span class="sheet-value">${escapeHtml(String(value))}</span>
    `;
    }

    export function setAppearanceRow() {
    if (!sheetAppearance || !state.character) {
        return;
    }

    const character = state.character;

    sheetAppearance.className = "sheet-row sheet-appearance-row";

    const appearanceItems = [
        ["Gender", character.gender],
        ["Age", character.ageRange],
        ["Height", character.height],
        ["Build", character.build],
        ["Eyes", character.eyeColour],
        ["Hair", character.hairColour],
        ["Skin", character.skinTone],
        ["Feature", character.notableFeature || "No Obvious Unusual Feature"]
    ];

    const tags = appearanceItems
        .map(([label, value]) => {
        return `
            <span class="sheet-tag">
            <strong>${escapeHtml(label)}</strong>
            ${escapeHtml(String(value))}
            </span>
        `;
        })
        .join("");

    sheetAppearance.innerHTML = `
        <span class="sheet-label">Appearance</span>
        <span class="sheet-value sheet-tags">${tags}</span>
    `;
    }

    export function renderCharacterSheet() {
    if (!state.character) {
        return;
    }

    const character = state.character;

    setText(sheetName, character.name);

    setSheetRow(sheetClass, "Class", `Level 1 ${character.className}`);
    setSheetRow(sheetSpecies, "Species", character.species.name);
    setAppearanceRow();
    setSheetRow(sheetHP, "Hit Points", character.hp);
    setSheetRow(sheetWeapon, "Weapon", `${character.weapon.name}, ${character.weapon.damage}`);

    if (sheetSkills) {
        sheetSkills.className = "sheet-list";
        sheetSkills.textContent = character.classInfo.skills.join(", ");
    }

    if (sheetSaves) {
        sheetSaves.className = "sheet-list";
        sheetSaves.textContent = character.classInfo.saves.join(", ");
    }

    if (!statsGrid) {
        return;
    }

    statsGrid.innerHTML = "";

    abilities.forEach(ability => {
        const score = character.stats[ability];
        const modifier = getModifier(score);

        const stat = document.createElement("div");
        stat.className = "stat";

        stat.innerHTML = `
        <strong>${escapeHtml(ability)}</strong>
        <span>Score ${escapeHtml(String(score))}</span>
        <span>Modifier ${escapeHtml(formatModifier(modifier))}</span>
        `;

        statsGrid.appendChild(stat);
    });
}


/* =========================================================
    4. Portrait Display
   ========================================================= */

    export function resetPortraitDisplay() {
    if (portraitInitial) {
        portraitInitial.classList.remove("hidden");
    }

    if (characterPortrait) {
        characterPortrait.src = "";
        characterPortrait.classList.add("hidden");
    }

    if (portraitStatus) {
        portraitStatus.textContent = "";
    }

    if (generatePortraitButton) {
        generatePortraitButton.disabled = false;
        generatePortraitButton.textContent = "Generate Character Portrait";
    }
    }

    export function showPortraitImage(imageUrl) {
    if (characterPortrait) {
        characterPortrait.src = imageUrl;
        characterPortrait.classList.remove("hidden");
    }

    if (portraitInitial) {
        portraitInitial.classList.add("hidden");
    }
    }

    export async function generateCharacterPortrait(onPortraitGenerated) {
    if (!state.character) {
        return;
    }

    if (!generatePortraitButton || !portraitStatus || !characterPortrait) {
        console.error("Portrait elements are missing from index.html.");
        return;
    }

    generatePortraitButton.disabled = true;
    generatePortraitButton.textContent = "Generating...";
    portraitStatus.textContent = "Generating portrait. This may take a moment.";

    try {
        const response = await fetch(portraitApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            character: state.character
        })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
        throw new Error(data.detail || data.error || "Portrait generation failed.");
        }

        if (!data.imageUrl) {
        throw new Error("No image URL was returned by the server.");
        }

        state.character.portraitUrl = data.imageUrl;
        state.character.portraitPrompt = data.prompt || null;

        showPortraitImage(data.imageUrl);

        if (typeof onPortraitGenerated === "function") {
        onPortraitGenerated();
        }

        portraitStatus.textContent = "Portrait generated.";
        generatePortraitButton.textContent = "Generate Again";
    } catch (error) {
        console.error("Portrait generation failed.", error);
        portraitStatus.textContent = "Could not generate portrait. Check that the server is running.";
        generatePortraitButton.textContent = "Try Again";
    } finally {
        generatePortraitButton.disabled = false;
    }
}


/* =========================================================
    5. Summary Screen Rendering
   ========================================================= */

export function showSummary(onSummaryRendered) {
    if (!state.character) {
        return;
    }

    const generatedProfile = createGeneratedProfile(state.character);

    if (!generatedProfile) {
        return;
    }

    state.character.generatedProfile = generatedProfile;

    showSummaryScreen();

    renderCharacterSheet();
    resetPortraitDisplay();

    if (portraitInitial) {
        portraitInitial.textContent = state.character.name.charAt(0).toUpperCase();
    }

    const firstTrait = generatedProfile.traits[0] || "Adventurous";

    setText(
        profileTitle,
        `${state.character.name}, The ${firstTrait} ${state.character.species.name} ${state.character.className}`
    );

    setText(profileIdentity, generatedProfile.identityText);
    setText(profileSpecies, generatedProfile.speciesProfileText);
    setText(profileTraits, generatedProfile.traits.join(", "));
    setText(profileAlignment, generatedProfile.alignment);
    setText(profileFaith, generatedProfile.faithProfile);
    setText(profileWeakness, generatedProfile.weakness);
    setText(profilePlaystyle, generatedProfile.playstyle);

    if (typeof onSummaryRendered === "function") {
        onSummaryRendered();
    }
}


/* =========================================================
    6. Restart
   ========================================================= */

export function restart(onRestarted) {
    resetCharacterProgress();
    resetPortraitDisplay();
    clearCharacterForm();

    showCreatorScreen();
    updateBeginButton();

    if (typeof onRestarted === "function") {
        onRestarted();
    }
}