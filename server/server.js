/* =========================================================
    Dicebound Portrait Server
    ---------------------------------------------------------
    This file defines the backend Express server used by the
    Dicebound frontend for character portrait generation.

    It provides:
    - a health-check route at /health
    - a portrait generation route at /api/generate-portrait
    - provider selection between Cloudflare and demo mode
    - automatic demo portrait fallback if Cloudflare fails
    - JSON request parsing for character data sent from the frontend

    The server does not create characters itself. It receives an
    already-created character object from the browser, sends it to
    the selected portrait provider, and returns an image URL plus
    any prompt data needed by the frontend.

    OpenAI is intentionally not used in this project to avoid paid
    image generation costs.

    Provider-specific logic is kept in services/.
    Prompt construction is kept in promptBuilder.js and related
    species prompt services.
   ========================================================= */

const express = require("express");
const cors = require("cors");

const { generateWithCloudflare } = require("./services/cloudflareService");
const { createDemoPortrait } = require("./services/demoPortraitService");
const { buildPortraitPrompt } = require("./services/promptBuilder");

const {
    getActiveProvider,
    getProviderStatus
} = require("./services/providerSelector");

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
    try {
        const { character } = req.body;

        if (!character) {
            return res.status(400).json({
                error: "No character data was provided."
            });
        }

        const activeProvider = getActiveProvider();

        if (activeProvider === "cloudflare") {
            try {
                const result = await generateWithCloudflare(character);
                return res.json(result);
            } catch (cloudflareError) {
                console.error("Cloudflare portrait generation failed. Falling back to demo portrait.", cloudflareError);

                return res.json(
                    createDemoPortraitResponse(
                        character,
                        "Cloudflare portrait generation failed, so a demo portrait was created instead.",
                        cloudflareError
                    )
                );
            }
        }

        return res.json(
            createDemoPortraitResponse(
                character,
                "Demo provider is active."
            )
        );
    } catch (error) {
        console.error("Portrait generation failed.", error);

        res.status(500).json({
            error: "Portrait generation failed.",
            detail: error.message
        });
    }
});

function createDemoPortraitResponse(character, fallbackReason, originalError = null) {
    const prompt = safelyBuildPortraitPrompt(character);

    return {
        imageUrl: createDemoPortrait(character),
        prompt,
        provider: "demo",
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
        console.error("Demo prompt construction failed. Returning fallback prompt text.", error);

        const name = character?.name || "Unnamed Adventurer";
        const species = character?.species?.name || character?.species || "Unknown Species";
        const className = character?.className || "Unknown Class";

        return `Demo portrait fallback for ${name}, a ${species} ${className}.`;
    }
}

app.listen(port, () => {
    const activeProvider = getActiveProvider();
    console.log(`Dicebound portrait server running on port ${port} using ${activeProvider} mode`);
});