/* =========================================================
    Dicebound
    Main Initialisation And Event Wiring
    ---------------------------------------------------------
    This file is the frontend entry point for the modular
    Dicebound browser app.

    Responsibilities:
    - prepare the initial loading state
    - load JSON data through data.js
    - render species, notable feature and class options
    - attach form, portrait, export and restart event listeners
    - start the question flow and summary flow
    - keep printable export data refreshed after summary or
      portrait generation

    This file should not contain character creation logic,
    species anatomy rules, portrait prompt logic, data
    normalisation or export formatting. Those responsibilities
    belong in character.js, data.js, promptBuilder.js,
    speciesPromptService.js, ui.js and export.js.
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

let eventListenersAttached = false;
let gameInitialised = false;


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
        beginButton.addEventListener("click", handleBeginButtonClick);
    }

    if (randomiseNameButton) {
        randomiseNameButton.addEventListener("click", randomiseNameOnly);
    }

    if (randomiseButton) {
        randomiseButton.addEventListener("click", randomiseCharacter);
    }

    if (restartButton) {
        restartButton.addEventListener("click", handleRestartButtonClick);
    }
}

function attachPortraitEventListeners() {
    if (generatePortraitButton) {
        generatePortraitButton.addEventListener("click", handleGeneratePortraitButtonClick);
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
    if (eventListenersAttached) {
        return;
    }

    attachFormEventListeners();
    attachMainButtonEventListeners();
    attachPortraitEventListeners();
    attachExportEventListeners();

    eventListenersAttached = true;
}


/* =========================================================
    3. Event Handlers
   ========================================================= */

function handleBeginButtonClick() {
    beginQuestions(() => {
        showSummary(() => {
            populatePrintableCharacterSheet();
            setExportStatus("");
        });
    });
}

function handleGeneratePortraitButtonClick() {
    generateCharacterPortrait(() => {
        populatePrintableCharacterSheet();
    });
}

function handleRestartButtonClick() {
    restart(() => {
        setExportStatus("");
    });
}


/* =========================================================
    4. Initial UI State
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

function renderFailedDataState() {
    setSpeciesErrorState();
    setNotableFeatureErrorState();

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
    5. Initialisation
   ========================================================= */

async function initialiseGame() {
    if (gameInitialised) {
        return;
    }

    gameInitialised = true;

    try {
        prepareLoadingState();
        attachEventListeners();

        await loadAllData();

        renderLoadedData();
        logDataStatus();
    } catch (error) {
        console.error("Dicebound initialisation failed.", error);

        renderFailedDataState();
        setExportStatus("Dicebound could not load the required data files.");
    }
}

function initialiseWhenDomIsReady() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialiseGame);
        return;
    }

    initialiseGame();
}

initialiseWhenDomIsReady();