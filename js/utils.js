/* =========================================================
    Dicebound
    Utility Helpers
    ---------------------------------------------------------
    This file stores small shared frontend helper functions.

    Responsibilities:
    - array checks and random selection
    - dice rolling and ability modifier formatting
    - safe text formatting
    - simple DOM helpers
    - select field helpers
    - file/image helper functions
    - clipboard copying
    - shared character display helpers used by UI, export and
      profile modules

    This file should stay generic. It should not contain species
    anatomy rules, portrait prompt logic, data loading, character
    creation rules or question scoring logic.
   ========================================================= */


/* =========================================================
    1. Array And Random Helpers
   ========================================================= */

export function hasItems(value) {
    return Array.isArray(value) && value.length > 0;
}

export function getRandomItem(items) {
    if (!hasItems(items)) {
        return null;
    }

    return items[Math.floor(Math.random() * items.length)];
}

export function shuffleArray(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        const temporaryItem = shuffled[index];
        shuffled[index] = shuffled[randomIndex];
        shuffled[randomIndex] = temporaryItem;
    }

    return shuffled;
}

export function getRandomSelectValue(selectElement) {
    if (!selectElement) {
        return "";
    }

    const validOptions = Array.from(selectElement.options)
        .map(option => option.value)
        .filter(value => String(value || "").trim().length > 0);

    return getRandomItem(validOptions) || "";
}


/* =========================================================
    2. Dice And Ability Score Helpers
   ========================================================= */

export function rollDie(sides) {
    const dieSides = Number(sides);

    if (!Number.isInteger(dieSides) || dieSides <= 0) {
        return 1;
    }

    return Math.floor(Math.random() * dieSides) + 1;
}

export function rollAbilityScore() {
    const rolls = [
        rollDie(6),
        rollDie(6),
        rollDie(6),
        rollDie(6)
    ];

    rolls.sort((a, b) => {
        return b - a;
    });

    return rolls[0] + rolls[1] + rolls[2];
}

export function getModifier(score) {
    return Math.floor((Number(score) - 10) / 2);
}

export function formatModifier(modifier) {
    const value = Number(modifier) || 0;

    return value >= 0
        ? `+${value}`
        : `${value}`;
}


/* =========================================================
    3. Text Formatting Helpers
   ========================================================= */

export function normaliseText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

export function normaliseKey(value) {
    return normaliseText(value).replace(/[^a-z0-9]/g, "");
}

export function capitalise(word) {
    const value = String(word || "").trim();

    if (!value) {
        return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toTitleCase(text) {
    return String(text || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => {
            return word
                .split("-")
                .map(part => {
                    return part.charAt(0).toUpperCase() + part.slice(1);
                })
                .join("-");
        })
        .join(" ");
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function escapeSvgText(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}


/* =========================================================
    4. Shared Character Display Helpers
   ========================================================= */

export function getSpeciesName(characterOrSpecies) {
    if (typeof characterOrSpecies === "string") {
        return characterOrSpecies;
    }

    if (typeof characterOrSpecies?.species === "string") {
        return characterOrSpecies.species;
    }

    return (
        characterOrSpecies?.species?.name ||
        characterOrSpecies?.name ||
        "Unknown Species"
    );
}

export function isSpecies(characterOrSpecies, speciesName) {
    return normaliseKey(getSpeciesName(characterOrSpecies)) === normaliseKey(speciesName);
}

export function isDragonborn(characterOrSpecies) {
    return isSpecies(characterOrSpecies, "Dragonborn");
}

export function getNotableFeatureName(characterOrFeature, fallback = "No Obvious Unusual Feature") {
    if (!characterOrFeature) {
        return fallback;
    }

    if (typeof characterOrFeature === "string") {
        return characterOrFeature || fallback;
    }

    if (typeof characterOrFeature.notableFeature === "string") {
        return characterOrFeature.notableFeature || fallback;
    }

    return (
        characterOrFeature.notableFeature?.name ||
        characterOrFeature.notableFeatureName ||
        characterOrFeature.name ||
        fallback
    );
}

export function getAppearanceLabels(characterOrSpecies) {
    if (isDragonborn(characterOrSpecies)) {
        return {
            skin: "Scale Colour",
            hair: "Head, Horn Or Crest Colour",
            hairStyle: "Head Style"
        };
    }

    return {
        skin: "Skin",
        hair: "Hair",
        hairStyle: "Hair Style"
    };
}


/* =========================================================
    5. DOM Helper Functions
   ========================================================= */

export function setText(element, value) {
    if (element) {
        element.textContent = value ?? "";
    }
}

export function clearElement(element) {
    if (element) {
        element.innerHTML = "";
    }
}

export function showElement(element) {
    if (element) {
        element.classList.remove("hidden");
    }
}

export function hideElement(element) {
    if (element) {
        element.classList.add("hidden");
    }
}

export function setSelectValue(selectElement, value) {
    if (!selectElement) {
        return;
    }

    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
        selectElement.value = "";
        return;
    }

    const existingOption = Array.from(selectElement.options)
        .find(option => {
            return normaliseKey(option.value) === normaliseKey(cleanValue);
        });

    if (existingOption) {
        selectElement.value = existingOption.value;
        return;
    }

    const newOption = document.createElement("option");

    newOption.value = cleanValue;
    newOption.textContent = cleanValue;

    selectElement.appendChild(newOption);
    selectElement.value = cleanValue;
}


/* =========================================================
    6. File And Image Helpers
   ========================================================= */

export function createSafeFileName(name, extension) {
    const safeName = String(name || "dicebound-character")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const safeExtension = String(extension || "png")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "png";

    return `${safeName || "dicebound-character"}.${safeExtension}`;
}

export function getImageExtensionFromDataUrl(dataUrl) {
    if (typeof dataUrl !== "string") {
        return "png";
    }

    if (dataUrl.startsWith("data:image/jpeg")) {
        return "jpg";
    }

    if (dataUrl.startsWith("data:image/jpg")) {
        return "jpg";
    }

    if (dataUrl.startsWith("data:image/webp")) {
        return "webp";
    }

    if (dataUrl.startsWith("data:image/svg+xml")) {
        return "svg";
    }

    return "png";
}


/* =========================================================
    7. Clipboard Helper
   ========================================================= */

export async function copyTextToClipboard(text) {
    if (!text) {
        return false;
    }

    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const textArea = document.createElement("textarea");

    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";

    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const success = document.execCommand("copy");

    document.body.removeChild(textArea);

    return success;
}