const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const imageProvider = (process.env.IMAGE_PROVIDER || "auto").toLowerCase();

const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
const cloudflareModel = "@cf/black-forest-labs/flux-1-schnell";
const cloudflarePromptLimit = 2048;

const hasCloudflareCredentials =
  Boolean(cloudflareAccountId) &&
  Boolean(cloudflareApiToken) &&
  cloudflareAccountId !== "paste_your_account_id_here" &&
  cloudflareApiToken !== "paste_your_cloudflare_api_token_here";

const hasOpenAiKey =
  Boolean(process.env.OPENAI_API_KEY) &&
  process.env.OPENAI_API_KEY !== "put_your_api_key_here";

const openai = hasOpenAiKey
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function getActiveProvider() {
  if (imageProvider === "cloudflare" && hasCloudflareCredentials) {
    return "cloudflare";
  }

  if (imageProvider === "openai" && hasOpenAiKey && openai) {
    return "openai";
  }

  if (imageProvider === "demo") {
    return "demo";
  }

  if (hasCloudflareCredentials) {
    return "cloudflare";
  }

  if (hasOpenAiKey && openai) {
    return "openai";
  }

  return "demo";
}

function getGenderPresentationInstruction(genderOrPresentation) {
  const value = String(genderOrPresentation || "").trim().toLowerCase();

  if (value === "male" || value === "masculine") {
    return "Portrait presentation: masculine styling.";
  }

  if (value === "female" || value === "feminine") {
    return "Portrait presentation: feminine styling.";
  }

  if (
    value === "non gendered" ||
    value === "non binary" ||
    value === "unknown" ||
    value === "prefer not to say" ||
    value === "androgynous" ||
    value === "no strong gendered features"
  ) {
    return "Portrait presentation: neutral androgynous styling. Use practical neutral clothing, neutral facial styling, no beard, no moustache, no heavy makeup, no strongly masculine features and no strongly feminine features.";
  }

  return "Portrait presentation: neutral unless clearly stated otherwise.";
}

function isNeutralGender(genderOrPresentation) {
  const value = String(genderOrPresentation || "").trim().toLowerCase();

  return (
    value === "non gendered" ||
    value === "non binary" ||
    value === "unknown" ||
    value === "prefer not to say" ||
    value === "androgynous" ||
    value === "no strong gendered features"
  );
}

function getSpeciesVisualInstruction(species) {
  const value = String(species || "").trim().toLowerCase();

  if (value === "elf") {
    return "Species accuracy: elf, pointed elf ears, elegant elven features.";
  }

  if (value === "half-elf") {
    return "Species accuracy: half-elf, subtly pointed ears, not fully elven.";
  }

  if (value === "aasimar") {
    return "Species accuracy: aasimar, mostly human with subtle celestial or radiant features, no elf ears, no tiefling horns.";
  }

  if (value === "dwarf") {
    return "Species accuracy: dwarf, short, sturdy, dwarven, not tall or elven, no elf ears.";
  }

  if (value === "halfling") {
    return "Species accuracy: halfling, small warm halfling features, no elf ears.";
  }

  if (value === "gnome") {
    return "Species accuracy: gnome, small gnomish features, not elven.";
  }

  if (value === "tiefling") {
    return "Species accuracy: tiefling, visible horns or infernal features, not elven.";
  }

  if (value === "dragonborn") {
    return "Species accuracy: dragonborn, draconic scales and dragon-like head.";
  }

  if (value === "half-orc") {
    return "Species accuracy: half-orc, tusks, strong jaw or clear orcish features, no elf ears.";
  }

  if (value === "orc") {
    return "Species accuracy: orc, tusks and strong orcish features, no elf ears.";
  }

  if (value === "goblin") {
    return "Species accuracy: goblin, clear goblin features.";
  }

  if (value === "goliath") {
    return "Species accuracy: goliath, powerful, very tall, giant-blooded, not slender or elven.";
  }

  if (value === "human") {
    return "Species accuracy: human, normal rounded human ears, no elf ears, no horns, no tusks, no fantasy anatomy.";
  }

  return `Species accuracy: ${species}, must visually match that species.`;
}

