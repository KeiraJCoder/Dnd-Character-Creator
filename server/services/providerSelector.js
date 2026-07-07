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
    "cloudflare",
    "demo"
];

const requestedProvider = normaliseProvider(
    process.env.IMAGE_PROVIDER || "auto"
);

const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;

const hasCloudflareCredentials =
    Boolean(cloudflareAccountId) &&
    Boolean(cloudflareApiToken) &&
    cloudflareAccountId !== "paste_your_account_id_here" &&
    cloudflareApiToken !== "paste_your_cloudflare_api_token_here";

function normaliseProvider(provider) {
    const normalisedProvider = String(provider)
        .trim()
        .toLowerCase();

    if (allowedProviders.includes(normalisedProvider)) {
        return normalisedProvider;
    }

    return "auto";
}

function getActiveProvider() {
    if (requestedProvider === "demo") {
        return "demo";
    }

    if (requestedProvider === "cloudflare") {
        return hasCloudflareCredentials
            ? "cloudflare"
            : "demo";
    }

    if (hasCloudflareCredentials) {
        return "cloudflare";
    }

    return "demo";
}

function getProviderStatus() {
    const activeProvider = getActiveProvider();

    return {
        requestedProvider,
        activeProvider,
        cloudflareConnected: hasCloudflareCredentials,
        mode: activeProvider
    };
}

module.exports = {
    imageProvider: requestedProvider,
    requestedProvider,
    cloudflareAccountId,
    cloudflareApiToken,
    hasCloudflareCredentials,
    getActiveProvider,
    getProviderStatus
};