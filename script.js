/* =========================================================
   Dicebound
   Main Script
   ========================================================= */


/* =========================================================
   1. Core Data And State
   ========================================================= */

const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const proficiencyBonus = 2;
const portraitApiUrl = "http://localhost:3001/api/generate-portrait";

let nameData = {
  firstNames: [],
  lastNames: []
};

let classes = {};
let questions = [];
let speciesData = [];

let namesLoaded = false;
let classesLoaded = false;
let questionsLoaded = false;
let speciesLoaded = false;
let dataLoadingError = false;

let selectedClassName = null;
let selectedWeapon = null;
let character = null;
let currentQuestionIndex = 0;
let profileScores = {};

const defaultPhysicalTraits = {
  heights: ["Short", "Average Height", "Tall", "Very Tall"],
  builds: ["Thin", "Lean", "Average Build", "Broad", "Heavy-Set", "Muscular"],
  eyeColours: ["Green", "Blue", "Grey", "Brown", "Hazel", "Amber", "Black", "Silver", "Violet", "Gold"],
  hairColours: ["Black", "Brown", "Auburn", "Red", "Blonde", "White", "Silver", "Dark Blue", "Copper", "Ash-Grey"],
  skinTones: ["Pale", "Fair", "Warm Brown", "Deep Brown", "Olive", "Golden", "Blue-Grey", "Ashen", "Bronze", "Copper-Toned"],
  notableFeatures: [
    "A Thin Scar Across One Eyebrow",
    "An Old Burn Mark On One Hand",
    "A Tattoo Of A Broken Circle",
    "Unusually Bright Eyes",
    "A Missing Fingertip",
    "A Silver Streak Through Their Hair",
    "A Quiet, Watchful Expression",
    "A Jagged Scar Along The Jaw",
    "Ink-Stained Fingers",
    "A Ritual Mark On The Wrist",
    "A Broken Nose That Healed Badly",
    "A Voice Softer Than Expected",
    "A Habit Of Never Standing With Their Back To A Door"
  ]
};


/* =========================================================
   2. DOM References
   ========================================================= */

const creatorScreen = document.getElementById("creatorScreen");
const questionScreen = document.getElementById("questionScreen");
const summaryScreen = document.getElementById("summaryScreen");

const characterNameInput = document.getElementById("characterName");
const genderInput = document.getElementById("gender");
const speciesInput = document.getElementById("species");
const ageRangeInput = document.getElementById("ageRange");
const heightInput = document.getElementById("height");
const buildInput = document.getElementById("build");
const eyeColourInput = document.getElementById("eyeColour");
const hairColourInput = document.getElementById("hairColour");
const skinToneInput = document.getElementById("skinTone");
const notableFeatureInput = document.getElementById("notableFeature");

const classCards = document.getElementById("classCards");
const weaponSection = document.getElementById("weaponSection");
const weaponChoices = document.getElementById("weaponChoices");
const beginButton = document.getElementById("beginButton");
const randomiseButton = document.getElementById("randomiseButton");

const questionCounter = document.getElementById("questionCounter");
const progressFill = document.getElementById("progressFill");
const questionText = document.getElementById("questionText");
const answerChoices = document.getElementById("answerChoices");

const sheetName = document.getElementById("sheetName");
const sheetClass = document.getElementById("sheetClass");
const sheetSpecies = document.getElementById("sheetSpecies");
const sheetAppearance = document.getElementById("sheetAppearance");
const sheetHP = document.getElementById("sheetHP");
const sheetWeapon = document.getElementById("sheetWeapon");
const sheetSkills = document.getElementById("sheetSkills");
const sheetSaves = document.getElementById("sheetSaves");
const statsGrid = document.getElementById("statsGrid");

const portraitInitial = document.getElementById("portraitInitial");
const characterPortrait = document.getElementById("characterPortrait");
const generatePortraitButton = document.getElementById("generatePortraitButton");
const portraitStatus = document.getElementById("portraitStatus");

const profileTitle = document.getElementById("profileTitle");
const profileIdentity = document.getElementById("profileIdentity");
const profileSpecies = document.getElementById("profileSpecies");
const profileTraits = document.getElementById("profileTraits");
const profileAlignment = document.getElementById("profileAlignment");
const profileFaith = document.getElementById("profileFaith");
const profileWeakness = document.getElementById("profileWeakness");
const profilePlaystyle = document.getElementById("profilePlaystyle");

const copyCharacterSummaryButton = document.getElementById("copyCharacterSummaryButton");
const copyPortraitPromptButton = document.getElementById("copyPortraitPromptButton");
const downloadPortraitButton = document.getElementById("downloadPortraitButton");
const printCharacterSheetButton = document.getElementById("printCharacterSheetButton");
const exportStatus = document.getElementById("exportStatus");