function getClassVisualInstruction(className, weaponName) {
  const classValue = String(className || "").trim().toLowerCase();
  const weaponValue = weaponName || "weapon";

  const map = {
    fighter: `Class: fighter. Practical armour or battle gear. Show ${weaponValue} if possible.`,
    rogue: `Class: rogue. Light armour, stealth clothing, subtle shadows. Show ${weaponValue} if possible.`,
    ranger: `Class: ranger. Travel gear, outdoors clothing, scout styling. Show ${weaponValue} if possible.`,
    cleric: `Class: cleric. Divine, temple, priestly or holy styling. Show ${weaponValue} if possible.`,
    wizard: `Class: wizard. Arcane robes, spellbook or subtle magic. Show ${weaponValue} if possible.`,
    barbarian: `Class: barbarian. Rugged primal warrior styling. Show ${weaponValue} if possible.`,
    bard: `Class: bard. Artistic expressive performer styling. Show ${weaponValue} if possible.`,
    druid: `Class: druid. Nature-themed clothing. Show ${weaponValue} if possible.`,
    monk: `Class: monk. Simple martial attire. Show ${weaponValue} if possible.`,
    paladin: `Class: paladin. Noble armoured holy styling. Show ${weaponValue} if possible.`,
    sorcerer: `Class: sorcerer. Arcane innate magic styling. Show ${weaponValue} if possible.`,
    warlock: `Class: warlock. Arcane eerie pact-magic styling. Show ${weaponValue} if possible.`
  };

  return map[classValue] || `Class: ${className}. Fantasy ${className} styling. Show ${weaponValue} if possible.`;
}

function getAgeVisualInstruction(ageRange) {
  const value = String(ageRange || "").trim().toLowerCase();

  if (value === "young adult") {
    return "Age: young adult.";
  }

  if (value === "adult") {
    return "Age: mature adult.";
  }

  if (value === "middle-aged") {
    return "Age: visibly middle-aged.";
  }

  if (value === "elder") {
    return "Age: elderly, older or aged.";
  }

  return "Age: do not strongly emphasise age.";
}

function getBuildVisualInstruction(build) {
  const value = String(build || "").trim().toLowerCase();

  if (value === "thin") {
    return "Body type: thin, narrow frame, slim arms, slim shoulders, slight build. Do not make them muscular or broad.";
  }

  if (value === "lean") {
    return "Body type: lean, athletic but slim, lightly built, not bulky, not heavily muscular.";
  }

  if (value === "average build") {
    return "Body type: average build, natural proportions, neither thin nor muscular nor large-bodied.";
  }

  if (value === "broad") {
    return "Body type: broad and stocky, wide shoulders, wide torso, solid frame, thick neck, not slim, not narrow, not bodybuilder muscular.";
  }

  if (value === "heavy-set") {
    return "Body type: fat, heavy-set, large-bodied, soft round face, thick neck, broad torso, visible body weight, not slim, not lean, not muscular.";
  }

  if (value === "fat") {
    return "Body type: fat, large-bodied, round face, soft jawline, thick neck, broad torso, visible body weight, not slim, not lean, not muscular.";
  }

  if (value === "stocky") {
    return "Body type: stocky, compact, broad, solid, thick torso, shorter-looking proportions, not slim or narrow.";
  }

  if (value === "muscular") {
    return "Body type: muscular, visibly strong, defined arms and shoulders, athletic power, not thin, not soft-bodied.";
  }

  return "Body type: match the listed build exactly. Make the body shape visible.";
}

function getFeaturePromptInstruction(notableFeature) {
  const feature = String(notableFeature || "").trim();
  const value = feature.toLowerCase();

  if (!feature || value.includes("no obvious")) {
    return "No unusual facial mark, scar, tattoo or missing feature.";
  }

  if (value.includes("scar across one eyebrow")) {
    return "A realistic healed scar cutting through one eyebrow. It must look like a scar, not a tattoo, not face paint.";
  }

  if (value.includes("small scar on face")) {
    return "A small realistic facial scar. It must look like healed skin damage, not a tattoo or painted mark.";
  }

  if (value.includes("large scar on face")) {
    return "A large realistic facial scar. It must look like damaged or healed skin, not a tattoo or painted mark.";
  }

  if (value.includes("scar across the nose")) {
    return "A realistic scar crossing the nose. It must look like healed skin damage.";
  }

  if (value.includes("scar across one cheek")) {
    return "A realistic scar across one cheek. It must look like healed skin damage.";
  }

  if (value.includes("jagged scar")) {
    return "A jagged realistic scar along the jaw. It must look like healed skin damage.";
  }

  if (value.includes("burn scar")) {
    return "A visible burn scar. It must look like healed burn damage, not a tattoo or face paint.";
  }

  if (value.includes("small face tattoo")) {
    return "A small visible face tattoo.";
  }

  if (value.includes("full face tattoo")) {
    return "A large full-face tattoo covering much of the face.";
  }

  if (value.includes("tattoo around one eye")) {
    return "A visible tattoo around one eye.";
  }

  if (value.includes("ritual mark")) {
    return `A visible ${feature.toLowerCase()}. It should look like a deliberate mark or symbol.`;
  }

  if (value.includes("one missing eye")) {
    return "One eye is missing or covered by an eyepatch.";
  }

  if (value.includes("one clouded eye") || value.includes("blind in one eye")) {
    return "One eye is visibly clouded or blind.";
  }

  if (value.includes("birthmark")) {
    return `Visible ${feature.toLowerCase()}.`;
  }

  if (value.includes("freckles")) {
    return "Visible freckles across the nose and cheeks.";
  }

  if (value.includes("crooked nose")) {
    return "A visibly crooked or slightly bent nose. The nose should look asymmetrical, not perfectly straight.";
  }

  if (value.includes("broken nose")) {
    return "A visibly broken nose that healed slightly crooked. The nose should not look perfectly straight.";
  }

  if (value.includes("split lip")) {
    return "A visible split-lip scar.";
  }

  if (value.includes("missing fingertip")) {
    return "One fingertip is missing if the hands are visible.";
  }

  if (value.includes("missing finger")) {
    return "One finger is missing if the hands are visible.";
  }

  if (value.includes("missing ear tip")) {
    return "One ear has a missing tip.";
  }

  if (value.includes("notched ear")) {
    return "One ear has a visible notch.";
  }

  if (value.includes("eyebrow piercing")) {
    return "A visible eyebrow piercing.";
  }

  if (value.includes("nose piercing")) {
    return "A visible nose piercing.";
  }

  if (value.includes("lip piercing")) {
    return "A visible lip piercing.";
  }

  if (value.includes("ear piercings")) {
    return "Several visible ear piercings.";
  }

  if (value.includes("silver streak")) {
    return "A visible silver streak through the hair.";
  }

  if (value.includes("white streak")) {
    return "A visible white streak through the hair.";
  }

  if (value.includes("glowing eyes")) {
    return "Glowing eyes that still match the listed eye colour.";
  }

  if (value.includes("unusually bright eyes")) {
    return "Unusually bright eyes that still match the listed eye colour.";
  }

  if (value.includes("sharp fangs")) {
    return "Subtle sharp fangs visible if the mouth is slightly open.";
  }

  if (
    value.includes("broken horn") ||
    value.includes("chipped horn") ||
    value.includes("shortened horn") ||
    value.includes("cracked horn")
  ) {
    return `Visible ${feature.toLowerCase()}.`;
  }

  if (value.includes("gold tooth")) {
    return "A visible gold tooth if the mouth is slightly open.";
  }

  if (value.includes("ink-stained fingers")) {
    return "Ink-stained fingers if the hands are visible.";
  }

  if (value.includes("calloused hands")) {
    return "Calloused hands if the hands are visible.";
  }

  return `Visible notable feature: ${feature}. Show it naturally and accurately.`;
}

