const express = require("express");
const cors = require("cors");

const { generateWithCloudflare } = require("./services/cloudflareService");
const { createDemoPortrait } = require("./services/demoPortraitService");
const { buildPortraitPrompt } = require("./services/promptBuilder");
const { generateWithOpenAI } = require("./services/openaiService");

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

    const prompt = buildPortraitPrompt(character);
    const activeProvider = getActiveProvider();

    if (activeProvider === "cloudflare") {
      const result = await generateWithCloudflare(character);
      return res.json(result);
    }

    if (activeProvider === "openai") {
      const result = await generateWithOpenAI(prompt);
      return res.json(result);
    }

    return res.json({
      imageUrl: createDemoPortrait(character),
      prompt,
      provider: "demo",
      demoMode: true
    });
  } catch (error) {
    console.error("Portrait generation failed.", error);

    res.status(500).json({
      error: "Portrait generation failed.",
      detail: error.message
    });
  }
});

app.listen(port, () => {
  const activeProvider = getActiveProvider();
  console.log(`Dicebound portrait server running on port ${port} using ${activeProvider} mode`);
});