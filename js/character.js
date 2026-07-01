/* =========================================================
    Dicebound
    Character Creation
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
    genderInput: document.getElementById("gender"),
    portraitPresentationInput: document.getElementById("portraitPresentation"),
    speciesInput: document.getElementById("species"),
    ageRangeInput: document.getElementById("ageRange"),
    heightInput: document.getElementById("height"),
    buildInput: document.getElementById("build"),
    eyeColourInput: document.getElementById("eyeColour"),
    hairColourInput: document.getElementById("hairColour"),
    skinToneInput: document.getElementById("skinTone"),
    notableFeatureInput: document.getElementById("notableFeature"),

    classCards: document.getElementById("classCards"),
    weaponSection: document.getElementById("weaponSection"),
    weaponChoices: document.getElementById("weaponChoices"),

    beginButton: document.getElementById("beginButton"),
    randomiseButton: document.getElementById("randomiseButton")
};

const {
    characterNameInput,
    genderInput,
    portraitPresentationInput,
    speciesInput,
    ageRangeInput,
    heightInput,
    buildInput,
    eyeColourInput,
    hairColourInput,
    skinToneInput,
    notableFeatureInput,
    classCards,
    weaponSection,
    weaponChoices,
    beginButton,
    randomiseButton
} = characterFormElements;


/* =========================================================
    2. Loading And Button Status
     ========================================================= */

export function updateRandomiseButtonStatus() {
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

export function updateBeginButton() {
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
        skinToneInput?.value.trim()
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
    3. Species And Notable Feature Dropdowns
     ========================================================= */

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

export function populateNotableFeatureOptions() {
    if (!notableFeatureInput) {
        return;
    }

    notableFeatureInput.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = loadingText.choose;
    notableFeatureInput.appendChild(placeholder);

    const notableFeatures = state.notableFeatures.length > 0
        ? state.notableFeatures
        : [defaultText.noNotableFeature];

    [...notableFeatures]
        .sort((a, b) => {
            return String(a || "").localeCompare(String(b || ""), "en-GB", {
                sensitivity: "base"
            });
        })
        .forEach(feature => {
            const option = document.createElement("option");
            option.value = feature;
            option.textContent = feature;
            notableFeatureInput.appendChild(option);
        });

    notableFeatureInput.disabled = false;
}


/* =========================================================
    4. Class And Weapon Selection
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
    5. Random Character Helpers
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

export function getSelectedSpecies() {
    return state.speciesData.find(species => {
        return species.name === speciesInput.value;
    }) || {
        name: speciesInput.value,
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
    const fallbackPool = normalisePhysicalTraits()[traitName];
    const pool = getValidPool(physicalTraits[traitName], fallbackPool);

    return getRandomItem(pool);
}

export function getRandomNotableFeature() {
    if (state.notableFeatures.length === 0) {
        return defaultText.noNotableFeature;
    }

    return getRandomItem(state.notableFeatures);
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

    characterNameInput.value = createRandomName();
    genderInput.value = getRandomSelectValue(genderInput);
    portraitPresentationInput.value = getRandomSelectValue(portraitPresentationInput);
    speciesInput.value = randomSpecies.name;
    ageRangeInput.value = getRandomSelectValue(ageRangeInput);

    setSelectValue(heightInput, getRandomPhysicalTrait(randomSpecies, "heights"));
    setSelectValue(buildInput, getRandomPhysicalTrait(randomSpecies, "builds"));
    setSelectValue(eyeColourInput, getRandomPhysicalTrait(randomSpecies, "eyeColours"));
    setSelectValue(hairColourInput, getRandomPhysicalTrait(randomSpecies, "hairColours"));
    setSelectValue(skinToneInput, getRandomPhysicalTrait(randomSpecies, "skinTones"));
    setSelectValue(notableFeatureInput, getRandomNotableFeature());

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
    6. Character Object Creation
     ========================================================= */

export function createStats() {
    const stats = {};

    abilities.forEach(ability => {
        stats[ability] = rollAbilityScore();
    });

    return stats;
}

export function createCharacter() {
    const classInfo = state.classes[state.selectedClassName];
    const species = getSelectedSpecies();
    const stats = createStats();
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
        skinTone: toTitleCase(skinToneInput.value),

        notableFeature: notableFeatureInput.value.trim()
            ? toTitleCase(notableFeatureInput.value)
            : defaultText.noNotableFeature,

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
    7. Form Reset
     ========================================================= */

export function clearCharacterForm() {
    if (characterNameInput) characterNameInput.value = "";
    if (genderInput) genderInput.value = "";
    if (portraitPresentationInput) portraitPresentationInput.value = "";
    if (speciesInput) speciesInput.value = "";
    if (ageRangeInput) ageRangeInput.value = "";
    if (heightInput) heightInput.value = "";
    if (buildInput) buildInput.value = "";
    if (eyeColourInput) eyeColourInput.value = "";
    if (hairColourInput) hairColourInput.value = "";
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
        skinToneInput,
        notableFeatureInput
    ].filter(Boolean);
}