function getHairVisualInstruction(hairColour) {
  const value = String(hairColour || "").trim().toLowerCase();

  if (
    value === "no hair" ||
    value === "bald" ||
    value === "hairless" ||
    value === "shaved head"
  ) {
    return "Hair: completely bald head, smooth scalp, no head hair, no fringe, no loose strands, no ponytail, no visible hairstyle.";
  }

  return `Hair colour: ${hairColour}. This must be accurate.`;
}

function getNotableFeatureInstruction(notableFeature) {
  return getFeaturePromptInstruction(notableFeature);
}

function buildAppearancePriorityBlock(character) {
  return `
NON-NEGOTIABLE APPEARANCE DETAILS:
- Species: ${character.species?.name || "Unknown"}
- Gender Identity: ${character.gender || "Unknown"}
- Portrait Presentation: ${character.portraitPresentation || character.gender || "Unknown"}
- Age Range: ${character.ageRange || "Unknown"}
- Height: ${character.height || "Unknown"}
- Build: ${character.build || "Unknown"}
- Skin Colour / Tone: ${character.skinTone || "Unknown"}
- Hair Colour: ${character.hairColour || "Unknown"}
- Eye Colour: ${character.eyeColour || "Unknown"}
- Notable Feature: ${character.notableFeature || "None given"}

These details are the highest priority. Do not change them. Follow the character sheet exactly.
  `.trim();
}

