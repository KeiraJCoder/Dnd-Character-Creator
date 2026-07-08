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

    const prompt = buildPortraitPrompt(character);
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