const {
    openaiApiKey,
    openaiImageModel,
    openaiImageQuality,
    openaiImageSize,
    openaiImageFormat,
    openaiImageModeration,
    hasOpenAiCredentials
} = require("./providerSelector");

const {
    buildPortraitPrompt,
    buildDynamicNegativePrompt
} = require("./promptBuilder");

const openaiImagesUrl = "https://api.openai.com/v1/images/generations";
const defaultImageMimeType = "image/png";

async function generateWithOpenAI(character) {
    validateOpenAiRequest(character);

    const prompt = buildOpenAiPrompt(character);
    const negativePrompt = buildDynamicNegativePrompt(character);
    const body = buildOpenAiRequestBody(prompt);

    console.log("Generating portrait with OpenAI.");
    console.log(`OpenAI image model: ${openaiImageModel}`);
    console.log(`OpenAI image quality: ${openaiImageQuality}`);
    console.log(`OpenAI prompt length: ${prompt.length}`);
    console.log(`OpenAI avoid-text length: ${negativePrompt.length}`);

    const response = await fetch(openaiImagesUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => {
        return {};
    });

    if (!response.ok) {
        const errorMessage =
            data?.error?.message ||
            data?.message ||
            `OpenAI image request failed with status ${response.status}.`;

        throw new Error(errorMessage);
    }

    const imageUrl = extractImageUrlFromOpenAiResponse(data);

    if (!imageUrl) {
        throw new Error("OpenAI did not return an image.");
    }

    return {
        imageUrl,
        prompt,
        negativePrompt,
        provider: "openai",
        model: openaiImageModel,
        demoMode: false,
        fallback: false,
        fallbackReason: null
    };
}

function validateOpenAiRequest(character) {
    if (!character || typeof character !== "object") {
        throw new Error("A valid character is required for OpenAI portrait generation.");
    }

    if (!hasOpenAiCredentials()) {
        throw new Error("OpenAI API key is missing.");
    }

    if (typeof fetch !== "function") {
        throw new Error("Global fetch is not available. Use Node 18+ or add a fetch polyfill.");
    }
}

function buildOpenAiRequestBody(prompt) {
    return {
        model: openaiImageModel,
        prompt,
        n: 1,
        size: openaiImageSize,
        quality: openaiImageQuality,
        output_format: openaiImageFormat,
        moderation: openaiImageModeration
    };
}

function buildOpenAiPrompt(character) {
    const basePrompt = buildPortraitPrompt(character);
    const negativePrompt = buildDynamicNegativePrompt(character);
    const characterLock = buildCharacterSheetLock(character);

    return [
        "STRICT DICEBOUND CHARACTER PORTRAIT.",
        "Follow the character sheet literally. Selected values are mandatory, not suggestions.",
        "Create one fantasy character bust portrait from head to upper torso.",
        "No text, no logo, no extra characters, no pet, no companion, no mask, no helmet, no crown and no decorative headpiece unless explicitly required by the character sheet.",
        characterLock,
        "MANDATORY SPECIES RULE: species anatomy must match the listed species. Do not drift into elf, tiefling, dragonborn, human or another species unless that is the selected species.",
        "MANDATORY VISIBLE FEATURE RULE: if a notable feature is listed, it must be clearly visible unless the feature is 'No Obvious Unusual Feature'.",
        basePrompt,
        negativePrompt
            ? `AVOID THESE ERRORS: ${negativePrompt}`
            : ""
    ]
        .filter(Boolean)
        .join("\n\n");
}

function buildCharacterSheetLock(character) {
    const speciesName = getSpeciesName(character);
    const notableFeatureName = getNotableFeatureName(character);

    return [
        "CHARACTER SHEET LOCK:",
        `- Species must read as: ${speciesName}.`,
        `- Class visual theme: ${character.className || "Adventurer"}.`,
        `- Gender or portrait presentation must read as: ${character.portraitPresentation || character.gender || "Not specified"}.`,
        `- Age must read as: ${character.ageRange || "Not specified"}.`,
        `- Height impression must read as: ${character.height || "Not specified"}.`,
        `- Body build must read as: ${character.build || "Not specified"}.`,
        `- Eye colour must be: ${character.eyeColour || "Not specified"}.`,
        `- Hair or head-detail colour must be: ${character.hairColour || "Not specified"}.`,
        `- Hair style or head style must be: ${character.hairStyle || "Not specified"}.`,
        `- Skin tone or scale colour must be: ${character.skinTone || "Not specified"}.`,
        `- Visible notable feature must be: ${notableFeatureName}.`
    ].join("\n");
}

function getSpeciesName(character) {
    if (typeof character?.species === "string") {
        return character.species;
    }

    return character?.species?.name || "Unknown Species";
}

function getNotableFeatureName(character) {
    const notableFeature = character?.notableFeature;

    if (typeof notableFeature === "string") {
        return notableFeature || "No Obvious Unusual Feature";
    }

    return (
        notableFeature?.name ||
        character?.notableFeatureName ||
        "No Obvious Unusual Feature"
    );
}

function extractImageUrlFromOpenAiResponse(data) {
    const image = Array.isArray(data?.data)
        ? data.data[0]
        : null;

    const base64Image = image?.b64_json || image?.b64Json || "";

    if (base64Image) {
        return `data:${getMimeType()};base64,${base64Image}`;
    }

    return image?.url || "";
}

function getMimeType() {
    if (openaiImageFormat === "jpeg") {
        return "image/jpeg";
    }

    if (openaiImageFormat === "webp") {
        return "image/webp";
    }

    return defaultImageMimeType;
}

module.exports = {
    generateWithOpenAI
};