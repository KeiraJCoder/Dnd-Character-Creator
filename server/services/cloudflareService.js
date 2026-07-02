const {
    cloudflareAccountId,
    cloudflareApiToken
} = require("./providerSelector");

const {
    buildCloudflarePrompt,
    buildDynamicNegativePrompt
} = require("./promptBuilder");

const cloudflareModel = "@cf/black-forest-labs/flux-1-schnell";

async function generateWithCloudflare(character) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${cloudflareModel}`;
    const prompt = buildCloudflarePrompt(character);
    const negativePrompt = buildDynamicNegativePrompt(character);

    console.log("Cloudflare prompt length:", prompt.length);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt,
            steps: 8,
            seed: Math.floor(Math.random() * 1000000)
        })
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare image generation failed. Status: ${response.status}. ${errorText}`);
    }

    if (contentType.includes("application/json")) {
        const json = await response.json();
        const imageUrl = extractImageUrlFromCloudflareJson(json);

        if (!imageUrl) {
            throw new Error("Cloudflare returned JSON, but no image data was found.");
        }

        return {
            imageUrl,
            provider: "cloudflare",
            demoMode: false,
            prompt,
            negativePrompt
        };
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const mimeType = contentType.includes("image/")
        ? contentType
        : "image/jpeg";

    return {
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
        provider: "cloudflare",
        demoMode: false,
        prompt,
        negativePrompt
    };
}

function extractImageUrlFromCloudflareJson(json) {
    if (typeof json?.result === "string") {
        return `data:image/jpeg;base64,${json.result}`;
    }

    if (typeof json?.result?.image === "string") {
        return `data:image/jpeg;base64,${json.result.image}`;
    }

    if (typeof json?.result?.image_b64 === "string") {
        return `data:image/jpeg;base64,${json.result.image_b64}`;
    }

    if (typeof json?.image === "string") {
        return `data:image/jpeg;base64,${json.image}`;
    }

    if (typeof json?.image_b64 === "string") {
        return `data:image/jpeg;base64,${json.image_b64}`;
    }

    return null;
}

module.exports = {
    generateWithCloudflare
};