function buildAvoidInstructions(character) {
  const species = String(character.species?.name || "").toLowerCase();
  const gender = String(character.portraitPresentation || character.gender || "").toLowerCase();
  const eyeColour = String(character.eyeColour || "").toLowerCase();
  const build = String(character.build || "").toLowerCase();
  const hairColour = String(character.hairColour || "").toLowerCase();
  const skinTone = String(character.skinTone || "").toLowerCase();

  const avoid = [
    "No text",
    "No letters",
    "No captions",
    "No labels",
    "No signature",
    "No watermark",
    "No logo",
    "No character sheet layout",
    "No concept art sheet",
    "No multiple views",
    "No inset images",
    "No extra faces",
    "No extra characters",
    "No second portrait",
    "No collage",
    "No side panel",
    "No comic layout"
  ];

  if (species !== "elf" && species !== "half-elf") {
    avoid.push("No elf ears unless the species is Elf or Half-Elf");
  }

  if (species === "human") {
    avoid.push("Do not add horns, tusks, scales or non-human anatomy");
    avoid.push("Do not add pointed ears");
  }

  if (species === "aasimar") {
    avoid.push("Do not add elf ears");
    avoid.push("Do not make the character look like a tiefling");
  }

  if (species === "dwarf") {
    avoid.push("Do not make the character tall and slender");
    avoid.push("Do not give the character elf ears");
  }

  if (isNeutralGender(gender)) {
    avoid.push("Avoid strongly masculine styling");
    avoid.push("Avoid strongly feminine styling");
    avoid.push("Avoid beard");
    avoid.push("Avoid moustache");
    avoid.push("Avoid heavy makeup");
    avoid.push("Use practical neutral clothing");
  }

  if (build === "thin") {
    avoid.push("Do not make the character broad");
    avoid.push("Do not make the character heavy-set");
    avoid.push("Do not make the character muscular");
  }

  if (build === "lean") {
    avoid.push("Do not make the character bulky");
    avoid.push("Do not make the character heavy-set");
    avoid.push("Do not make the character bodybuilder muscular");
  }

  if (build === "broad") {
    avoid.push("Do not make the character slim");
    avoid.push("Do not make the character narrow-shouldered");
    avoid.push("Do not make the character delicate");
    avoid.push("Do not make the character only muscular");
  }

  if (build === "heavy-set" || build === "fat") {
    avoid.push("Do not make the character slim");
    avoid.push("Do not make the character lean");
    avoid.push("Do not make the character narrow-faced");
    avoid.push("Do not make the character muscular instead of fat");
    avoid.push("Do not hide the body shape with oversized armour");
  }

  if (build === "stocky") {
    avoid.push("Do not make the character slim");
    avoid.push("Do not make the character tall and narrow");
    avoid.push("Do not make the character delicate");
  }

  if (build === "muscular") {
    avoid.push("Do not make the character frail or slender");
    avoid.push("Do not make the character soft-bodied");
  }

  if (
    hairColour.includes("no hair") ||
    hairColour.includes("bald") ||
    hairColour.includes("hairless") ||
    hairColour.includes("shaved head")
  ) {
    avoid.push("Do not add hair");
    avoid.push("Do not add long hair");
    avoid.push("Do not add short hair");
    avoid.push("Do not add fringe");
    avoid.push("Do not add a ponytail");
    avoid.push("Do not add braids");
    avoid.push("Do not add a visible hairstyle");
  }

  if (hairColour.includes("silver")) {
    avoid.push("Do not change the hair to black, brown, blonde or red");
  }

  if (hairColour.includes("red")) {
    avoid.push("Do not change the hair to black, blonde, grey or silver");
  }

  if (hairColour.includes("black")) {
    avoid.push("Do not change the hair to blonde, red, silver or white");
  }

  if (
    skinTone.includes("deep brown") ||
    skinTone.includes("warm brown") ||
    skinTone.includes("bronze") ||
    skinTone.includes("copper")
  ) {
    avoid.push("Do not make the skin pale, fair, white or light");
  }

  if (eyeColour.includes("green")) {
    avoid.push("Do not change the eyes to blue, brown or grey");
  }

  if (eyeColour.includes("blue")) {
    avoid.push("Do not change the eyes to brown, green or gold");
  }

  if (eyeColour.includes("violet") || eyeColour.includes("purple")) {
    avoid.push("Do not change the eyes to blue, brown or green");
  }

  if (eyeColour.includes("gold") || eyeColour.includes("amber")) {
    avoid.push("Do not change the eyes to blue, brown or green");
  }

  if (eyeColour.includes("grey") || eyeColour.includes("gray")) {
    avoid.push("Do not change the eyes to blue, brown or green");
  }

  return `AVOID THE FOLLOWING:\n- ${avoid.join("\n- ")}`;
}

function buildPortraitPrompt(character) {
  const species = character.species?.name || "Unknown Species";
  const className = character.className || "Adventurer";
  const weaponName = character.weapon?.name || "weapon";
  const portraitPresentation = character.portraitPresentation || character.gender || "Unknown";
  const profile = character.generatedProfile || {};
  const coreTraits = Array.isArray(profile.traits) ? profile.traits.join(", ") : "Unknown";

  return `
Create a highly accurate fantasy character portrait for a DnD-inspired character generator.
This portrait must closely follow the character sheet.

${buildAppearancePriorityBlock(character)}

VISUAL REQUIREMENTS:
- ${getSpeciesVisualInstruction(species)}
- ${getGenderPresentationInstruction(portraitPresentation)}
- ${getAgeVisualInstruction(character.ageRange)}
- ${getBuildVisualInstruction(character.build)}
- ${getFeaturePromptInstruction(character.notableFeature)}
- ${getClassVisualInstruction(className, weaponName)}

SECONDARY ROLEPLAY FLAVOUR:
- Core traits: ${coreTraits}
- Alignment: ${profile.alignment || "Unknown"}
- Religious outlook: ${profile.faithProfile || "Unknown"}
- Weakness: ${profile.weakness || "Unknown"}

COMPOSITION:
One single character only. Waist-up or chest-up portrait. Clear view of the face. Simple fantasy background. No extra characters.

${buildAvoidInstructions(character)}

STYLE:
Detailed fantasy digital painting, polished RPG portrait art, cinematic lighting, accurate anatomy, no text, no watermark.
  `.trim();
}