const printableCharacterSheet = document.getElementById("printableCharacterSheet");
const printName = document.getElementById("printName");
const printSubtitle = document.getElementById("printSubtitle");
const printPortrait = document.getElementById("printPortrait");
const printSpecies = document.getElementById("printSpecies");
const printClass = document.getElementById("printClass");
const printGender = document.getElementById("printGender");
const printAgeRange = document.getElementById("printAgeRange");
const printHeight = document.getElementById("printHeight");
const printBuild = document.getElementById("printBuild");
const printEyes = document.getElementById("printEyes");
const printHair = document.getElementById("printHair");
const printSkin = document.getElementById("printSkin");
const printFeature = document.getElementById("printFeature");
const printHP = document.getElementById("printHP");
const printWeapon = document.getElementById("printWeapon");
const printSkills = document.getElementById("printSkills");
const printSaves = document.getElementById("printSaves");
const printStatsGrid = document.getElementById("printStatsGrid");
const printIdentity = document.getElementById("printIdentity");
const printTraits = document.getElementById("printTraits");
const printAlignment = document.getElementById("printAlignment");
const printFaith = document.getElementById("printFaith");
const printWeakness = document.getElementById("printWeakness");
const printPlaystyle = document.getElementById("printPlaystyle");
const printSpeciesBackground = document.getElementById("printSpeciesBackground");

const restartButton = document.getElementById("restartButton");


/* =========================================================
   3. Small Utility Helpers
   ========================================================= */

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollAbilityScore() {
  const rolls = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)];
  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
}

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

function formatModifier(modifier) {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toTitleCase(text) {
  return text
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(word => word.length > 0)
    .map(word => {
      return word
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-");
    })
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setExportStatus(message) {
  if (exportStatus) {
    exportStatus.textContent = message;
  }
}

function createSafeFileName(name, extension) {
  const safeName = String(name || "dicebound-character")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeName || "dicebound-character"}.${extension}`;
}

function getImageExtensionFromDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") {
    return "png";
  }

  if (dataUrl.startsWith("data:image/jpeg")) {
    return "jpg";
  }

  if (dataUrl.startsWith("data:image/jpg")) {
    return "jpg";
  }

  if (dataUrl.startsWith("data:image/webp")) {
    return "webp";
  }

  if (dataUrl.startsWith("data:image/svg+xml")) {
    return "svg";
  }

  return "png";
}


/* =========================================================
   4. Data Loading
   ========================================================= */

async function fetchJson(filePath) {
  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Could not load ${filePath}. Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Problem loading JSON file: ${filePath}`, error);
    throw error;
  }
}

