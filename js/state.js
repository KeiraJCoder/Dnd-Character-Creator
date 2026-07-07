/* =========================================================
    Dicebound
    Shared Frontend State
    ---------------------------------------------------------
    This file stores shared state for the modular Dicebound
    frontend.

    Responsibilities:
    - hold loaded JSON data
    - track selected class, weapon and current character
    - track the current question index
    - store personality profile scores
    - track which data files have loaded successfully
    - provide small setter and reset helpers used by other
      frontend modules

    This file should not contain character creation rules,
    species anatomy rules, portrait prompt logic, DOM rendering
    or export formatting.

    Character creation belongs in character.js.
    Question scoring and profile text belong in profile.js.
    Data loading belongs in data.js.
    Portrait display belongs in ui.js.
   ========================================================= */


/* =========================================================
    1. Profile Score Defaults
   ========================================================= */

export function createEmptyProfileScores() {
    return {
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


/* =========================================================
    2. Shared App State
   ========================================================= */

export const state = {
    nameData: {
        firstNames: [],
        lastNames: []
    },

    classes: {},

    questions: [],

    speciesData: [],

    notableFeatures: [],

    selectedClassName: null,

    selectedWeapon: null,

    character: null,

    currentQuestionIndex: 0,

    profileScores: createEmptyProfileScores(),

    loaded: {
        names: false,
        classes: false,
        questions: false,
        species: false,
        notableFeatures: false,
        error: false
    }
};


/* =========================================================
    3. State Reset Helpers
   ========================================================= */

export function resetProfileScores() {
    state.profileScores = createEmptyProfileScores();
}

export function resetCharacterProgress() {
    state.selectedClassName = null;
    state.selectedWeapon = null;
    state.character = null;
    state.currentQuestionIndex = 0;

    resetProfileScores();
}

export function resetLoadedState() {
    state.loaded.names = false;
    state.loaded.classes = false;
    state.loaded.questions = false;
    state.loaded.species = false;
    state.loaded.notableFeatures = false;
    state.loaded.error = false;
}


/* =========================================================
    4. Data Setters
   ========================================================= */

export function setNameData(nameData) {
    state.nameData = {
        firstNames: Array.isArray(nameData?.firstNames)
            ? nameData.firstNames
            : [],
        lastNames: Array.isArray(nameData?.lastNames)
            ? nameData.lastNames
            : []
    };

    state.loaded.names = true;
}

export function setClassData(classData) {
    state.classes = classData && typeof classData === "object"
        ? classData
        : {};

    state.loaded.classes = true;
}

export function setQuestionData(questionData) {
    state.questions = Array.isArray(questionData)
        ? questionData
        : [];

    state.loaded.questions = true;
}

export function setSpeciesData(speciesData) {
    state.speciesData = Array.isArray(speciesData)
        ? speciesData
        : [];

    state.loaded.species = true;
}

export function setNotableFeatures(notableFeatures) {
    state.notableFeatures = Array.isArray(notableFeatures)
        ? notableFeatures
        : [];

    state.loaded.notableFeatures = true;
}

export function setDataLoadingError() {
    state.loaded.error = true;
}


/* =========================================================
    5. Character Selection Setters
   ========================================================= */

export function setSelectedClassName(className) {
    state.selectedClassName = className || null;
}

export function setSelectedWeapon(weapon) {
    state.selectedWeapon = weapon || null;
}

export function setCurrentCharacter(character) {
    state.character = character || null;
}

export function updateCurrentCharacter(updates) {
    if (!state.character || !updates || typeof updates !== "object") {
        return;
    }

    state.character = {
        ...state.character,
        ...updates
    };
}

export function setCurrentQuestionIndex(index) {
    const nextIndex = Number(index);

    state.currentQuestionIndex = Number.isInteger(nextIndex) && nextIndex >= 0
        ? nextIndex
        : 0;
}

export function moveToNextQuestion() {
    state.currentQuestionIndex += 1;
}


/* =========================================================
    6. Profile Score Updates
   ========================================================= */

export function addProfileScore(key, value) {
    const scoreKey = String(key || "").trim();
    const scoreValue = Number(value) || 0;

    if (!scoreKey) {
        return;
    }

    if (!Object.prototype.hasOwnProperty.call(state.profileScores, scoreKey)) {
        state.profileScores[scoreKey] = 0;
    }

    state.profileScores[scoreKey] += scoreValue;
}

export function applyProfileScores(scores) {
    if (!scores || typeof scores !== "object") {
        return;
    }

    Object.entries(scores).forEach(([key, value]) => {
        addProfileScore(key, value);
    });
}