/* =========================================================
    Dicebound
    Cloudflare Portrait Generation Service
    ---------------------------------------------------------
    This file contains the Cloudflare-specific image generation
    logic for Dicebound.

    Responsibilities:
    - build the Cloudflare image request
    - send the prompt to Cloudflare Workers AI
    - read Cloudflare image or JSON responses
    - return a consistent image object to the server route

    This file should not contain species anatomy rules, class
    prompt rules, notable feature wording or general prompt
    construction logic. Those belong in promptBuilder.js and
    speciesPromptService.js.

    OpenAI is intentionally not handled here.
   ========================================================= */

const {
    cloudflareAccountId,
    cloudflareApiToken
} = require("./providerSelector");

const {
    buildCloudflarePrompt,
    buildDynamicNegativePrompt
} = require("./promptBuilder");

const cloudflareModel = "@cf/black-forest-labs/flux-1-schnell";
const cloudflareSteps = 8;
const defaultImageMimeType = "image/jpeg";

async function generateWithCloudflare(character) {
    validateCloudflareRequest(character);

    const prompt = buildCloudflarePrompt(character);
    const negativePrompt = buildDynamicNegativePrompt(character);
    const url = buildCloudflareUrl();
    const body = buildCloudflareRequestBody(prompt, negativePrompt);

    console.log("Cloudflare prompt length:", prompt.length);
    console.log("Cloudflare negative prompt length:", negativePrompt.length);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    return parseCloudflareResponse(response, prompt, negativePrompt);
}

function validateCloudflareRequest(character) {
    if (!character) {
        throw new Error("No character data was provided for Cloudflare portrait generation.");
    }

    if (!cloudflareAccountId || !cloudflareApiToken) {
        throw new Error("Cloudflare credentials are not configured.");
    }

    if (typeof fetch !== "function") {
        throw new Error("Fetch is not available. Use Node 18+ or add a fetch polyfill.");
    }
}

function buildCloudflareUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${cloudflareModel}`;
}

function buildCloudflareRequestBody(prompt, negativePrompt) {
    return {
        prompt,
        negative_prompt: negativePrompt,
        steps: cloudflareSteps,
        seed: createRandomSeed()
    };
}

function createRandomSeed() {
    return Math.floor(Math.random() * 1000000);
}

async function parseCloudflareResponse(response, prompt, negativePrompt) {
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Cloudflare image generation failed. Status: ${response.status}. ${errorText}`
        );
    }

    if (contentType.includes("application/json")) {
        const json = await response.json();
        const imageUrl = extractImageUrlFromCloudflareJson(json);

        if (!imageUrl) {
            throw new Error("Cloudflare returned JSON, but no image data was found.");
        }

        return createCloudflareResult(imageUrl, prompt, negativePrompt);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const mimeType = contentType.includes("image/")
        ? contentType
        : defaultImageMimeType;

    return createCloudflareResult(
        `data:${mimeType};base64,${imageBase64}`,
        prompt,
        negativePrompt
    );
}

function extractImageUrlFromCloudflareJson(json) {
    const possibleImageValues = [
        json?.result,
        json?.result?.image,
        json?.result?.image_b64,
        json?.image,
        json?.image_b64
    ];

    const imageBase64 = possibleImageValues.find(value => {
        return typeof value === "string" && value.trim();
    });

    if (!imageBase64) {
        return null;
    }

    if (imageBase64.startsWith("data:image/")) {
        return imageBase64;
    }

    return `data:${defaultImageMimeType};base64,${imageBase64}`;
}

function createCloudflareResult(imageUrl, prompt, negativePrompt) {
    return {
        imageUrl,
        provider: "cloudflare",
        demoMode: false,
        prompt,
        negativePrompt
    };
}

module.exports = {
    generateWithCloudflare
};