async function fetchJsonFromPaths(filePaths) {
  let lastError = null;

  for (const filePath of filePaths) {
    try {
      return await fetchJson(filePath);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function updateRandomiseButtonStatus() {
  if (dataLoadingError) {
    randomiseButton.disabled = true;
    randomiseButton.textContent = "Data File Missing";
    return;
  }

  if (!namesLoaded || !classesLoaded || !questionsLoaded || !speciesLoaded) {
    randomiseButton.disabled = true;
    randomiseButton.textContent = "Loading Data...";
    return;
  }

  randomiseButton.disabled = false;
  randomiseButton.textContent = "Randomise Character";
}

async function loadNameData() {
  try {
    const loadedNames = await fetchJsonFromPaths([
      "data/names.json",
      "names.json"
    ]);

    if (!hasItems(loadedNames.firstNames) || !hasItems(loadedNames.lastNames)) {
      throw new Error("names.json must include firstNames and lastNames arrays.");
    }

    nameData = loadedNames;
    namesLoaded = true;
  } catch (error) {
    console.error("Character names could not be loaded.", error);
    namesLoaded = false;
    dataLoadingError = true;
  } finally {
    updateRandomiseButtonStatus();
  }
}

async function loadClassData() {
  try {
    const loadedClassData = await fetchJson("data/classes.json");

    if (!loadedClassData.classes || Object.keys(loadedClassData.classes).length === 0) {
      throw new Error("classes.json must include a classes object.");
    }

    classes = loadedClassData.classes;
    classesLoaded = true;
  } catch (error) {
    console.error("Class data could not be loaded.", error);
    classesLoaded = false;
    dataLoadingError = true;
  } finally {
    updateRandomiseButtonStatus();
  }
}

async function loadQuestionData() {
  try {
    const loadedQuestionData = await fetchJson("data/questions.json");

    if (!hasItems(loadedQuestionData.questions)) {
      throw new Error("questions.json must include a questions array.");
    }

    questions = loadedQuestionData.questions;
    questionsLoaded = true;
  } catch (error) {
    console.error("Question data could not be loaded.", error);
    questionsLoaded = false;
    dataLoadingError = true;
  } finally {
    updateRandomiseButtonStatus();
  }
}

function getValidPool(pool, fallbackPool) {
  return hasItems(pool) ? pool : fallbackPool;
}

function normalisePhysicalTraits(physicalTraits = {}) {
  return {
    heights: getValidPool(physicalTraits.heights, defaultPhysicalTraits.heights),
    builds: getValidPool(physicalTraits.builds, defaultPhysicalTraits.builds),
    eyeColours: getValidPool(physicalTraits.eyeColours, defaultPhysicalTraits.eyeColours),
    hairColours: getValidPool(physicalTraits.hairColours, defaultPhysicalTraits.hairColours),
    skinTones: getValidPool(physicalTraits.skinTones, defaultPhysicalTraits.skinTones),
    notableFeatures: getValidPool(physicalTraits.notableFeatures, defaultPhysicalTraits.notableFeatures)
  };
}

function mergeSpeciesData(speciesCoreData, speciesAppearanceData, speciesProfileData) {
  const speciesCoreList = speciesCoreData.species;
  const appearanceBySpecies = speciesAppearanceData.speciesAppearance;
  const profileBySpecies = speciesProfileData.speciesProfiles;

  return speciesCoreList.map(speciesCore => {
    const appearance = appearanceBySpecies[speciesCore.name] || {};
    const profile = profileBySpecies[speciesCore.name] || {};

    return {
      name: speciesCore.name,
      description: speciesCore.description || "No species background is available.",
      typicalTraits: speciesCore.typicalTraits || [],
      physicalTraits: normalisePhysicalTraits(appearance),
      profileInfluence: profile.profileInfluence || {},
      playstyleBias: profile.playstyleBias || "Flexible Problem-Solver",
      weaknessBias: profile.weaknessBias || "No specific species weakness is defined."
    };
  });
}

async function loadSpeciesData() {
  speciesInput.disabled = true;
  speciesInput.innerHTML = `<option value="">Loading Species...</option>`;

  try {
    const [
      speciesCoreData,
      speciesAppearanceData,
      speciesProfileData
    ] = await Promise.all([
      fetchJson("data/species-core.json"),
      fetchJson("data/species-appearance.json"),
      fetchJson("data/species-profile.json")
    ]);

    if (!hasItems(speciesCoreData.species)) {
      throw new Error("species-core.json must include a species array.");
    }

    if (!speciesAppearanceData.speciesAppearance) {
      throw new Error("species-appearance.json must include a speciesAppearance object.");
    }

    if (!speciesProfileData.speciesProfiles) {
      throw new Error("species-profile.json must include a speciesProfiles object.");
    }

    speciesData = mergeSpeciesData(
      speciesCoreData,
      speciesAppearanceData,
      speciesProfileData
    );

    speciesLoaded = true;
    populateSpeciesOptions();
  } catch (error) {
    console.error("Species data could not be loaded.", error);
    speciesLoaded = false;
    dataLoadingError = true;
    speciesInput.disabled = true;
    speciesInput.innerHTML = `<option value="">Species Data Missing</option>`;
  } finally {
    updateRandomiseButtonStatus();
    updateBeginButton();
  }
}


/* =========================================================
   5. Character Creation Form
   ========================================================= */

function renderClassCards() {
  classCards.innerHTML = "";

  Object.entries(classes).forEach(([className, classInfo]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "class-card";
    card.dataset.className = className;

    card.innerHTML = `
      <h4>${escapeHtml(className)}</h4>
      <p>${escapeHtml(classInfo.description)}</p>
    `;

    card.addEventListener("click", () => {
      selectClass(className);
    });

    classCards.appendChild(card);
  });
}

function selectClass(className) {
  selectedClassName = className;
  selectedWeapon = null;

  document.querySelectorAll(".class-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.className === className);
  });

  renderWeaponChoices();
  updateBeginButton();
}

function renderWeaponChoices() {
  weaponSection.classList.remove("hidden");
  weaponChoices.innerHTML = "";

  classes[selectedClassName].weapons.forEach((weapon, index) => {
    const label = document.createElement("label");
    label.className = "weapon-option";

    label.innerHTML = `
      <input type="radio" name="weapon" value="${index}" />
      ${escapeHtml(weapon.name)}, damage ${escapeHtml(weapon.damage)}, uses ${escapeHtml(weapon.ability)}
    `;

    const input = label.querySelector("input");

    if (selectedWeapon && selectedWeapon.name === weapon.name) {
      input.checked = true;
    }

    input.addEventListener("change", () => {
      selectedWeapon = weapon;
      updateBeginButton();
    });

    weaponChoices.appendChild(label);
  });
}

function updateBeginButton() {
  const requiredFields = [
    characterNameInput.value.trim(),
    genderInput.value,
    speciesInput.value,
    ageRangeInput.value,
    heightInput.value,
    buildInput.value,
    eyeColourInput.value.trim(),
    hairColourInput.value.trim(),
    skinToneInput.value.trim()
  ];

  const fieldsComplete = requiredFields.every(value => value.length > 0);
  beginButton.disabled = !fieldsComplete || !selectedClassName || !selectedWeapon || !questionsLoaded;
}

function getRandomSelectValue(selectElement) {
  const validOptions = Array.from(selectElement.options)
    .map(option => option.value)
    .filter(value => value.length > 0);

  return getRandomItem(validOptions);
}

function setSelectValue(selectElement, value) {
  const existingOption = Array.from(selectElement.options)
    .find(option => option.value === value);

  if (existingOption) {
    selectElement.value = value;
    return;
  }

  const newOption = document.createElement("option");
  newOption.value = value;
  newOption.textContent = value;
  selectElement.appendChild(newOption);
  selectElement.value = value;
}

function createRandomName() {
  if (!namesLoaded || nameData.firstNames.length === 0 || nameData.lastNames.length === 0) {
    return "Unnamed Adventurer";
  }

  const firstName = getRandomItem(nameData.firstNames);
  const lastName = getRandomItem(nameData.lastNames);

  return `${firstName} ${lastName}`;
}

function populateSpeciesOptions() {
  speciesInput.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose...";
  speciesInput.appendChild(placeholder);

  speciesData.forEach(species => {
    const option = document.createElement("option");
    option.value = species.name;
    option.textContent = species.name;
    speciesInput.appendChild(option);
  });

  speciesInput.disabled = false;
}

function getSelectedSpecies() {
  return speciesData.find(species => species.name === speciesInput.value) || {
    name: speciesInput.value,
    description: "No species background is available.",
    typicalTraits: [],
    physicalTraits: normalisePhysicalTraits(),
    profileInfluence: {},
    playstyleBias: "Flexible Problem-Solver",
    weaknessBias: "No specific species weakness is defined."
  };
}

function getRandomPhysicalTrait(species, traitName) {
  const physicalTraits = species.physicalTraits || normalisePhysicalTraits();
  const fallbackPool = defaultPhysicalTraits[traitName];
  const pool = getValidPool(physicalTraits[traitName], fallbackPool);

  return getRandomItem(pool);
}

function randomiseCharacter() {
  if (!namesLoaded || !classesLoaded || !speciesLoaded || !questionsLoaded) {
    return;
  }

  const randomSpecies = getRandomItem(speciesData);

  if (!randomSpecies) {
    return;
  }

  characterNameInput.value = createRandomName();
  genderInput.value = getRandomSelectValue(genderInput);

  if (portraitPresentationInput) {
    portraitPresentationInput.value = getRandomSelectValue(portraitPresentationInput);
  }

  speciesInput.value = randomSpecies.name;
  ageRangeInput.value = getRandomSelectValue(ageRangeInput);

  setSelectValue(heightInput, getRandomPhysicalTrait(randomSpecies, "heights"));
  setSelectValue(buildInput, getRandomPhysicalTrait(randomSpecies, "builds"));

  setSelectValue(eyeColourInput, getRandomPhysicalTrait(randomSpecies, "eyeColours"));
  setSelectValue(hairColourInput, getRandomPhysicalTrait(randomSpecies, "hairColours"));
  setSelectValue(skinToneInput, getRandomPhysicalTrait(randomSpecies, "skinTones"));

  setSelectValue(notableFeatureInput, getRandomSelectValue(notableFeatureInput));

  const classNames = Object.keys(classes);
  const randomClassName = getRandomItem(classNames);

  if (!randomClassName) {
    updateBeginButton();
    return;
  }

  selectClass(randomClassName);

  const weaponsForClass = classes[randomClassName].weapons || [];
  selectedWeapon = getRandomItem(weaponsForClass);

  renderWeaponChoices();
  updateBeginButton();
}

function createStats() {
  const stats = {};

  abilities.forEach(ability => {
    stats[ability] = rollAbilityScore();
  });

  return stats;
}

function createCharacter() {
  const classInfo = classes[selectedClassName];
  const species = getSelectedSpecies();
  const stats = createStats();
  const hp = Math.max(1, classInfo.hitDie + getModifier(stats.CON));

  return {
    name: toTitleCase(characterNameInput.value),
    gender: genderInput.value,
    species,
    ageRange: ageRangeInput.value,
    height: heightInput.value,
    build: buildInput.value,
    eyeColour: toTitleCase(eyeColourInput.value),
    hairColour: toTitleCase(hairColourInput.value),
    skinTone: toTitleCase(skinToneInput.value),
    notableFeature: notableFeatureInput.value.trim()
      ? toTitleCase(notableFeatureInput.value)
      : "No Obvious Unusual Feature",
    className: selectedClassName,
    classInfo,
    weapon: selectedWeapon,
    stats,
    hp,
    generatedProfile: null,
    portraitUrl: null,
    portraitPrompt: null
  };
}


/* =========================================================
   6. Personality Questions And Profile Scoring
   ========================================================= */

function resetScores() {
  profileScores = {
    mercy: 0,
    ruthlessness: 0,
    honour: 0,
    deception: 0,
    faith: 0,
    scepticism: 0,
    courage: 0,
    caution: 0,
    greed: 0,
    generosity: 0,
    loyalty: 0,
    independence: 0,
    curiosity: 0,
    pragmatism: 0,
    violence: 0,
    diplomacy: 0,
    pride: 0,
    humility: 0,
    wisdom: 0,
    ambition: 0,
    confidence: 0,
    justice: 0,
    investigation: 0,
    perception: 0,
    skill: 0
  };
}

function applySpeciesProfileInfluence(species) {
  const influence = species.profileInfluence || {};

  Object.entries(influence).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(profileScores, key)) {
      profileScores[key] = 0;
    }

    profileScores[key] += value;
  });
}