function buildCloudflarePrompt(character) {
  const species = character.species?.name || "fantasy character";
  const className = character.className || "adventurer";
  const weaponName = character.weapon?.name || "weapon";

  const name = character.name || "Unnamed character";
  const gender = character.gender || "Unknown";
  const portraitPresentation = character.portraitPresentation || gender || "Unknown";
  const ageRange = character.ageRange || "Unknown";
  const height = character.height || "Unknown";
  const build = character.build || "Unknown";
  const skinTone = character.skinTone || "Unknown";
  const hairColour = character.hairColour || "Unknown";
  const eyeColour = character.eyeColour || "Unknown";
  const notableFeature = character.notableFeature || "No Obvious Unusual Feature";

  const speciesRule = getSpeciesVisualInstruction(species);
  const genderRule = getGenderPresentationInstruction(portraitPresentation);
  const ageRule = getAgeVisualInstruction(ageRange);
  const buildRule = getBuildVisualInstruction(build);
  const hairRule = getHairVisualInstruction(hairColour);
  const featureRule = getFeaturePromptInstruction(notableFeature);
  const classRule = getClassVisualInstruction(className, weaponName);

  const buildValue = String(build).toLowerCase();

  const strongBodyAnchor = (
    buildValue === "fat" ||
    buildValue === "heavy-set"
  )
    ? "This character must visibly be fat and large-bodied, with a rounder face, thick neck, broad upper torso and visible body weight. Do not make them slim, lean, athletic or muscular."
    : buildValue === "broad"
      ? "This character must visibly have a broad body, wide shoulders, wide upper torso and solid frame. Do not make them slim or narrow."
      : buildValue === "stocky"
        ? "This character must visibly be stocky, compact, solid and broad through the upper torso. Do not make them slim or narrow."
        : buildRule;

  const humanEarRule = String(species).toLowerCase() === "human"
    ? "Human ears must be rounded, not pointed."
    : "";

  const neutralPresentationExtra = isNeutralGender(portraitPresentation)
    ? "Neutral androgynous styling. Practical neutral clothing. No beard. No moustache. No heavy makeup. No strongly gendered styling."
    : "";

  const prompt = `
Create one single fantasy RPG waist-up portrait. One character only. Show the face, shoulders, chest, stomach area and upper torso clearly. No text, no signature, no watermark, no logo, no extra faces, no second character, no character sheet layout.

PRIMARY VISUAL REQUIREMENT:
The character must visibly have this body build: ${build}.
${strongBodyAnchor}

PRIMARY FACIAL REQUIREMENT:
The character must visibly have this notable feature: ${notableFeature}.
${featureRule}
The face must be clear, close enough, and unobstructed so the notable feature is easy to see.

MANDATORY CHARACTER DETAILS:
Name: ${name}.
Gender identity: ${gender}.
Portrait presentation: ${portraitPresentation}. ${neutralPresentationExtra}
Species: ${species}.
Age range: ${ageRange}.
Height: ${height}.
Skin colour or tone: ${skinTone}.
${hairRule}
Eye colour: ${eyeColour}.
Class: ${className}.
Weapon: ${weaponName}.

VISUAL RULES:
${speciesRule}
${genderRule}
${ageRule}
${classRule}
${humanEarRule}

IMPORTANT:
Do not hide the body shape with a cloak, oversized armour, shadows or cropping.
Do not crop the image so tightly that the build is invisible.
Do not default to a thin, lean, athletic or muscular fantasy hero body unless the build says that.
Do not ignore the notable feature.
Do not turn scars into tattoos or face paint.
Do not add hair if the character is bald or has no hair.

Accuracy priority:
1. Body build must be visibly correct.
2. Notable feature must be visibly correct.
3. Species, skin colour, hair detail and eye colour must match.
4. Age and portrait presentation must match.

Detailed fantasy digital painting, simple dark fantasy background.
  `.trim();

  if (prompt.length <= cloudflarePromptLimit) {
    return prompt;
  }

  return `
One single fantasy RPG waist-up portrait. Show clear face, shoulders, chest, stomach area and upper torso. No text, no signature, no watermark, no extra faces.

Main requirement: ${build} body build.
${strongBodyAnchor}

Main facial feature: ${notableFeature}.
${featureRule}
Face must clearly show this feature.

${name}, ${species} ${className}.
Gender identity: ${gender}. Portrait presentation: ${portraitPresentation}. ${neutralPresentationExtra}
Age: ${ageRange}. Height: ${height}.
Skin: ${skinTone}.
${hairRule}
Eyes: ${eyeColour}. Weapon: ${weaponName}.

${speciesRule}
${genderRule}
${ageRule}
${humanEarRule}

Do not hide body shape with cloak, armour, shadows or tight cropping. Do not make fat, heavy-set, broad or stocky characters slim or muscular. Do not ignore the notable feature. Do not turn scars into tattoos or face paint.
  `.trim().slice(0, cloudflarePromptLimit);
}

