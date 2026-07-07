/* =========================================================
    Dicebound
    Character Creation
    ---------------------------------------------------------
    This file controls the frontend character creation form.

    Responsibilities:
    - populate species, class, weapon and appearance options
    - keep species-specific physical traits in sync
    - randomise character creation fields
    - create the final character object used by the question flow,
      summary screen, export tools and portrait generation
    - keep rich notable feature data attached to the character so
      backend portrait prompts can describe scars, horns, tattoos,
      eyes, hands and other visible details accurately

    DnD mechanical notes:
    - Level 1 hit points are calculated from class hit die plus CON
      modifier.
    - Ability scores use a class-aware Standard Array arrangement.
    - Species do not apply ability score bonuses here.
    - Background ability score bonuses should be added later through
      a dedicated backgrounds data file.
   ========================================================= */

import {
    abilities,
    defaultText,
    loadingText
} from "./config.js";

import {
    state,
    setSelectedClassName,
    setSelectedWeapon,
    setCurrentCharacter
} from "./state.js";

import {
    escapeHtml,
    getModifier,
    getRandomItem,
    getRandomSelectValue,
    rollAbilityScore,
    setSelectValue,
    toTitleCase
} from "./utils.js";

import {
    getValidPool,
    normalisePhysicalTraits
} from "./data.js";


/* =========================================================
    1. DOM References
   ========================================================= */

export const characterFormElements = {
    characterNameInput: document.getElementById("characterName"),
    randomiseNameButton: document.getElementById("randomiseNameButton"),
    genderInput: document.getElementById("gender"),
    portraitPresentationInput: document.getElementById("portraitPresentation"),
    speciesInput: document.getElementById("species"),
    ageRangeInput: document.getElementById("ageRange"),
    heightInput: document.getElementById("height"),
    buildInput: document.getElementById("build"),
    eyeColourInput: document.getElementById("eyeColour"),
    hairColourInput: document.getElementById("hairColour"),
    hairStyleInput: document.getElementById("hairStyle"),
    skinToneInput: document.getElementById("skinTone"),
    notableFeatureInput: document.getElementById("notableFeature"),

    hairColourLabel: document.querySelector('label[for="hairColour"]'),
    hairStyleLabel: document.querySelector('label[for="hairStyle"]'),
    skinToneLabel: document.querySelector('label[for="skinTone"]'),

    classCards: document.getElementById("classCards"),
    weaponSection: document.getElementById("weaponSection"),
    weaponChoices: document.getElementById("weaponChoices"),

    beginButton: document.getElementById("beginButton"),
    randomiseButton: document.getElementById("randomiseButton")
};

const {
    characterNameInput,
    randomiseNameButton,
    genderInput,
    portraitPresentationInput,
    speciesInput,
    ageRangeInput,
    heightInput,
    buildInput,
    eyeColourInput,
    hairColourInput,
    hairStyleInput,
    skinToneInput,
    notableFeatureInput,
    hairColourLabel,
    hairStyleLabel,
    skinToneLabel,
    classCards,
    weaponSection,
    weaponChoices,
    beginButton,
    randomiseButton
} = characterFormElements;


/* =========================================================
    2. Rules Helpers
   ========================================================= */