function beginQuestions() {
  if (!questionsLoaded || questions.length === 0) {
    return;
  }

  character = createCharacter();
  currentQuestionIndex = 0;

  resetScores();
  applySpeciesProfileInfluence(character.species);

  creatorScreen.classList.add("hidden");
  questionScreen.classList.remove("hidden");

  renderQuestion();
}

function renderQuestion() {
  const question = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const progressPercentage = (currentQuestionIndex / questions.length) * 100;

  questionCounter.textContent = `Question ${questionNumber} of ${questions.length}`;
  progressFill.style.width = `${progressPercentage}%`;
  questionText.textContent = question.text;
  answerChoices.innerHTML = "";

  question.answers.forEach(answer => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.textContent = answer.label;

    button.addEventListener("click", () => {
      applyScores(answer.scores);
      currentQuestionIndex += 1;

      if (currentQuestionIndex >= questions.length) {
        progressFill.style.width = "100%";
        showSummary();
      } else {
        renderQuestion();
      }
    });

    answerChoices.appendChild(button);
  });
}

function applyScores(scores) {
  Object.entries(scores).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(profileScores, key)) {
      profileScores[key] = 0;
    }

    profileScores[key] += value;
  });
}

function getTopTraits() {
  const excluded = ["faith", "scepticism", "violence", "ruthlessness", "greed"];

  return Object.entries(profileScores)
    .filter(([key]) => !excluded.includes(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => capitalise(key));
}

function getAlignment() {
  const goodScore = profileScores.mercy + profileScores.generosity + profileScores.honour + profileScores.justice;
  const selfishScore = profileScores.ruthlessness + profileScores.greed + profileScores.violence + profileScores.deception;

  const orderScore = profileScores.honour + profileScores.loyalty + profileScores.justice + profileScores.caution;
  const chaosScore = profileScores.independence + profileScores.deception + profileScores.pride + profileScores.ambition;

  let moralAxis = "Neutral";
  let orderAxis = "Neutral";

  if (goodScore - selfishScore >= 5) {
    moralAxis = "Good";
  } else if (selfishScore - goodScore >= 5) {
    moralAxis = "Evil";
  }

  if (orderScore - chaosScore >= 5) {
    orderAxis = "Lawful";
  } else if (chaosScore - orderScore >= 5) {
    orderAxis = "Chaotic";
  }

  if (moralAxis === "Neutral" && orderAxis === "Neutral") {
    return "True Neutral";
  }

  if (moralAxis === "Neutral") {
    return `${orderAxis} Neutral`;
  }

  if (orderAxis === "Neutral") {
    return `Neutral ${moralAxis}`;
  }

  return `${orderAxis} ${moralAxis}`;
}

function getFaithProfile() {
  const faith = profileScores.faith;
  const scepticism = profileScores.scepticism;

  if (faith >= scepticism + 5) {
    return "Religious. This character is likely to respect temples, rituals, omens and divine authority.";
  }

  if (scepticism >= faith + 5) {
    return "Sceptical. This character does not easily trust gods, priests, spirits or powerful beings.";
  }

  if (faith >= 4 && scepticism >= 4) {
    return "Spiritually conflicted. This character believes there may be powers beyond mortal life, but does not trust them blindly.";
  }

  return "Not strongly religious. This character may respect belief, but faith does not define their choices.";
}

function getWeakness() {
  const options = [
    {
      score: profileScores.mercy + profileScores.loyalty,
      text: "Guilt. They may take responsibility for pain they did not cause, especially when vulnerable people suffer."
    },
    {
      score: profileScores.pride + profileScores.confidence,
      text: "Pride. They may struggle to back down, admit weakness or accept help from rivals."
    },
    {
      score: profileScores.scepticism + profileScores.caution,
      text: "Suspicion. They may miss genuine kindness because they are always looking for the hidden threat."
    },
    {
      score: profileScores.greed + profileScores.ambition,
      text: "Greed. They may take dangerous risks when wealth, status or power is within reach."
    },
    {
      score: profileScores.courage + profileScores.violence,
      text: "Recklessness. They may act before thinking when danger, anger or glory is involved."
    },
    {
      score: profileScores.independence + profileScores.caution,
      text: "Isolation. They may keep too much to themselves and struggle to rely on allies."
    }
  ];

  options.sort((a, b) => b.score - a.score);
  return options[0].text;
}

function getPlaystyle() {
  const styles = [
    {
      score: profileScores.diplomacy + profileScores.mercy + profileScores.honour,
      text: "Diplomatic problem-solver. They are likely to talk first, search for context and avoid needless bloodshed."
    },
    {
      score: profileScores.curiosity + profileScores.caution + profileScores.investigation + profileScores.perception,
      text: "Careful investigator. They are likely to inspect clues, question motives and avoid rushing into danger."
    },
    {
      score: profileScores.violence + profileScores.courage + profileScores.confidence,
      text: "Direct combatant. They are likely to confront threats quickly and trust action more than debate."
    },
    {
      score: profileScores.pragmatism + profileScores.caution + profileScores.independence,
      text: "Pragmatic survivor. They are likely to choose the practical route, even when the answer is not morally clean."
    },
    {
      score: profileScores.greed + profileScores.ambition + profileScores.deception,
      text: "Ambitious opportunist. They are likely to notice rewards, leverage secrets and look for personal advantage."
    }
  ];

  styles.sort((a, b) => b.score - a.score);
  return styles[0].text;
}

function getGenderDescription() {
  if (character.gender.toLowerCase() === "prefer not to say") {
    return "whose gender is not stated";
  }

  return `who is ${character.gender}`;
}

function getIdentityText(alignment, traits) {
  const appearance = `${character.name} is a ${character.ageRange} ${character.species.name} ${character.className} ${getGenderDescription()}, with a ${character.height}, ${character.build} frame, ${character.eyeColour} eyes, ${character.hairColour} hair and ${character.skinTone} skin. Their notable feature is: ${character.notableFeature}.`;

  const traitText = `They appear most strongly defined by ${traits.join(", ")}.`;

  return `${appearance} ${traitText} Their choices suggest a ${alignment} outlook.`;
}

function getSpeciesProfileText() {
  const traits = character.species.typicalTraits.length > 0
    ? character.species.typicalTraits.join(", ")
    : "No typical traits listed";

  return `${character.species.description} Typical species traits: ${traits}. Species tendency: ${character.species.playstyleBias}. Possible pressure point: ${character.species.weaknessBias}`;
}


/* =========================================================
   7. Character Sheet Rendering
   ========================================================= */

function setSheetRow(element, label, value) {
  element.className = "sheet-row";
  element.innerHTML = `
    <span class="sheet-label">${escapeHtml(label)}</span>
    <span class="sheet-value">${escapeHtml(value)}</span>
  `;
}

function setAppearanceRow() {
  sheetAppearance.className = "sheet-row sheet-appearance-row";

  const appearanceItems = [
    ["Gender", character.gender],
    ["Height", character.height],
    ["Build", character.build],
    ["Eyes", character.eyeColour],
    ["Hair", character.hairColour],
    ["Skin", character.skinTone]
  ];

  const tags = appearanceItems
    .map(([label, value]) => {
      return `
        <span class="sheet-tag">
          <strong>${escapeHtml(label)}</strong>
          ${escapeHtml(value)}
        </span>
      `;
    })
    .join("");

  sheetAppearance.innerHTML = `
    <span class="sheet-label">Appearance</span>
    <span class="sheet-value sheet-tags">${tags}</span>
  `;
}

function renderCharacterSheet() {
  sheetName.textContent = character.name;

  setSheetRow(sheetClass, "Class", `Level 1 ${character.className}`);
  setSheetRow(sheetSpecies, "Species", character.species.name);
  setAppearanceRow();
  setSheetRow(sheetHP, "Hit Points", character.hp);
  setSheetRow(sheetWeapon, "Weapon", `${character.weapon.name}, ${character.weapon.damage}`);

  sheetSkills.className = "sheet-list";
  sheetSkills.textContent = character.classInfo.skills.join(", ");

  sheetSaves.className = "sheet-list";
  sheetSaves.textContent = character.classInfo.saves.join(", ");

  statsGrid.innerHTML = "";

  abilities.forEach(ability => {
    const score = character.stats[ability];
    const modifier = getModifier(score);

    const stat = document.createElement("div");
    stat.className = "stat";
    stat.innerHTML = `
      <strong>${escapeHtml(ability)}</strong>
      <span>Score ${escapeHtml(score)}</span>
      <span>Modifier ${escapeHtml(formatModifier(modifier))}</span>
    `;

    statsGrid.appendChild(stat);
  });
}


/* =========================================================
   8. Portrait Generation
   ========================================================= */

function resetPortraitDisplay() {
  if (portraitInitial) {
    portraitInitial.classList.remove("hidden");
  }

  if (characterPortrait) {
    characterPortrait.src = "";
    characterPortrait.classList.add("hidden");
  }

  if (portraitStatus) {
    portraitStatus.textContent = "";
  }

  if (generatePortraitButton) {
    generatePortraitButton.disabled = false;
    generatePortraitButton.textContent = "Generate Character Portrait";
  }
}

function showPortraitImage(imageUrl) {
  if (characterPortrait) {
    characterPortrait.src = imageUrl;
    characterPortrait.classList.remove("hidden");
  }

  if (portraitInitial) {
    portraitInitial.classList.add("hidden");
  }
}

async function generateCharacterPortrait() {
  if (!character) {
    return;
  }

  if (!generatePortraitButton || !portraitStatus || !characterPortrait) {
    console.error("Portrait elements are missing from index.html.");
    return;
  }

  generatePortraitButton.disabled = true;
  generatePortraitButton.textContent = "Generating...";
  portraitStatus.textContent = "Generating portrait. This may take a moment.";

  try {
    const response = await fetch(portraitApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ character })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || data.error || "Portrait generation failed.");
    }

    if (!data.imageUrl) {
      throw new Error("No image URL was returned by the server.");
    }

    character.portraitUrl = data.imageUrl;
    character.portraitPrompt = data.prompt || null;

    showPortraitImage(data.imageUrl);
    populatePrintableCharacterSheet();

    portraitStatus.textContent = "Portrait generated.";
    generatePortraitButton.textContent = "Generate Again";
  } catch (error) {
    console.error("Portrait generation failed.", error);
    portraitStatus.textContent = "Could not generate portrait. Check that the server is running.";
    generatePortraitButton.textContent = "Try Again";
  } finally {
    generatePortraitButton.disabled = false;
  }
}


