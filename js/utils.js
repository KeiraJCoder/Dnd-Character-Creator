/* =========================================================
    Dicebound
    Utility Helpers
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
        .filter(value => value.length > 0);

    return getRandomItem(validOptions) || "";
}


/* =========================================================
    2. Dice And Ability Score Helpers
     ========================================================= */

export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

export function rollAbilityScore() {
    const rolls = [
        rollDie(6),
        rollDie(6),
        rollDie(6),
        rollDie(6)
    ];

    rolls.sort((a, b) => b - a);

    return rolls[0] + rolls[1] + rolls[2];
}

export function getModifier(score) {
    return Math.floor((score - 10) / 2);
}

export function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}


/* =========================================================
    3. Text Formatting Helpers
     ========================================================= */

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
        .split(" ")
        .filter(word => word.length > 0)
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


/* =========================================================
    4. DOM Helper Functions
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
        .find(option => option.value === cleanValue);

    if (existingOption) {
        selectElement.value = cleanValue;
        return;
    }

    const newOption = document.createElement("option");
    newOption.value = cleanValue;
    newOption.textContent = cleanValue;

    selectElement.appendChild(newOption);
    selectElement.value = cleanValue;
}


/* =========================================================
    5. File And Image Helpers
     ========================================================= */

export function createSafeFileName(name, extension) {
    const safeName = String(name || "dicebound-character")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `${safeName || "dicebound-character"}.${extension}`;
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
    6. Clipboard Helper
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