const standardArrayByClass = {
    Barbarian: {
        STR: 15,
        DEX: 13,
        CON: 14,
        INT: 8,
        WIS: 12,
        CHA: 10
    },
    Bard: {
        STR: 8,
        DEX: 14,
        CON: 13,
        INT: 12,
        WIS: 10,
        CHA: 15
    },
    Cleric: {
        STR: 13,
        DEX: 10,
        CON: 14,
        INT: 8,
        WIS: 15,
        CHA: 12
    },
    Druid: {
        STR: 8,
        DEX: 12,
        CON: 14,
        INT: 13,
        WIS: 15,
        CHA: 10
    },
    Fighter: {
        STR: 15,
        DEX: 14,
        CON: 13,
        INT: 8,
        WIS: 10,
        CHA: 12
    },
    Monk: {
        STR: 10,
        DEX: 15,
        CON: 13,
        INT: 8,
        WIS: 14,
        CHA: 12
    },
    Paladin: {
        STR: 15,
        DEX: 8,
        CON: 13,
        INT: 10,
        WIS: 12,
        CHA: 14
    },
    Ranger: {
        STR: 10,
        DEX: 15,
        CON: 13,
        INT: 8,
        WIS: 14,
        CHA: 12
    },
    Rogue: {
        STR: 8,
        DEX: 15,
        CON: 13,
        INT: 14,
        WIS: 12,
        CHA: 10
    },
    Sorcerer: {
        STR: 8,
        DEX: 13,
        CON: 14,
        INT: 10,
        WIS: 12,
        CHA: 15
    },
    Warlock: {
        STR: 8,
        DEX: 14,
        CON: 13,
        INT: 12,
        WIS: 10,
        CHA: 15
    },
    Wizard: {
        STR: 8,
        DEX: 12,
        CON: 13,
        INT: 15,
        WIS: 14,
        CHA: 10
    }
};


/* =========================================================
    3. Loading And Button Status
   ========================================================= */

export function updateNameRandomiseButtonStatus() {
    if (!randomiseNameButton) {
        return;
    }

    if (state.loaded.error) {
        randomiseNameButton.disabled = true;
        randomiseNameButton.textContent = "Data Missing";
        return;
    }

    if (!state.loaded.names) {
        randomiseNameButton.disabled = true;
        randomiseNameButton.textContent = "Loading Names...";
        return;
    }

    randomiseNameButton.disabled = false;
    randomiseNameButton.textContent = "Randomise Name";
}

export function updateRandomiseButtonStatus() {
    updateNameRandomiseButtonStatus();

    if (!randomiseButton) {
        return;
    }

    if (state.loaded.error) {
        randomiseButton.disabled = true;
        randomiseButton.textContent = loadingText.dataFileMissing;
        return;
    }

    if (
        !state.loaded.names ||
        !state.loaded.classes ||
        !state.loaded.questions ||
        !state.loaded.species ||
        !state.loaded.notableFeatures
    ) {
        randomiseButton.disabled = true;
        randomiseButton.textContent = loadingText.loadingData;
        return;
    }

    randomiseButton.disabled = false;
    randomiseButton.textContent = loadingText.randomiseCharacter;
}

export function updateGenderFieldStatus() {
    const hasName = String(characterNameInput?.value || "").trim().length > 0;
    const hasSpecies = String(speciesInput?.value || "").trim().length > 0;
    const canChooseGenderDetails = hasName && hasSpecies;

    if (genderInput) {
        genderInput.disabled = !canChooseGenderDetails;

        if (!canChooseGenderDetails) {
            genderInput.value = "";
        }
    }

    if (portraitPresentationInput) {
        portraitPresentationInput.disabled = !canChooseGenderDetails;

        if (!canChooseGenderDetails) {
            portraitPresentationInput.value = "";
        }
    }
}

export function updateBeginButton() {
    updateGenderFieldStatus();

    if (!beginButton) {
        return;
    }

    const requiredFields = [
        characterNameInput?.value.trim(),
        genderInput?.value,
        portraitPresentationInput?.value,
        speciesInput?.value,
        ageRangeInput?.value,
        heightInput?.value,
        buildInput?.value,
        eyeColourInput?.value.trim(),
        hairColourInput?.value.trim(),
        hairStyleInput?.value.trim(),
        skinToneInput?.value.trim(),
        notableFeatureInput?.value.trim()
    ];

    const fieldsComplete = requiredFields.every(value => {
        return String(value || "").length > 0;
    });

    beginButton.disabled =
        !fieldsComplete ||
        !state.selectedClassName ||
        !state.selectedWeapon ||
        !state.loaded.questions;
}


/* =========================================================
    4. Species, Appearance And Notable Feature Dropdowns
   ========================================================= */