/* =========================================================
   9. Summary Screen
   ========================================================= */

function showSummary() {
  const traits = getTopTraits();
  const alignment = getAlignment();
  const faithProfile = getFaithProfile();
  const weakness = getWeakness();
  const playstyle = getPlaystyle();
  const identityText = getIdentityText(alignment, traits);
  const speciesProfileText = getSpeciesProfileText();

  character.generatedProfile = {
    traits,
    alignment,
    faithProfile,
    weakness,
    playstyle,
    identityText,
    speciesProfileText,
    profileScores: { ...profileScores }
  };

  questionScreen.classList.add("hidden");
  summaryScreen.classList.remove("hidden");

  renderCharacterSheet();
  resetPortraitDisplay();
  populatePrintableCharacterSheet();

  portraitInitial.textContent = character.name.charAt(0).toUpperCase();

  profileTitle.textContent = `${character.name}, The ${traits[0]} ${character.species.name} ${character.className}`;
  profileIdentity.textContent = identityText;
  profileSpecies.textContent = speciesProfileText;
  profileTraits.textContent = traits.join(", ");
  profileAlignment.textContent = alignment;
  profileFaith.textContent = faithProfile;
  profileWeakness.textContent = weakness;
  profilePlaystyle.textContent = playstyle;

  setExportStatus("");
}