function buildDynamicNegativePrompt(character) {
  const species = String(character.species?.name || "").toLowerCase();
  const gender = String(character.portraitPresentation || character.gender || "").toLowerCase();
  const build = String(character.build || "").toLowerCase();
  const hairColour = String(character.hairColour || "").toLowerCase();
  const skinTone = String(character.skinTone || "").toLowerCase();
  const eyeColour = String(character.eyeColour || "").toLowerCase();

  const negatives = [
    "text",
    "letters",
    "caption",
    "signature",
    "watermark",
    "logo",
    "character sheet",
    "concept sheet",
    "multiple portraits",
    "multiple views",
    "extra face",
    "extra people",
    "collage",
    "panel layout",
    "comic panel",
    "inset portrait"
  ];

  if (species !== "elf" && species !== "half-elf") {
    negatives.push("elf ears", "pointed ears", "elven face");
  }

  if (species === "human") {
    negatives.push("horns", "tusks", "scales", "non-human anatomy", "pointed ears");
  }

  if (species === "dwarf") {
    negatives.push("tall body", "slender body", "delicate frame");
  }

  if (isNeutralGender(gender)) {
    negatives.push(
      "strongly feminine",
      "strongly masculine",
      "beard",
      "moustache",
      "heavy makeup"
    );
  }

  if (build === "thin") {
    negatives.push("broad body", "heavy-set body", "fat body", "muscular body");
  }

  if (build === "lean") {
    negatives.push("bulky body", "heavy-set body", "fat body", "bodybuilder");
  }

  if (build === "broad") {
    negatives.push("thin body", "slim body", "narrow shoulders", "delicate frame");
  }

  if (build === "heavy-set" || build === "fat") {
    negatives.push("thin body", "slim body", "lean body", "narrow face", "bodybuilder", "six-pack", "defined abs");
  }

  if (build === "stocky") {
    negatives.push("thin body", "slim body", "tall narrow body", "delicate frame");
  }

  if (build === "muscular") {
    negatives.push("frail body", "slender body", "soft body");
  }

  if (
    hairColour.includes("no hair") ||
    hairColour.includes("bald") ||
    hairColour.includes("hairless") ||
    hairColour.includes("shaved head")
  ) {
    negatives.push(
      "hair",
      "long hair",
      "short hair",
      "fringe",
      "bangs",
      "ponytail",
      "braids",
      "visible hairstyle"
    );
  }

  if (hairColour.includes("silver")) {
    negatives.push("black hair", "brown hair", "blonde hair", "red hair");
  }

  if (hairColour.includes("red")) {
    negatives.push("black hair", "blonde hair", "grey hair", "silver hair");
  }

  if (hairColour.includes("black")) {
    negatives.push("blonde hair", "red hair", "white hair", "silver hair");
  }

  if (
    skinTone.includes("deep brown") ||
    skinTone.includes("warm brown") ||
    skinTone.includes("bronze") ||
    skinTone.includes("copper")
  ) {
    negatives.push("pale skin", "fair skin", "white skin", "light skin");
  }

  if (eyeColour.includes("green")) {
    negatives.push("blue eyes", "brown eyes", "grey eyes");
  }

  if (eyeColour.includes("blue")) {
    negatives.push("brown eyes", "green eyes", "gold eyes");
  }

  if (eyeColour.includes("violet") || eyeColour.includes("purple")) {
    negatives.push("blue eyes", "brown eyes", "green eyes");
  }

  if (eyeColour.includes("gold") || eyeColour.includes("amber")) {
    negatives.push("blue eyes", "brown eyes", "green eyes");
  }

  if (eyeColour.includes("grey") || eyeColour.includes("gray")) {
    negatives.push("blue eyes", "brown eyes", "green eyes");
  }

  return negatives.join(", ");
}

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

