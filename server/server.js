const express = require("express");
const cors = require("cors");

const { generateWithOpenAI } = require("./services/openaiService");
const { generateWithCloudflare } = require("./services/cloudflareService");
const { createDemoPortrait } = require("./services/demoPortraitService");
const { buildPortraitPrompt } = require("./services/promptBuilder");
const { getActiveProvider, getProviderStatus } = require("./services/providerSelector");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        message: "Dicebound portrait server is running.",
        ...getProviderStatus()
    });
});

app.post("/api/generate-portrait", async (req, res) => {
    const character = req.body?.character;

    if (!character) {
        res.status(400).json({
            error: "Character data is required."
        });
        return;
    }

    const activeProvider = getActiveProvider();

    try {
        if (activeProvider === "openai") {
            const result = await generateWithOpenAI(character);
            res.json(result);
            return;
        }

        if (activeProvider === "cloudflare") {
            const result = await generateWithCloudflare(character);
            res.json(result);
            return;
        }

        res.json(
            createDemoPortraitResponse(
                character,
                "Demo portrait generated. No live image provider is active.",
                null,
                "demo"
            )
        );
    } catch (error) {
        console.error(`${activeProvider} portrait generation failed.`, error);

        res.json(
            createDemoPortraitResponse(
                character,
                `${formatProviderName(activeProvider)} failed, so a demo portrait was created instead.`,
                error,
                activeProvider
            )
        );
    }
});

function createDemoPortraitResponse(
    character,
    fallbackReason,
    originalError = null,
    originalProvider = "demo"
) {
    return {
        imageUrl: createDemoPortrait(character),
        prompt: safelyBuildPortraitPrompt(character),
        provider: "demo",
        originalProvider,
        demoMode: true,
        fallback: Boolean(originalError),
        fallbackReason,
        originalProviderError: originalError
            ? originalError.message
            : null
    };
}

function safelyBuildPortraitPrompt(character) {
    try {
        return buildPortraitPrompt(character);
    } catch (error) {
        console.error("Could not build portrait prompt for fallback response.", error);
        return "";
    }
}

function formatProviderName(provider) {
    if (provider === "openai") {
        return "OpenAI";
    }

    if (provider === "cloudflare") {
        return "Cloudflare";
    }

    return "The portrait provider";
}

app.listen(port, () => {
    console.log(`Dicebound portrait server running on port ${port}.`);
    console.log("Provider status:", getProviderStatus());
});