/* =========================================================
    Dicebound
    User Interface And Screen Rendering
    ---------------------------------------------------------
    This file handles visible frontend screen updates.

    Responsibilities:
    - switch between creator, question and summary screens
    - render the character summary sheet
    - render generated profile text
    - display generated portraits returned by the backend
    - show a small browser-only fallback portrait if the backend
      server cannot be reached
    - reset visible UI state when restarting

    This file should not create characters, score questions,
    build AI prompts, apply species anatomy rules or duplicate
    backend portrait generation logic.

    The browser-only fallback portrait in this file is deliberately
    simple. The proper demo portrait fallback lives on the backend
    in demoPortraitService.js and is used when the server is running
    but the active image provider fails.
   ========================================================= */

import {
    abilities,
    defaultText,
    portraitApiUrl
} from "./config.js";

import {
    state,
    resetCharacterProgress
} from "./state.js";

import {
    escapeHtml,
    escapeSvgText,
    formatModifier,
    getAppearanceLabels,
    getModifier,
    getNotableFeatureName,
    getSpeciesName,
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
    2. Display Helpers
   ========================================================= */

function getWeaponText(character = state.character) {
    if (!character?.weapon) {
        return "No weapon selected";
    }

    return `${character.weapon.name}, ${character.weapon.damage}`;
}

function getSkillText(character = state.character) {
    const skills = character?.classInfo?.skills;

    return Array.isArray(skills) && skills.length > 0
        ? skills.join(", ")
        : "";
}

function getSaveText(character = state.character) {
    const saves = character?.classInfo?.saves;

    return Array.isArray(saves) && saves.length > 0
        ? saves.join(", ")
        : "";
}

function getProfileTraitsText(profile) {
    return Array.isArray(profile?.traits) && profile.traits.length > 0
        ? profile.traits.join(", ")
        : "";
}

function formatProviderName(provider) {
    if (provider === "openai") {
        return "OpenAI";
    }

    if (provider === "cloudflare") {
        return "Cloudflare";
    }

    if (provider === "demo") {
        return "Demo";
    }

    if (provider === "browser-fallback") {
        return "Browser fallback";
    }

    return "Portrait provider";
}


/* =========================================================
    3. Screen Helpers
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
    4. Character Sheet Rendering
   ========================================================= */

export function setSheetRow(element, label, value) {
    if (!element) {
        return;
    }

    element.className = "sheet-row";

    element.innerHTML = `
        <span class="sheet-label">${escapeHtml(label)}</span>
        <span class="sheet-value">${escapeHtml(String(value || ""))}</span>
    `;
}

export function setAppearanceRow() {
    if (!sheetAppearance || !state.character) {
        return;
    }

    const character = state.character;
    const labels = getAppearanceLabels(character);

    sheetAppearance.className = "sheet-row sheet-appearance-row";

    const appearanceItems = [
        ["Gender", character.gender],
        ["Age", character.ageRange],
        ["Height", character.height],
        ["Build", character.build],
        ["Eyes", character.eyeColour],
        [labels.hair, character.hairColour],
        [labels.hairStyle, character.hairStyle],
        [labels.skin, character.skinTone],
        ["Feature", getNotableFeatureName(character)]
    ];

    const tags = appearanceItems
        .filter(([, value]) => {
            return String(value || "").trim().length > 0;
        })
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
    const speciesName = getSpeciesName(character);

    setText(sheetName, character.name);

    setSheetRow(sheetClass, "Class", `Level 1 ${character.className}`);
    setSheetRow(sheetSpecies, "Species", speciesName);
    setAppearanceRow();
    setSheetRow(sheetHP, "Hit Points", character.hp);
    setSheetRow(sheetWeapon, "Weapon", getWeaponText(character));

    if (sheetSkills) {
        sheetSkills.className = "sheet-list";
        sheetSkills.textContent = getSkillText(character);
    }

    if (sheetSaves) {
        sheetSaves.className = "sheet-list";
        sheetSaves.textContent = getSaveText(character);
    }

    if (!statsGrid) {
        return;
    }

    statsGrid.innerHTML = "";

    abilities.forEach(ability => {
        const score = character.stats?.[ability] || 0;
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
    5. Portrait Request Payload
   ========================================================= */

function createPortraitRequestCharacter(character) {
    if (!character || typeof character !== "object") {
        return character;
    }

    return {
        name: character.name,
        gender: character.gender,
        portraitPresentation: character.portraitPresentation,

        species: createPortraitRequestSpecies(character.species),

        ageRange: character.ageRange,
        height: character.height,
        build: character.build,
        eyeColour: character.eyeColour,
        hairColour: character.hairColour,
        hairStyle: character.hairStyle,
        skinTone: character.skinTone,

        notableFeature: createPortraitRequestNotableFeature(character.notableFeature),
        notableFeatureName: character.notableFeatureName,

        className: character.className,
        classInfo: createPortraitRequestClassInfo(character.classInfo),
        weapon: createPortraitRequestWeapon(character.weapon),
        stats: createPortraitRequestStats(character.stats),
        hp: character.hp,

        generatedProfile: createPortraitRequestProfile(character.generatedProfile)
    };
}

function createPortraitRequestSpecies(species) {
    if (typeof species === "string") {
        return species;
    }

    if (!species || typeof species !== "object") {
        return null;
    }

    return {
        name: species.name,
        description: species.description,
        typicalTraits: Array.isArray(species.typicalTraits)
            ? [...species.typicalTraits]
            : []
    };
}

function createPortraitRequestNotableFeature(notableFeature) {
    if (typeof notableFeature === "string") {
        return notableFeature;
    }

    if (!notableFeature || typeof notableFeature !== "object") {
        return null;
    }

    return {
        name: notableFeature.name,
        allowedSpecies: notableFeature.allowedSpecies,
        category: notableFeature.category,
        visibility: notableFeature.visibility,
        promptInstruction: notableFeature.promptInstruction,
        visibilityInstruction: notableFeature.visibilityInstruction,
        negativePrompt: Array.isArray(notableFeature.negativePrompt)
            ? [...notableFeature.negativePrompt]
            : []
    };
}

function createPortraitRequestClassInfo(classInfo) {
    if (!classInfo || typeof classInfo !== "object") {
        return null;
    }

    return {
        description: classInfo.description,
        hitDie: classInfo.hitDie,
        skills: Array.isArray(classInfo.skills)
            ? [...classInfo.skills]
            : [],
        saves: Array.isArray(classInfo.saves)
            ? [...classInfo.saves]
            : []
    };
}

function createPortraitRequestWeapon(weapon) {
    if (!weapon || typeof weapon !== "object") {
        return null;
    }

    return {
        name: weapon.name,
        damage: weapon.damage,
        ability: weapon.ability
    };
}

function createPortraitRequestStats(stats) {
    if (!stats || typeof stats !== "object") {
        return {};
    }

    return abilities.reduce((cleanStats, ability) => {
        cleanStats[ability] = stats[ability];
        return cleanStats;
    }, {});
}

function createPortraitRequestProfile(profile) {
    if (!profile || typeof profile !== "object") {
        return null;
    }

    return {
        traits: Array.isArray(profile.traits)
            ? [...profile.traits]
            : [],
        alignment: profile.alignment,
        faithProfile: profile.faithProfile,
        weakness: profile.weakness,
        playstyle: profile.playstyle
    };
}


/* =========================================================
    6. Portrait Display
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

    if (state.character) {
        state.character.portraitUrl = null;
        state.character.portraitPrompt = null;
        state.character.portraitNegativePrompt = null;
        state.character.portraitProvider = null;
        state.character.portraitModel = null;
        state.character.portraitDemoMode = false;
        state.character.portraitFallback = false;
        state.character.portraitFallbackReason = null;
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

function createBrowserFallbackPortrait(errorMessage = "") {
    const character = state.character;

    if (!character) {
        return "";
    }

    const characterName = character.name || defaultText.unnamedCharacter;
    const speciesName = getSpeciesName(character);
    const className = character.className || "Adventurer";
    const initial = characterName.charAt(0).toUpperCase() || "A";
    const featureName = getNotableFeatureName(character);
    const labels = getAppearanceLabels(character);

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#120c08"/>
            <stop offset="50%" stop-color="#3f2412"/>
            <stop offset="100%" stop-color="#050505"/>
        </linearGradient>
    </defs>

    <rect width="1024" height="1024" fill="url(#bg)"/>

    <circle cx="512" cy="285" r="185" fill="#d6a84f" opacity="0.16"/>
    <circle cx="512" cy="285" r="140" fill="#0e0a06" stroke="#d6a84f" stroke-width="6"/>

    <text x="512" y="335" text-anchor="middle" fill="#d6a84f" font-size="150" font-family="Georgia, serif" font-weight="700">
        ${escapeSvgText(initial)}
    </text>

    <text x="512" y="530" text-anchor="middle" fill="#f7ead8" font-size="54" font-family="Georgia, serif" font-weight="700">
        ${escapeSvgText(characterName)}
    </text>

    <text x="512" y="592" text-anchor="middle" fill="#f4d9a9" font-size="34" font-family="Arial, sans-serif" font-weight="700">
        ${escapeSvgText(speciesName)} ${escapeSvgText(className)}
    </text>

    <text x="512" y="665" text-anchor="middle" fill="#cbd5e1" font-size="26" font-family="Arial, sans-serif">
        ${escapeSvgText(character.gender || "Unknown")} • ${escapeSvgText(character.ageRange || "Unknown")} • ${escapeSvgText(character.build || "Unknown")}
    </text>

    <text x="512" y="725" text-anchor="middle" fill="#dbc59d" font-size="24" font-family="Arial, sans-serif">
        ${escapeSvgText(labels.skin)}: ${escapeSvgText(character.skinTone || "Unknown")} • Eyes: ${escapeSvgText(character.eyeColour || "Unknown")}
    </text>

    <text x="512" y="765" text-anchor="middle" fill="#dbc59d" font-size="24" font-family="Arial, sans-serif">
        ${escapeSvgText(labels.hairStyle)}: ${escapeSvgText(character.hairStyle || "Unknown")}
    </text>

    <text x="512" y="825" text-anchor="middle" fill="#f4d9a9" font-size="24" font-family="Arial, sans-serif">
        Feature: ${escapeSvgText(featureName)}
    </text>

    <rect x="252" y="875" width="520" height="70" rx="18" fill="#000000" opacity="0.32" stroke="#d6a84f" stroke-opacity="0.45"/>

    <text x="512" y="918" text-anchor="middle" fill="#facc15" font-size="24" font-family="Arial, sans-serif" font-weight="700">
        Browser fallback portrait
    </text>

    <text x="512" y="980" text-anchor="middle" fill="#cbd5e1" font-size="18" font-family="Arial, sans-serif" opacity="0.78">
        ${escapeSvgText(errorMessage)}
    </text>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function storePortraitResult(data) {
    if (!state.character) {
        return;
    }

    state.character.portraitUrl = data.imageUrl;
    state.character.portraitPrompt = data.prompt || null;
    state.character.portraitNegativePrompt = data.negativePrompt || null;
    state.character.portraitProvider = data.provider || null;
    state.character.portraitModel = data.model || null;
    state.character.portraitDemoMode = Boolean(data.demoMode);
    state.character.portraitFallback = Boolean(data.fallback);
    state.character.portraitFallbackReason = data.fallbackReason || null;
}

function getPortraitStatusMessage(data) {
    if (data.fallback) {
        return data.fallbackReason || "The image provider failed, so a demo portrait was created instead.";
    }

    if (data.demoMode) {
        return "Demo portrait generated. Live image generation was not used.";
    }

    if (data.provider === "openai") {
        return "OpenAI portrait generated.";
    }

    if (data.provider === "cloudflare") {
        return "Cloudflare portrait generated.";
    }

    if (data.provider) {
        return `${formatProviderName(data.provider)} portrait generated.`;
    }

    return "Portrait generated.";
}

function getPortraitErrorMessage(response, data) {
    if (response.status === 413) {
        return "Portrait request was too large. Try again after refreshing the page.";
    }

    return (
        data.detail ||
        data.error ||
        data.message ||
        "Portrait generation failed."
    );
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
                character: createPortraitRequestCharacter(state.character)
            })
        });

        const data = await response.json().catch(() => {
            return {};
        });

        if (!response.ok) {
            throw new Error(getPortraitErrorMessage(response, data));
        }

        if (!data.imageUrl) {
            throw new Error("No image URL was returned by the server.");
        }

        storePortraitResult(data);
        showPortraitImage(data.imageUrl);

        if (typeof onPortraitGenerated === "function") {
            onPortraitGenerated();
        }

        portraitStatus.textContent = getPortraitStatusMessage(data);
        generatePortraitButton.textContent = "Generate Again";
    } catch (error) {
        console.error("Portrait generation failed.", error);

        const fallbackUrl = createBrowserFallbackPortrait(
            "The portrait server could not be reached."
        );

        if (state.character) {
            state.character.portraitUrl = fallbackUrl;
            state.character.portraitPrompt = null;
            state.character.portraitNegativePrompt = null;
            state.character.portraitProvider = "browser-fallback";
            state.character.portraitModel = null;
            state.character.portraitDemoMode = true;
            state.character.portraitFallback = true;
            state.character.portraitFallbackReason = error.message;
        }

        showPortraitImage(fallbackUrl);

        if (typeof onPortraitGenerated === "function") {
            onPortraitGenerated();
        }

        portraitStatus.textContent = "Portrait server unavailable. A local browser fallback portrait was created.";
        generatePortraitButton.textContent = "Try Server Again";
    } finally {
        generatePortraitButton.disabled = false;
    }
}


/* =========================================================
    7. Summary Screen Rendering
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
    const speciesName = getSpeciesName(state.character);

    setText(
        profileTitle,
        `${state.character.name}, The ${firstTrait} ${speciesName} ${state.character.className}`
    );

    setText(profileIdentity, generatedProfile.identityText);
    setText(profileSpecies, generatedProfile.speciesProfileText);
    setText(profileTraits, getProfileTraitsText(generatedProfile));
    setText(profileAlignment, generatedProfile.alignment);
    setText(profileFaith, generatedProfile.faithProfile);
    setText(profileWeakness, generatedProfile.weakness);
    setText(profilePlaystyle, generatedProfile.playstyle);

    if (typeof onSummaryRendered === "function") {
        onSummaryRendered();
    }
}


/* =========================================================
    8. Restart
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