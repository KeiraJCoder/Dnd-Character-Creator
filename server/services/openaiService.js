const OpenAI = require("openai");

const { hasOpenAiKey } = require("./providerSelector");

const openai = hasOpenAiKey
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
        })
    : null;

async function generateWithOpenAI(prompt) {
    if (!openai) {
        throw new Error("OpenAI client is not configured.");
    }

const result = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    size: "1024x1024",
    quality: "low"
});

const imageBase64 = result.data?.[0]?.b64_json;

if (!imageBase64) {
    throw new Error("No image data was returned from OpenAI.");
}

    return {
        imageUrl: `data:image/png;base64,${imageBase64}`,
        provider: "openai",
        demoMode: false,
        prompt
    };
}

module.exports = {
    generateWithOpenAI
};