async function generateWithOpenAI(prompt) {
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

function createDemoPortrait(character) {
  const name = character.name || "Unnamed Adventurer";
  const species = character.species?.name || "Unknown Species";
  const className = character.className || "Unknown Class";
  const gender = character.gender || "Unknown";
  const ageRange = character.ageRange || "Unknown";
  const height = character.height || "Unknown";
  const build = character.build || "Unknown";
  const eyeColour = character.eyeColour || "Unknown";
  const hairColour = character.hairColour || "Unknown";
  const skinTone = character.skinTone || "Unknown";
  const notableFeature = character.notableFeature || "No notable feature";
  const weaponName = character.weapon?.name || "Unknown Weapon";
  const weaponDamage = character.weapon?.damage || "";
  const profile = character.generatedProfile || {};
  const traits = Array.isArray(profile.traits) && profile.traits.length > 0
    ? profile.traits.slice(0, 4)
    : ["Unwritten", "Mysterious", "Untested"];

  const initials = getInitials(name);
  const classAccent = getClassAccent(className);
  const skinColour = getSkinColour(skinTone);
  const hairColourHex = getHairColour(hairColour);
  const eyeColourHex = getEyeColour(eyeColour);

  const nameLines = splitTextIntoLines(name, 22, 2);
  const detailLines = splitTextIntoLines(`${species} ${className}`, 28, 2);
  const featureLines = splitTextIntoLines(notableFeature, 34, 2);
  const weaponText = weaponDamage ? `${weaponName}, ${weaponDamage}` : weaponName;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#120c08"/>
      <stop offset="42%" stop-color="#24140b"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>

    <radialGradient id="glow" cx="50%" cy="28%" r="55%">
      <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="${classAccent}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="robe" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#111827" stop-opacity="0.95"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>

  <circle cx="512" cy="140" r="245" fill="${classAccent}" opacity="0.12"/>
  <circle cx="160" cy="165" r="95" fill="#facc15" opacity="0.07"/>
  <circle cx="865" cy="230" r="125" fill="#f5e6c8" opacity="0.05"/>

  <g filter="url(#shadow)">
    <path d="M285 780 C310 580 365 470 512 470 C659 470 714 580 739 780 Z" fill="url(#robe)"/>
    <path d="M330 785 C360 640 405 555 512 555 C619 555 664 640 694 785 Z" fill="#0f172a" opacity="0.38"/>

    <circle cx="512" cy="330" r="150" fill="${skinColour}"/>

    <path d="M365 318 C372 190 442 130 515 130 C602 130 675 202 664 330 C626 286 575 265 508 267 C450 269 400 288 365 318 Z" fill="${hairColourHex}"/>

    <path d="M365 312 C374 215 435 160 512 160 C594 160 653 224 660 315 C622 255 572 230 512 230 C452 230 403 255 365 312 Z" fill="${hairColourHex}" opacity="0.88"/>

    <ellipse cx="455" cy="337" rx="18" ry="11" fill="${eyeColourHex}"/>
    <ellipse cx="569" cy="337" rx="18" ry="11" fill="${eyeColourHex}"/>
    <circle cx="455" cy="337" r="5" fill="#111827"/>
    <circle cx="569" cy="337" r="5" fill="#111827"/>

    <path d="M470 404 C493 424 530 424 554 404" fill="none" stroke="#3f2412" stroke-width="8" stroke-linecap="round" opacity="0.55"/>

    <path d="M368 462 C415 535 608 535 656 462 C626 520 397 520 368 462 Z" fill="#000000" opacity="0.12"/>
  </g>

  <g>
    <rect x="72" y="70" width="235" height="72" rx="18" fill="#000000" opacity="0.3" stroke="#d6a84f" stroke-opacity="0.55"/>
    <text x="190" y="115" text-anchor="middle" fill="#facc15" font-size="28" font-family="Arial, sans-serif" font-weight="700">
      DEMO MODE
    </text>
  </g>

  <g>
    <circle cx="835" cy="140" r="58" fill="#000000" opacity="0.25" stroke="#d6a84f" stroke-opacity="0.65"/>
    <text x="835" y="160" text-anchor="middle" fill="#d6a84f" font-size="46" font-family="Georgia, serif" font-weight="700">
      ${escapeSvgText(initials)}
    </text>
  </g>

  <g>
    <rect x="92" y="790" width="840" height="162" rx="28" fill="#070707" opacity="0.68" stroke="#d6a84f" stroke-opacity="0.45"/>

    ${createSvgTextLines(nameLines, 512, 840, 46, "#f7ead8", 52, "Georgia, serif", "700")}
    ${createSvgTextLines(detailLines, 512, 890, 34, "#f4d9a9", 32, "Arial, sans-serif", "600")}

    <text x="512" y="930" text-anchor="middle" fill="#cbd5e1" font-size="24" font-family="Arial, sans-serif">
      ${escapeSvgText(gender)} • ${escapeSvgText(ageRange)} • ${escapeSvgText(height)} • ${escapeSvgText(build)}
    </text>
  </g>

  <g>
    <rect x="80" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
    <text x="105" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">APPEARANCE</text>
    <text x="105" y="680" fill="#f7ead8" font-size="24" font-family="Georgia, serif">Hair: ${escapeSvgText(hairColour)}</text>
    <text x="105" y="715" fill="#f7ead8" font-size="24" font-family="Georgia, serif">Eyes: ${escapeSvgText(eyeColour)}</text>
  </g>

  <g>
    <rect x="674" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
    <text x="699" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">WEAPON</text>
    ${createSvgTextLines(splitTextIntoLines(weaponText, 17, 2), 699, 680, 30, "#f7ead8", 24, "Georgia, serif", "700", "start")}
  </g>

  <g>
    <rect x="360" y="610" width="304" height="130" rx="22" fill="#000000" opacity="0.34" stroke="#d6a84f" stroke-opacity="0.26"/>
    <text x="512" y="648" text-anchor="middle" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">CORE TRAITS</text>
    <text x="512" y="692" text-anchor="middle" fill="#f7ead8" font-size="26" font-family="Georgia, serif">
      ${escapeSvgText(traits.slice(0, 2).join(" • "))}
    </text>
    <text x="512" y="727" text-anchor="middle" fill="#f7ead8" font-size="24" font-family="Georgia, serif">
      ${escapeSvgText(traits.slice(2, 4).join(" • "))}
    </text>
  </g>

  <g>
    <text x="512" y="65" text-anchor="middle" fill="#f7ead8" font-size="28" font-family="Arial, sans-serif" opacity="0.82">
      Dicebound Character Portrait
    </text>
  </g>

  <g>
    <text x="512" y="990" text-anchor="middle" fill="#dbc59d" font-size="19" font-family="Arial, sans-serif" opacity="0.8">
      ${escapeSvgText(featureLines.join(" "))}
    </text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getInitials(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "A";
}

function splitTextIntoLines(text, maxLength, maxLines) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let currentLine = "";

  words.forEach(word => {
    const possibleLine = currentLine ? `${currentLine} ${word}` : word;

    if (possibleLine.length <= maxLength) {
      currentLine = possibleLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    const trimmedLines = lines.slice(0, maxLines);
    trimmedLines[maxLines - 1] = `${trimmedLines[maxLines - 1].replace(/\.+$/, "")}...`;
    return trimmedLines;
  }

  return lines;
}

function createSvgTextLines(
  lines,
  x,
  y,
  lineHeight,
  fill,
  fontSize,
  fontFamily,
  fontWeight,
  anchor = "middle"
) {
  return lines
    .map((line, index) => {
      return `
        <text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}">
          ${escapeSvgText(line)}
        </text>
      `;
    })
    .join("");
}

function getClassAccent(className) {
  const colours = {
    fighter: "#b45309",
    rogue: "#6d28d9",
    ranger: "#15803d",
    cleric: "#ca8a04",
    wizard: "#2563eb"
  };

  return colours[String(className).toLowerCase()] || "#d6a84f";
}

function getSkinColour(skinTone) {
  const colours = {
    pale: "#ead7c5",
    fair: "#e8c7a3",
    olive: "#b89768",
    golden: "#d6a05f",
    bronze: "#a97142",
    "warm brown": "#8b5a3c",
    "deep brown": "#5c3728",
    ashen: "#9ca3af",
    grey: "#9ca3af",
    "pale grey": "#c7c9cc",
    "stone grey": "#8b9096",
    green: "#6b8f5a",
    "grey-green": "#6f8072",
    "yellow-green": "#9a9f45",
    red: "#9f3a2f",
    purple: "#7651a8",
    "blue-grey": "#6f86a3",
    "copper-toned": "#b8734f",
    "red scales": "#9f3a2f",
    "gold scales": "#c49a3a",
    "silver scales": "#cbd5e1",
    "black scales": "#1f2937",
    "blue scales": "#315a9e",
    "green scales": "#2f7d45",
    "bronze scales": "#8a5a2b",
    "copper scales": "#b8734f",
    "white scales": "#e5e7eb"
  };

  return colours[String(skinTone).toLowerCase()] || "#d8b08c";
}

function getHairColour(hairColour) {
  const colours = {
    black: "#111111",
    brown: "#4a2c1a",
    auburn: "#7c2d12",
    red: "#b91c1c",
    blonde: "#d6b25e",
    white: "#f3f4f6",
    silver: "#cbd5e1",
    grey: "#9ca3af",
    "ash-grey": "#858b92",
    copper: "#b87333",
    "dark blue": "#1e3a8a",
    gold: "#d6a84f",
    "no hair": "#d8b08c",
    "horned crest": "#d6a84f",
    "bone crest": "#e5dcc8",
    "spined crest": "#d6a84f",
    "scaled crest": "#d6a84f"
  };

  return colours[String(hairColour).toLowerCase()] || "#4a2c1a";
}

function getEyeColour(eyeColour) {
  const colours = {
    green: "#22c55e",
    blue: "#38bdf8",
    grey: "#94a3b8",
    brown: "#7c4a25",
    hazel: "#a87932",
    amber: "#f59e0b",
    black: "#111827",
    silver: "#cbd5e1",
    violet: "#8b5cf6",
    gold: "#facc15",
    red: "#dc2626",
    yellow: "#facc15",
    white: "#f8fafc"
  };

  return colours[String(eyeColour).toLowerCase()] || "#facc15";
}

function escapeSvgText(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

app.get("/health", (req, res) => {
  const activeProvider = getActiveProvider();

  res.json({
    ok: true,
    message: "Dicebound portrait server is running.",
    requestedProvider: imageProvider,
    activeProvider,
    cloudflareConnected: Boolean(hasCloudflareCredentials),
    openAiConnected: Boolean(hasOpenAiKey),
    mode: activeProvider
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