function normaliseOption(value) {
    return String(value || "").trim().toLowerCase();
}

function normaliseKey(value) {
    return normaliseOption(value).replace(/[^a-z0-9]/g, "");
}

function getUniqueOptions(options) {
    const seen = new Set();

    return (Array.isArray(options) ? options : [])
        .map(option => String(option || "").trim())
        .filter(Boolean)
        .filter(option => {
            const key = normaliseKey(option);

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}

function findMatchingOption(options, value) {
    const key = normaliseKey(value);

    return options.find(option => {
        return normaliseKey(option) === key;
    }) || "";
}

function populateSelectOptions(
    selectElement,
    options,
    preserveCurrentValue = true,
    sortOptions = false
) {
    if (!selectElement) {
        return;
    }

    const currentValue = selectElement.value;
    const uniqueOptions = getUniqueOptions(options);

    const finalOptions = sortOptions
        ? [...uniqueOptions].sort((a, b) => {
            return String(a || "").localeCompare(String(b || ""), "en-GB", {
                sensitivity: "base"
            });
        })
        : uniqueOptions;

    selectElement.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = loadingText.choose;
    selectElement.appendChild(placeholder);

    finalOptions.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        selectElement.appendChild(option);
    });

    if (preserveCurrentValue) {
        const matchedOption = findMatchingOption(finalOptions, currentValue);

        if (matchedOption) {
            selectElement.value = matchedOption;
            return;
        }
    }

    selectElement.value = "";
}

function getSpeciesByName(speciesName) {
    return state.speciesData.find(species => {
        return normaliseKey(species.name) === normaliseKey(speciesName);
    }) || null;
}

function getSelectedSpeciesName() {
    return speciesInput?.value || "";
}

function isDragonbornSpecies(speciesName) {
    return normaliseKey(speciesName) === "dragonborn";
}

function updateSpeciesSpecificAppearanceLabels(speciesName = getSelectedSpeciesName()) {
    const isDragonborn = isDragonbornSpecies(speciesName);

    if (hairColourLabel) {
        hairColourLabel.textContent = isDragonborn
            ? "Head, horn or crest colour"
            : "Hair colour";
    }

    if (hairStyleLabel) {
        hairStyleLabel.textContent = isDragonborn
            ? "Head style"
            : "Hair style";
    }

    if (skinToneLabel) {
        skinToneLabel.textContent = isDragonborn
            ? "Scale colour"
            : "Skin tone";
    }
}

export function setSpeciesLoadingState() {
    if (!speciesInput) {
        return;
    }

    speciesInput.disabled = true;
    speciesInput.innerHTML = `<option value="">${escapeHtml(loadingText.loadingSpecies)}</option>`;
}

export function setSpeciesErrorState() {
    if (!speciesInput) {
        return;
    }

    speciesInput.disabled = true;
    speciesInput.innerHTML = `<option value="">${escapeHtml(loadingText.speciesDataMissing)}</option>`;
}

export function populateSpeciesOptions() {
    if (!speciesInput) {
        return;
    }

    speciesInput.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = loadingText.choose;
    speciesInput.appendChild(placeholder);

    [...state.speciesData]
        .sort((a, b) => {
            return String(a.name || "").localeCompare(String(b.name || ""), "en-GB", {
                sensitivity: "base"
            });
        })
        .forEach(species => {
            const option = document.createElement("option");
            option.value = species.name;
            option.textContent = species.name;
            speciesInput.appendChild(option);
        });

    speciesInput.disabled = false;
    updateSpeciesSpecificAppearanceLabels();
}

export function setNotableFeatureLoadingState() {
    if (!notableFeatureInput) {
        return;
    }

    notableFeatureInput.disabled = true;
    notableFeatureInput.innerHTML = `<option value="">${escapeHtml(loadingText.loadingNotableFeatures)}</option>`;
}

