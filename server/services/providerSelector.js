const dotenv = require("dotenv");

dotenv.config();

const imageProvider = (process.env.IMAGE_PROVIDER || "auto").toLowerCase();

const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;

const hasCloudflareCredentials =
    Boolean(cloudflareAccountId) &&
    Boolean(cloudflareApiToken) &&
    cloudflareAccountId !== "paste_your_account_id_here" &&
    cloudflareApiToken !== "paste_your_cloudflare_api_token_here";

const hasOpenAiKey =
    Boolean(process.env.OPENAI_API_KEY) &&
    process.env.OPENAI_API_KEY !== "put_your_api_key_here";

function getActiveProvider() {
    if (imageProvider === "cloudflare" && hasCloudflareCredentials) {
        return "cloudflare";
    }

    if (imageProvider === "openai" && hasOpenAiKey) {
        return "openai";
    }

    if (imageProvider === "demo") {
        return "demo";
    }

    if (hasCloudflareCredentials) {
        return "cloudflare";
    }

    if (hasOpenAiKey) {
        return "openai";
    }

    return "demo";
}

function getProviderStatus() {
    const activeProvider = getActiveProvider();

    return {
        requestedProvider: imageProvider,
        activeProvider,
        cloudflareConnected: hasCloudflareCredentials,
        openAiConnected: hasOpenAiKey,
        mode: activeProvider
    };
}

module.exports = {
        imageProvider,
        cloudflareAccountId,
        cloudflareApiToken,
        hasCloudflareCredentials,
        hasOpenAiKey,
        getActiveProvider,
        getProviderStatus
};