/* =========================================================
   10. Printable Character Sheet
   ========================================================= */

function createPrintableFallbackPortrait() {
  if (!character) {
    return "";
  }

  const initial = escapeHtml(character.name.charAt(0).toUpperCase());
  const name = escapeHtml(character.name);
  const subtitle = escapeHtml(`${character.species.name} ${character.className}`);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b120c"/>
      <stop offset="50%" stop-color="#3f2412"/>
      <stop offset="100%" stop-color="#0e0a06"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="400" cy="285" r="120" fill="#d6a84f" opacity="0.16"/>
  <circle cx="400" cy="285" r="95" fill="#0e0a06" stroke="#d6a84f" stroke-width="4"/>
  <text x="400" y="325" text-anchor="middle" fill="#d6a84f" font-size="110" font-family="Georgia, serif" font-weight="700">${initial}</text>
  <text x="400" y="530" text-anchor="middle" fill="#f7ead8" font-size="44" font-family="Georgia, serif" font-weight="700">${name}</text>
  <text x="400" y="590" text-anchor="middle" fill="#f4d9a9" font-size="30" font-family="Arial, sans-serif" font-weight="700">${subtitle}</text>
  <text x="400" y="700" text-anchor="middle" fill="#dbc59d" font-size="22" font-family="Arial, sans-serif">Generate a portrait to include artwork here</text>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getPortraitForExport() {
  if (character?.portraitUrl) {
    return character.portraitUrl;
  }

  if (characterPortrait && characterPortrait.src && !characterPortrait.classList.contains("hidden")) {
    return characterPortrait.src;
  }

  return createPrintableFallbackPortrait();
}

function populatePrintableCharacterSheet() {
  if (!character || !printableCharacterSheet) {
    return;
  }

  const profile = character.generatedProfile || {};

  setText(printName, character.name);
  setText(printSubtitle, `Level 1 ${character.species.name} ${character.className}`);

  if (printPortrait) {
    printPortrait.src = getPortraitForExport();
  }

  setText(printSpecies, character.species.name);
  setText(printClass, `Level 1 ${character.className}`);
  setText(printGender, character.gender);
  setText(printAgeRange, character.ageRange);
  setText(printHeight, character.height);
  setText(printBuild, character.build);
  setText(printEyes, character.eyeColour);
  setText(printHair, character.hairColour);
  setText(printSkin, character.skinTone);
  setText(printFeature, character.notableFeature);

  setText(printHP, character.hp);
  setText(printWeapon, `${character.weapon.name}, ${character.weapon.damage}, uses ${character.weapon.ability}`);
  setText(printSkills, character.classInfo.skills.join(", "));
  setText(printSaves, character.classInfo.saves.join(", "));

  if (printStatsGrid) {
    printStatsGrid.innerHTML = "";

    abilities.forEach(ability => {
      const score = character.stats[ability];
      const modifier = getModifier(score);

      const stat = document.createElement("div");
      stat.className = "print-stat";
      stat.innerHTML = `
        <strong>${escapeHtml(ability)}</strong>
        <span>Score ${escapeHtml(score)}</span>
        <span>Mod ${escapeHtml(formatModifier(modifier))}</span>
      `;

      printStatsGrid.appendChild(stat);
    });
  }

  setText(printIdentity, profile.identityText || "");
  setText(printTraits, profile.traits ? profile.traits.join(", ") : "");
  setText(printAlignment, profile.alignment || "");
  setText(printFaith, profile.faithProfile || "");
  setText(printWeakness, profile.weakness || "");
  setText(printPlaystyle, profile.playstyle || "");
  setText(printSpeciesBackground, profile.speciesProfileText || "");
}


/* =========================================================
   11. Export Tools
   ========================================================= */

function buildCharacterSummaryText() {
  if (!character) {
    return "";
  }

  const profile = character.generatedProfile || {};

  return `
DICEBOUND CHARACTER SUMMARY

Name: ${character.name}
Species: ${character.species.name}
Class: Level 1 ${character.className}
Gender: ${character.gender}
Age Range: ${character.ageRange}

APPEARANCE
Height: ${character.height}
Build: ${character.build}
Eyes: ${character.eyeColour}
Hair: ${character.hairColour}
Skin: ${character.skinTone}
Notable Feature: ${character.notableFeature}

COMBAT BASICS
Hit Points: ${character.hp}
Weapon: ${character.weapon.name}, ${character.weapon.damage}, uses ${character.weapon.ability}
Skill Proficiencies: ${character.classInfo.skills.join(", ")}
Saving Throws: ${character.classInfo.saves.join(", ")}

ABILITY SCORES
${abilities.map(ability => {
  const score = character.stats[ability];
  return `${ability}: ${score} (${formatModifier(getModifier(score))})`;
}).join("\n")}

CHARACTER PROFILE
Title: ${profileTitle.textContent}
Core Traits: ${profile.traits ? profile.traits.join(", ") : ""}
Moral Alignment: ${profile.alignment || ""}
Religious Outlook: ${profile.faithProfile || ""}
Weakness: ${profile.weakness || ""}
Roleplay Style: ${profile.playstyle || ""}

CHARACTER IDENTITY
${profile.identityText || ""}

SPECIES BACKGROUND
${profile.speciesProfileText || ""}
  `.trim();
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "-9999px";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textArea);

  return success;
}

