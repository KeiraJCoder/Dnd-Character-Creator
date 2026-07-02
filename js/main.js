/* =========================================================
    Dicebound
    Main Initialisation And Event Wiring
     ========================================================= */

import {
    state
} from "./state.js";

import {
    loadAllData,
    isCoreDataLoaded,
    isAllDataLoaded
} from "./data.js";

import {
    characterFormElements,
    getCharacterFormInputs,
    populateNotableFeatureOptions,
    populateSpeciesOptions,
    randomiseCharacter,
    randomiseNameOnly,
    renderClassCards,
    setNotableFeatureErrorState,
    setNotableFeatureLoadingState,
    setSpeciesErrorState,
    setSpeciesLoadingState,
    updateBeginButton,
    updateNameRandomiseButtonStatus,
    updateRandomiseButtonStatus
} from "./character.js";

import {
    beginQuestions
} from "./profile.js";

import {
    generateCharacterPortrait,
    restart,
    resetPortraitDisplay,
    showSummary
} from "./ui.js";

import {
    copyCharacterSummary,
    copyPortraitPrompt,
    downloadPortrait,
    exportElements,
    populatePrintableCharacterSheet,
    printCharacterSheet,
    setExportStatus
} from "./export.js";


/* =========================================================
    1. Destructure DOM Elements
     ========================================================= */

const {
    beginButton,
    randomiseButton,
    randomiseNameButton
} = characterFormElements;

const {
    copyCharacterSummaryButton,
    copyPortraitPromptButton,
    downloadPortraitButton,
    printCharacterSheetButton
} = exportElements;

const generatePortraitButton = document.getElementById("generatePortraitButton");
const restartButton = document.getElementById("restartButton");


/* =========================================================
    2. Event Listeners
     ========================================================= */

function attachFormEventListeners() {
    getCharacterFormInputs().forEach(input => {
        input.addEventListener("input", updateBeginButton);
        input.addEventListener("change", updateBeginButton);
    });
}

function attachMainButtonEventListeners() {
    if (beginButton) {
        beginButton.addEventListener("click", () => {
            beginQuestions(() => {
                showSummary(() => {
                    populatePrintableCharacterSheet();
                    setExportStatus("");
                });
            });
        });
    }

    if (randomiseNameButton) {
        randomiseNameButton.addEventListener("click", randomiseNameOnly);
    }

    if (randomiseButton) {
        randomiseButton.addEventListener("click", randomiseCharacter);
    }

    if (restartButton) {
        restartButton.addEventListener("click", () => {
            restart(() => {
                setExportStatus("");
            });
        });
    }
}

function attachPortraitEventListeners() {
    if (generatePortraitButton) {
        generatePortraitButton.addEventListener("click", () => {
            generateCharacterPortrait(() => {
                populatePrintableCharacterSheet();
            });
        });
    }
}

function attachExportEventListeners() {
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
}

function attachEventListeners() {
    attachFormEventListeners();
    attachMainButtonEventListeners();
    attachPortraitEventListeners();
    attachExportEventListeners();
}


/* =========================================================
    3. Initial UI State
     ========================================================= */

function prepareLoadingState() {
    setSpeciesLoadingState();
    setNotableFeatureLoadingState();

    updateRandomiseButtonStatus();
    resetPortraitDisplay();
    updateBeginButton();
    setExportStatus("");
}

function renderLoadedData() {
    if (state.loaded.species) {
        populateSpeciesOptions();
    } else {
        setSpeciesErrorState();
    }

    if (state.loaded.notableFeatures) {
        populateNotableFeatureOptions();
    } else {
        setNotableFeatureErrorState();
    }

    if (isCoreDataLoaded()) {
        renderClassCards();
    }

    updateRandomiseButtonStatus();
    updateNameRandomiseButtonStatus();
    updateBeginButton();
}

function logDataStatus() {
    if (isAllDataLoaded()) {
        console.log("Dicebound data loaded successfully.");
        return;
    }

    if (isCoreDataLoaded()) {
        console.warn("Dicebound core data loaded, but optional data may be missing.");
        return;
    }

    console.error("Dicebound could not load all required core data.");
}


/* =========================================================
    4. Initialisation
     ========================================================= */

async function initialiseGame() {
    prepareLoadingState();
    attachEventListeners();

    await loadAllData();

    renderLoadedData();
    logDataStatus();
}

initialiseGame();