/* =========================================================
    Dicebound
    State
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
    state.nameData = nameData;
    state.loaded.names = true;
}

export function setClassData(classData) {
    state.classes = classData;
    state.loaded.classes = true;
}

export function setQuestionData(questionData) {
    state.questions = questionData;
    state.loaded.questions = true;
}

export function setSpeciesData(speciesData) {
    state.speciesData = speciesData;
    state.loaded.species = true;
}

export function setNotableFeatures(notableFeatures) {
    state.notableFeatures = notableFeatures;
    state.loaded.notableFeatures = true;
}

export function setDataLoadingError() {
    state.loaded.error = true;
}


/* =========================================================
    5. Character Selection Setters
     ========================================================= */

export function setSelectedClassName(className) {
    state.selectedClassName = className;
}

export function setSelectedWeapon(weapon) {
    state.selectedWeapon = weapon;
}

export function setCurrentCharacter(character) {
    state.character = character;
}

export function setCurrentQuestionIndex(index) {
    state.currentQuestionIndex = index;
}

export function moveToNextQuestion() {
    state.currentQuestionIndex += 1;
}


/* =========================================================
    6. Profile Score Updates
     ========================================================= */

export function addProfileScore(key, value) {
    if (!Object.prototype.hasOwnProperty.call(state.profileScores, key)) {
        state.profileScores[key] = 0;
    }

    state.profileScores[key] += value;
}

export function applyProfileScores(scores) {
    Object.entries(scores).forEach(([key, value]) => {
        addProfileScore(key, value);
    });
}