export function setNotableFeatureErrorState() {
    if (!notableFeatureInput) {
        return;
    }

    notableFeatureInput.disabled = true;
    notableFeatureInput.innerHTML = `<option value="">${escapeHtml(loadingText.notableFeaturesMissing)}</option>`;
}

function getNotableFeatureName(feature) {
    if (typeof feature === "string") {
        return feature;
    }

    return feature?.name || "";
}

function cloneNotableFeature(feature, fallbackName = defaultText.noNotableFeature) {
    if (feature && typeof feature === "object") {
        return {
            ...feature,
            name: getNotableFeatureName(feature) || fallbackName
        };
    }

    return {
        name: String(feature || fallbackName),
        allowedSpecies: "all"
    };
}

function isNotableFeatureAllowedForSpecies(feature, speciesName) {
    if (typeof feature === "string") {
        return true;
    }

    const allowedSpecies = feature?.allowedSpecies;

    if (!allowedSpecies || allowedSpecies === "all") {
        return true;
    }

    if (!Array.isArray(allowedSpecies)) {
        return false;
    }

    return allowedSpecies.some(species => {
        return normaliseKey(species) === normaliseKey(speciesName);
    });
}

export function getValidNotableFeatureObjectsForSpecies(speciesName = getSelectedSpeciesName()) {
    const fallbackFeature = cloneNotableFeature(defaultText.noNotableFeature);

    if (!Array.isArray(state.notableFeatures) || state.notableFeatures.length === 0) {
        return [fallbackFeature];
    }

    const validFeatures = state.notableFeatures
        .filter(feature => {
            return isNotableFeatureAllowedForSpecies(feature, speciesName);
        })
        .map(feature => {
            return cloneNotableFeature(feature);
        })
        .filter(feature => {
            return Boolean(feature.name);
        });

    if (validFeatures.length === 0) {
        return [fallbackFeature];
    }

    const seen = new Set();

    return validFeatures.filter(feature => {
        const key = normaliseKey(feature.name);

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function getValidNotableFeaturesForSpecies(speciesName = getSelectedSpeciesName()) {
    return getValidNotableFeatureObjectsForSpecies(speciesName)
        .map(feature => {
            return feature.name;
        });
}

export function populateNotableFeatureOptions(
    speciesName = getSelectedSpeciesName(),
    preserveCurrentValue = true
) {
    if (!notableFeatureInput) {
        return;
    }

    const currentValue = notableFeatureInput.value;
    const notableFeatures = getValidNotableFeaturesForSpecies(speciesName);

    notableFeatureInput.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = loadingText.choose;
    notableFeatureInput.appendChild(placeholder);

    const noFeature = findMatchingOption(notableFeatures, defaultText.noNotableFeature);
    const otherFeatures = notableFeatures
        .filter(feature => {
            return normaliseKey(feature) !== normaliseKey(defaultText.noNotableFeature);
        })
        .sort((a, b) => {
            return String(a || "").localeCompare(String(b || ""), "en-GB", {
                sensitivity: "base"
            });
        });

    const orderedFeatures = noFeature
        ? [noFeature, ...otherFeatures]
        : otherFeatures;

    orderedFeatures.forEach(feature => {
        const option = document.createElement("option");
        option.value = feature;
        option.textContent = feature;
        notableFeatureInput.appendChild(option);
    });

    notableFeatureInput.disabled = false;

    if (preserveCurrentValue) {
        const matchedFeature = findMatchingOption(orderedFeatures, currentValue);

        if (matchedFeature) {
            notableFeatureInput.value = matchedFeature;
            return;
        }
    }

    notableFeatureInput.value = noFeature || "";
}

function getSelectedNotableFeature(speciesName = getSelectedSpeciesName()) {
    const selectedFeatureName = notableFeatureInput?.value?.trim() || defaultText.noNotableFeature;
    const validFeatures = getValidNotableFeatureObjectsForSpecies(speciesName);

    const matchedFeature = validFeatures.find(feature => {
        return normaliseKey(feature.name) === normaliseKey(selectedFeatureName);
    });

    if (matchedFeature) {
        return cloneNotableFeature(matchedFeature, selectedFeatureName);
    }

    return cloneNotableFeature(selectedFeatureName);
}

function getPhysicalTraitOptionsForSpecies(species, traitName) {
    const physicalTraits = species?.physicalTraits || normalisePhysicalTraits();
    const fallbackTraits = normalisePhysicalTraits();
    const fallbackPool = fallbackTraits[traitName] || [];
    const pool = getValidPool(physicalTraits[traitName], fallbackPool);

    return getUniqueOptions(pool);
}

export function populatePhysicalTraitOptionsForSpecies(
    species = getSelectedSpecies(),
    preserveCurrentValues = true
) {
    populateSelectOptions(
        heightInput,
        getPhysicalTraitOptionsForSpecies(species, "heights"),
        preserveCurrentValues
    );

    populateSelectOptions(
        buildInput,
        getPhysicalTraitOptionsForSpecies(species, "builds"),
        preserveCurrentValues
    );

    populateSelectOptions(
        eyeColourInput,
        getPhysicalTraitOptionsForSpecies(species, "eyeColours"),
        preserveCurrentValues
    );

    populateSelectOptions(
        hairColourInput,
        getPhysicalTraitOptionsForSpecies(species, "hairColours"),
        preserveCurrentValues
    );

    populateSelectOptions(
        hairStyleInput,
        getPhysicalTraitOptionsForSpecies(species, "hairStyles"),
        preserveCurrentValues,
        true
    );

    populateSelectOptions(
        skinToneInput,
        getPhysicalTraitOptionsForSpecies(species, "skinTones"),
        preserveCurrentValues
    );

    updateSpeciesSpecificAppearanceLabels(species?.name || getSelectedSpeciesName());
}

export function handleSpeciesChange() {
    const selectedSpecies = getSelectedSpecies();
    const selectedSpeciesName = selectedSpecies?.name || "";

    populatePhysicalTraitOptionsForSpecies(selectedSpecies, true);
    populateNotableFeatureOptions(selectedSpeciesName, true);
    updateSpeciesSpecificAppearanceLabels(selectedSpeciesName);
    updateBeginButton();
}

if (speciesInput) {
    speciesInput.addEventListener("change", handleSpeciesChange);
}


/* =========================================================
    5. Class And Weapon Selection
   ========================================================= */

export function renderClassCards() {
    if (!classCards) {
        return;
    }

    classCards.innerHTML = "";

    Object.entries(state.classes)
        .sort(([classNameA], [classNameB]) => {
            return String(classNameA || "").localeCompare(String(classNameB || ""), "en-GB", {
                sensitivity: "base"
            });
        })
        .forEach(([className, classInfo]) => {
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

export function selectClass(className) {
    setSelectedClassName(className);
    setSelectedWeapon(null);

    updateClassCardSelection();
    renderWeaponChoices();
    updateBeginButton();
}

export function updateClassCardSelection() {
    document.querySelectorAll(".class-card").forEach(card => {
        card.classList.toggle(
            "selected",
            card.dataset.className === state.selectedClassName
        );
    });
}

export function renderWeaponChoices() {
    if (!weaponSection || !weaponChoices) {
        return;
    }

    weaponChoices.innerHTML = "";

    if (!state.selectedClassName || !state.classes[state.selectedClassName]) {
        weaponSection.classList.add("hidden");
        return;
    }

    const weapons = state.classes[state.selectedClassName].weapons || [];

    if (weapons.length === 0) {
        weaponSection.classList.add("hidden");
        return;
    }

    weaponSection.classList.remove("hidden");

    weapons.forEach((weapon, index) => {
        const label = document.createElement("label");
        label.className = "weapon-option";

        label.innerHTML = `
            <input type="radio" name="weapon" value="${index}" />
            ${escapeHtml(weapon.name)}, damage ${escapeHtml(weapon.damage)}, uses ${escapeHtml(weapon.ability)}
        `;

        const input = label.querySelector("input");

        if (state.selectedWeapon && state.selectedWeapon.name === weapon.name) {
            input.checked = true;
        }

        input.addEventListener("change", () => {
            setSelectedWeapon(weapon);
            updateBeginButton();
        });

        weaponChoices.appendChild(label);
    });
}


/* =========================================================
    6. Random Character Helpers
   ========================================================= */

export function createRandomName() {
    if (
        !state.loaded.names ||
        state.nameData.firstNames.length === 0 ||
        state.nameData.lastNames.length === 0
    ) {
        return defaultText.unnamedCharacter;
    }

    const firstName = getRandomItem(state.nameData.firstNames);
    const lastName = getRandomItem(state.nameData.lastNames);

    return `${firstName} ${lastName}`;
}

export function randomiseNameOnly() {
    if (!state.loaded.names || !characterNameInput) {
        return;
    }

    characterNameInput.value = createRandomName();

    updateGenderFieldStatus();
    updateBeginButton();
}

export function getSelectedSpecies() {
    const selectedSpeciesName = getSelectedSpeciesName();
    const matchedSpecies = getSpeciesByName(selectedSpeciesName);

    return matchedSpecies || {
        name: selectedSpeciesName,
        description: defaultText.noSpeciesBackground,
        typicalTraits: [],
        physicalTraits: normalisePhysicalTraits(),
        profileInfluence: {},
        playstyleBias: defaultText.flexiblePlaystyle,
        weaknessBias: defaultText.noSpeciesWeakness
    };
}

export function getRandomPhysicalTrait(species, traitName) {
    const physicalTraits = species.physicalTraits || normalisePhysicalTraits();
    const fallbackTraits = normalisePhysicalTraits();
    const fallbackPool = fallbackTraits[traitName] || [];
    const pool = getValidPool(physicalTraits[traitName], fallbackPool);

    return getRandomItem(Array.isArray(pool) ? pool : fallbackPool);
}

export function getRandomNotableFeature(speciesName = getSelectedSpeciesName()) {
    const validFeatures = getValidNotableFeaturesForSpecies(speciesName);

    if (validFeatures.length === 0) {
        return defaultText.noNotableFeature;
    }

    return getRandomItem(validFeatures);
}

export function randomiseCharacter() {
    if (
        !state.loaded.names ||
        !state.loaded.classes ||
        !state.loaded.species ||
        !state.loaded.questions ||
        !state.loaded.notableFeatures
    ) {
        return;
    }

    const randomSpecies = getRandomItem(state.speciesData);

    if (!randomSpecies) {
        return;
    }

    const currentName = String(characterNameInput?.value || "").trim();

    if (!currentName) {
        characterNameInput.value = createRandomName();
    }

    speciesInput.value = randomSpecies.name;

    populatePhysicalTraitOptionsForSpecies(randomSpecies, false);
    populateNotableFeatureOptions(randomSpecies.name, false);

    updateGenderFieldStatus();

    genderInput.value = getRandomSelectValue(genderInput);
    portraitPresentationInput.value = getRandomSelectValue(portraitPresentationInput);
    ageRangeInput.value = getRandomSelectValue(ageRangeInput);

    setSelectValue(heightInput, getRandomPhysicalTrait(randomSpecies, "heights"));
    setSelectValue(buildInput, getRandomPhysicalTrait(randomSpecies, "builds"));
    setSelectValue(eyeColourInput, getRandomPhysicalTrait(randomSpecies, "eyeColours"));
    setSelectValue(hairColourInput, getRandomPhysicalTrait(randomSpecies, "hairColours"));
    setSelectValue(hairStyleInput, getRandomPhysicalTrait(randomSpecies, "hairStyles"));
    setSelectValue(skinToneInput, getRandomPhysicalTrait(randomSpecies, "skinTones"));
    setSelectValue(notableFeatureInput, getRandomNotableFeature(randomSpecies.name));

    const classNames = Object.keys(state.classes);
    const randomClassName = getRandomItem(classNames);

    if (!randomClassName) {
        updateBeginButton();
        return;
    }

    selectClass(randomClassName);

    const weaponsForClass = state.classes[randomClassName].weapons || [];
    const randomWeapon = getRandomItem(weaponsForClass);

    if (randomWeapon) {
        setSelectedWeapon(randomWeapon);
    }

    renderWeaponChoices();
    updateBeginButton();
}


/* =========================================================
    7. Character Object Creation
   ========================================================= */

function createRandomStats() {
    const stats = {};

    abilities.forEach(ability => {
        stats[ability] = rollAbilityScore();
    });

    return stats;
}

export function createStats(className = state.selectedClassName) {
    const standardStats = standardArrayByClass[className];

    if (standardStats) {
        return { ...standardStats };
    }

    return createRandomStats();
}

export function createCharacter() {
    const classInfo = state.classes[state.selectedClassName];
    const species = getSelectedSpecies();

    if (!classInfo) {
        throw new Error("No class has been selected.");
    }

    if (!state.selectedWeapon) {
        throw new Error("No starting weapon has been selected.");
    }

    const selectedNotableFeature = getSelectedNotableFeature(species.name);
    const notableFeatureName = selectedNotableFeature.name || defaultText.noNotableFeature;

    const stats = createStats(state.selectedClassName);
    const hp = Math.max(1, classInfo.hitDie + getModifier(stats.CON));

    const createdCharacter = {
        name: toTitleCase(characterNameInput.value),
        gender: genderInput.value,
        portraitPresentation: portraitPresentationInput.value,
        species,
        ageRange: ageRangeInput.value,
        height: heightInput.value,
        build: buildInput.value,
        eyeColour: toTitleCase(eyeColourInput.value),
        hairColour: toTitleCase(hairColourInput.value),
        hairStyle: toTitleCase(hairStyleInput.value),
        skinTone: toTitleCase(skinToneInput.value),

        notableFeature: selectedNotableFeature,
        notableFeatureName,

        className: state.selectedClassName,
        classInfo,
        weapon: state.selectedWeapon,
        stats,
        hp,

        generatedProfile: null,
        portraitUrl: null,
        portraitPrompt: null
    };

    setCurrentCharacter(createdCharacter);

    return createdCharacter;
}


/* =========================================================
    8. Form Reset
   ========================================================= */

export function clearCharacterForm() {
    if (characterNameInput) characterNameInput.value = "";
    if (genderInput) genderInput.value = "";
    if (portraitPresentationInput) portraitPresentationInput.value = "";
    if (speciesInput) speciesInput.value = "";
    if (ageRangeInput) ageRangeInput.value = "";

    populatePhysicalTraitOptionsForSpecies({
        name: "",
        physicalTraits: normalisePhysicalTraits()
    }, false);

    populateNotableFeatureOptions("", false);
    updateSpeciesSpecificAppearanceLabels("");

    if (heightInput) heightInput.value = "";
    if (buildInput) buildInput.value = "";
    if (eyeColourInput) eyeColourInput.value = "";
    if (hairColourInput) hairColourInput.value = "";
    if (hairStyleInput) hairStyleInput.value = "";
    if (skinToneInput) skinToneInput.value = "";
    if (notableFeatureInput) notableFeatureInput.value = "";

    document.querySelectorAll(".class-card").forEach(card => {
        card.classList.remove("selected");
    });

    if (weaponSection) {
        weaponSection.classList.add("hidden");
    }

    if (weaponChoices) {
        weaponChoices.innerHTML = "";
    }

    updateGenderFieldStatus();
    updateBeginButton();
}

export function getCharacterFormInputs() {
    return [
        characterNameInput,
        genderInput,
        portraitPresentationInput,
        speciesInput,
        ageRangeInput,
        heightInput,
        buildInput,
        eyeColourInput,
        hairColourInput,
        hairStyleInput,
        skinToneInput,
        notableFeatureInput
    ].filter(Boolean);
}