async function copyCharacterSummary() {
  if (!character) {
    setExportStatus("Create a character first.");
    return;
  }

  try {
    const copied = await copyTextToClipboard(buildCharacterSummaryText());
    setExportStatus(copied ? "Character summary copied." : "Could not copy character summary.");
  } catch (error) {
    console.error("Copy character summary failed.", error);
    setExportStatus("Could not copy character summary.");
  }
}

async function copyPortraitPrompt() {
  if (!character) {
    setExportStatus("Create a character first.");
    return;
  }

  if (!character.portraitPrompt) {
    setExportStatus("Generate a portrait first, then copy the prompt.");
    return;
  }

  try {
    const copied = await copyTextToClipboard(character.portraitPrompt);
    setExportStatus(copied ? "Portrait prompt copied." : "Could not copy portrait prompt.");
  } catch (error) {
    console.error("Copy portrait prompt failed.", error);
    setExportStatus("Could not copy portrait prompt.");
  }
}

function downloadPortrait() {
  if (!character) {
    setExportStatus("Create a character first.");
    return;
  }

  if (!character.portraitUrl) {
    setExportStatus("Generate a portrait first, then download it.");
    return;
  }

  const extension = getImageExtensionFromDataUrl(character.portraitUrl);
  const link = document.createElement("a");

  link.href = character.portraitUrl;
  link.download = createSafeFileName(character.name, extension);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setExportStatus("Portrait download started.");
}

