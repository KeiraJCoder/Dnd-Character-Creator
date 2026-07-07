/* =========================================================
    Dicebound
    Portrait Provider Selector
    ---------------------------------------------------------
    This file decides which portrait provider the backend should
    use.

    Supported providers:
    - cloudflare: real image generation through Cloudflare Workers AI
    - demo: local SVG fallback portrait generation

    IMAGE_PROVIDER can be:
    - "cloudflare"
    - "demo"
    - "auto"

    In auto mode, Cloudflare is used when valid Cloudflare
    credentials are present. Otherwise the server falls back to
    demo mode.

    OpenAI is intentionally not supported in this project to avoid
    paid image generation costs.
   ========================================================= */

const dotenv = require("dotenv");

dotenv.config();

const allowedProviders = [
    "auto",
    "openai",
    "cloudflare",
    "demo"
];

const requestedProvider = normaliseProvider(process.env.IMAGE_PROVIDER || "auto");

const openaiApiKey = cleanSecret(process.env.OPENAI_API_KEY);
const openaiImageModel = cleanSecret(process.env.OPENAI_IMAGE_MODEL) || "gpt-image-1-mini";
const openaiImageQuality = cleanSecret(process.env.OPENAI_IMAGE_QUALITY) || "low";
const openaiImageSize = cleanSecret(process.env.OPENAI_IMAGE_SIZE) || "1024x1024";
const openaiImageFormat = cleanSecret(process.env.OPENAI_IMAGE_FORMAT) || "png";
const openaiImageModeration = cleanSecret(process.env.OPENAI_IMAGE_MODERATION) || "auto";

const cloudflareAccountId = cleanSecret(process.env.CLOUDFLARE_ACCOUNT_ID);
const cloudflareApiToken = cleanSecret(process.env.CLOUDFLARE_API_TOKEN);

function cleanSecret(value) {
    return String(value || "").trim();
}

function normaliseProvider(provider) {
    const cleanedProvider = String(provider || "")
        .trim()
        .toLowerCase();

    return allowedProviders.includes(cleanedProvider)
        ? cleanedProvider
        : "auto";
}

function looksLikePlaceholder(value) {
    const cleanedValue = String(value || "")
        .trim()
        .toLowerCase();

    return (
        !cleanedValue ||
        cleanedValue.includes("your_") ||
        cleanedValue.includes("replace_") ||
        cleanedValue.includes("example") ||
        cleanedValue.includes("placeholder")
    );
}

function hasOpenAiCredentials() {
    return !looksLikePlaceholder(openaiApiKey);
}

function hasCloudflareCredentials() {
    return (
        !looksLikePlaceholder(cloudflareAccountId) &&
        !looksLikePlaceholder(cloudflareApiToken)
    );
}

function getActiveProvider() {
    if (requestedProvider === "demo") {
        return "demo";
    }

    if (requestedProvider === "openai") {
        return hasOpenAiCredentials()
            ? "openai"
            : "demo";
    }

    if (requestedProvider === "cloudflare") {
        return hasCloudflareCredentials()
            ? "cloudflare"
            : "demo";
    }

    if (hasOpenAiCredentials()) {
        return "openai";
    }

    if (hasCloudflareCredentials()) {
        return "cloudflare";
    }

    return "demo";
}

function getProviderStatus() {
    return {
        requestedProvider,
        activeProvider: getActiveProvider(),

        openAiConnected: hasOpenAiCredentials(),
        openaiImageModel,
        openaiImageQuality,
        openaiImageSize,
        openaiImageFormat,

        cloudflareConnected: hasCloudflareCredentials(),

        demoAvailable: true
    };
}

module.exports = {
    imageProvider: requestedProvider,
    requestedProvider,

    openaiApiKey,
    openaiImageModel,
    openaiImageQuality,
    openaiImageSize,
    openaiImageFormat,
    openaiImageModeration,
    hasOpenAiCredentials,

    cloudflareAccountId,
    cloudflareApiToken,
    hasCloudflareCredentials,

    getActiveProvider,
    getProviderStatus
};