function printCharacterSheet() {
  if (!character) {
    setExportStatus("Create a character first.");
    return;
  }

  populatePrintableCharacterSheet();

  setExportStatus("Print view opened. Choose Save as PDF to export.");

  setTimeout(() => {
    window.print();
  }, 150);
}


/* =========================================================
   12. Restart
   ========================================================= */

function restart() {
  selectedClassName = null;
  selectedWeapon = null;
  character = null;
  currentQuestionIndex = 0;

  resetScores();
  resetPortraitDisplay();
  setExportStatus("");

  characterNameInput.value = "";
  genderInput.value = "";
  speciesInput.value = "";
  ageRangeInput.value = "";
  heightInput.value = "";
  buildInput.value = "";
  eyeColourInput.value = "";
  hairColourInput.value = "";
  skinToneInput.value = "";
  notableFeatureInput.value = "";

  document.querySelectorAll(".class-card").forEach(card => {
    card.classList.remove("selected");
  });

  weaponSection.classList.add("hidden");
  weaponChoices.innerHTML = "";

  summaryScreen.classList.add("hidden");
  creatorScreen.classList.remove("hidden");

  updateBeginButton();
}


/* =========================================================
   13. Event Listeners
   ========================================================= */

[
  characterNameInput,
  genderInput,
  speciesInput,
  ageRangeInput,
  heightInput,
  buildInput,
  eyeColourInput,
  hairColourInput,
  skinToneInput,
  notableFeatureInput
].forEach(input => {
  input.addEventListener("input", updateBeginButton);
  input.addEventListener("change", updateBeginButton);
});

beginButton.addEventListener("click", beginQuestions);
randomiseButton.addEventListener("click", randomiseCharacter);
restartButton.addEventListener("click", restart);

if (generatePortraitButton) {
  generatePortraitButton.addEventListener("click", generateCharacterPortrait);
}

if (copyCharacterSummaryButton) {
  copyCharacterSummaryButton.addEventListener("click", copyCharacterSummary);
}

if (copyPortraitPromptButton) {
  copyPortraitPromptButton.addEventListener("click", copyPortraitPrompt);
}

if (downloadPortraitButton) {
  downloadPortraitButton.addEventListener("click", downloadPortrait);
}

if (printCharacterSheetButton) {
  printCharacterSheetButton.addEventListener("click", printCharacterSheet);
}


/* =========================================================
   14. Initialisation
   ========================================================= */

async function initialiseGame() {
  updateRandomiseButtonStatus();
  resetScores();
  resetPortraitDisplay();
  updateBeginButton();

  await Promise.all([
    loadNameData(),
    loadClassData(),
    loadQuestionData(),
    loadSpeciesData()
  ]);

  if (!dataLoadingError) {
    renderClassCards();
  }

  updateRandomiseButtonStatus();
  updateBeginButton();
}

initialiseGame();

