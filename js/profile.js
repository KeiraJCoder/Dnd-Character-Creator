/* =========================================================
    Dicebound
    Character Profile And Question Scoring
    ---------------------------------------------------------
    This file controls the personality question flow and turns
    question answers into a generated roleplay profile.

    Responsibilities:
    - create the character before the question flow begins
    - randomise question and answer order
    - apply answer scores to the profile score state
    - lightly apply species profile influence
    - calculate traits, alignment, faith outlook, weakness and
      playstyle
    - create character identity text for the summary and export

    This file should not alter DnD ability scores, hit points,
    class rules, species anatomy rules or portrait prompt logic.
    Those responsibilities belong in character.js, data files and
    the backend portrait services.

    Species profile influence is intentionally light flavour. The
    question answers remain the main source of the final profile.
   ========================================================= */

import {
    defaultText
} from "./config.js";

import {
    state,
    resetProfileScores,
    addProfileScore,
    applyProfileScores,
    setCurrentQuestionIndex,
    moveToNextQuestion
} from "./state.js";

import {
    capitalise,
    shuffleArray
} from "./utils.js";

import {
    createCharacter
} from "./character.js";


/* =========================================================
    1. DOM References
   ========================================================= */

export const profileQuestionElements = {
    creatorScreen: document.getElementById("creatorScreen"),
    questionScreen: document.getElementById("questionScreen"),
    questionCounter: document.getElementById("questionCounter"),
    progressFill: document.getElementById("progressFill"),
    questionText: document.getElementById("questionText"),
    answerChoices: document.getElementById("answerChoices")
};

const {
    creatorScreen,
    questionScreen,
    questionCounter,
    progressFill,
    questionText,
    answerChoices
} = profileQuestionElements;


/* =========================================================
    2. General Helpers
   ========================================================= */

function getScore(scoreName) {
    return Number(state.profileScores?.[scoreName]) || 0;
}

function getSpeciesName(character = state.character) {
    if (typeof character?.species === "string") {
        return character.species;
    }

    return character?.species?.name || "Unknown Species";
}

function normaliseKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function isDragonborn(character = state.character) {
    return normaliseKey(getSpeciesName(character)) === "dragonborn";
}

function getNotableFeatureName(character = state.character) {
    const notableFeature = character?.notableFeature;

    if (typeof notableFeature === "string") {
        return notableFeature || defaultText.noNotableFeature;
    }

    return (
        notableFeature?.name ||
        character?.notableFeatureName ||
        defaultText.noNotableFeature
    );
}

function hasNoObviousNotableFeature(character = state.character) {
    const featureName = getNotableFeatureName(character);

    return (
        normaliseKey(featureName) === normaliseKey(defaultText.noNotableFeature) ||
        normaliseKey(featureName) === "none" ||
        normaliseKey(featureName) === "nonotablefeature"
    );
}


/* =========================================================
    3. Randomised Question Set
   ========================================================= */

let randomisedQuestions = [];

function createRandomisedQuestionSet() {
    const questions = Array.isArray(state.questions)
        ? state.questions
        : [];

    randomisedQuestions = shuffleArray(questions).map(question => {
        return {
            ...question,
            answers: shuffleArray(question.answers || []).map(answer => {
                return {
                    ...answer,
                    scores: {
                        ...(answer.scores || {})
                    }
                };
            })
        };
    });
}

function getActiveQuestions() {
    return randomisedQuestions.length > 0
        ? randomisedQuestions
        : state.questions;
}


/* =========================================================
    4. Question Flow
   ========================================================= */

export function beginQuestions(onComplete) {
    if (!state.loaded.questions || state.questions.length === 0) {
        return;
    }

    createCharacter();
    createRandomisedQuestionSet();
    setCurrentQuestionIndex(0);

    resetProfileScores();
    applySpeciesProfileInfluence(state.character.species);

    if (creatorScreen) {
        creatorScreen.classList.add("hidden");
    }

    if (questionScreen) {
        questionScreen.classList.remove("hidden");
    }

    renderQuestion(onComplete);
}

export function renderQuestion(onComplete) {
    const activeQuestions = getActiveQuestions();

    if (!activeQuestions.length || !activeQuestions[state.currentQuestionIndex]) {
        finishQuestions(onComplete);
        return;
    }

    const question = activeQuestions[state.currentQuestionIndex];
    const questionNumber = state.currentQuestionIndex + 1;
    const totalQuestions = activeQuestions.length;
    const progressPercentage = (state.currentQuestionIndex / totalQuestions) * 100;

    if (questionCounter) {
        questionCounter.textContent = `Question ${questionNumber} of ${totalQuestions}`;
    }

    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }

    if (questionText) {
        questionText.textContent = question.text;
    }

    if (!answerChoices) {
        return;
    }

    answerChoices.innerHTML = "";

    question.answers.forEach(answer => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "choice-button";
        button.textContent = answer.label;

        button.addEventListener("click", () => {
            applyScores(answer.scores || {});
            moveToNextQuestion();

            if (state.currentQuestionIndex >= totalQuestions) {
                finishQuestions(onComplete);
                return;
            }

            renderQuestion(onComplete);
        });

        answerChoices.appendChild(button);
    });
}

export function finishQuestions(onComplete) {
    if (progressFill) {
        progressFill.style.width = "100%";
    }

    if (typeof onComplete === "function") {
        onComplete();
    }
}


/* =========================================================
    5. Score Application
   ========================================================= */

export function applySpeciesProfileInfluence(species) {
    const influence = species?.profileInfluence || {};

    Object.entries(influence).forEach(([key, value]) => {
        addProfileScore(key, value);
    });
}

export function applyScores(scores) {
    applyProfileScores(scores);
}


/* =========================================================
    6. Trait And Alignment Logic
   ========================================================= */

export function getTopTraits() {
    const excluded = [
        "faith",
        "scepticism",
        "violence",
        "ruthlessness",
        "greed"
    ];

    return Object.entries(state.profileScores)
        .filter(([key]) => {
            return !excluded.includes(key);
        })
        .sort((a, b) => {
            return b[1] - a[1];
        })
        .slice(0, 4)
        .map(([key]) => {
            return capitalise(key);
        });
}

export function getAlignment() {
    const goodScore =
        getScore("mercy") +
        getScore("generosity") +
        getScore("honour") +
        getScore("justice");

    const selfishScore =
        getScore("ruthlessness") +
        getScore("greed") +
        getScore("violence") +
        getScore("deception");

    const orderScore =
        getScore("honour") +
        getScore("loyalty") +
        getScore("justice") +
        getScore("caution");

    const chaosScore =
        getScore("independence") +
        getScore("deception") +
        getScore("pride") +
        getScore("ambition");

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


/* =========================================================
    7. Faith, Weakness And Playstyle
   ========================================================= */

export function getFaithProfile() {
    const faith = getScore("faith");
    const scepticism = getScore("scepticism");

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

export function getWeakness() {
    const options = [
        {
            score: getScore("mercy") + getScore("loyalty"),
            text: "Guilt. They may take responsibility for pain they did not cause, especially when vulnerable people suffer."
        },
        {
            score: getScore("pride") + getScore("confidence"),
            text: "Pride. They may struggle to back down, admit weakness or accept help from rivals."
        },
        {
            score: getScore("scepticism") + getScore("caution"),
            text: "Suspicion. They may miss genuine kindness because they are always looking for the hidden threat."
        },
        {
            score: getScore("greed") + getScore("ambition"),
            text: "Greed. They may take dangerous risks when wealth, status or power is within reach."
        },
        {
            score: getScore("courage") + getScore("violence"),
            text: "Recklessness. They may act before thinking when danger, anger or glory is involved."
        },
        {
            score: getScore("independence") + getScore("caution"),
            text: "Isolation. They may keep too much to themselves and struggle to rely on allies."
        }
    ];

    options.sort((a, b) => {
        return b.score - a.score;
    });

    return options[0].text;
}

export function getPlaystyle() {
    const styles = [
        {
            score: getScore("diplomacy") + getScore("mercy") + getScore("honour"),
            text: "Diplomatic problem-solver. They are likely to talk first, search for context and avoid needless bloodshed."
        },
        {
            score: getScore("curiosity") + getScore("caution") + getScore("investigation") + getScore("perception"),
            text: "Careful investigator. They are likely to inspect clues, question motives and avoid rushing into danger."
        },
        {
            score: getScore("violence") + getScore("courage") + getScore("confidence"),
            text: "Direct combatant. They are likely to confront threats quickly and trust action more than debate."
        },
        {
            score: getScore("pragmatism") + getScore("caution") + getScore("independence"),
            text: "Pragmatic survivor. They are likely to choose the practical route, even when the answer is not morally clean."
        },
        {
            score: getScore("greed") + getScore("ambition") + getScore("deception"),
            text: "Ambitious opportunist. They are likely to notice rewards, leverage secrets and look for personal advantage."
        }
    ];

    styles.sort((a, b) => {
        return b.score - a.score;
    });

    return styles[0].text;
}


/* =========================================================
    8. Character Profile Text
   ========================================================= */

export function getGenderDescription(character = state.character) {
    if (!character) {
        return "whose gender is not stated";
    }

    const gender = String(character.gender || "").trim();

    if (!gender || gender.toLowerCase() === "prefer not to say") {
        return "whose gender is not stated";
    }

    return `who is ${gender}`;
}

function getHairDescription(character) {
    const hairColour = String(character.hairColour || "").trim();
    const hairStyle = String(character.hairStyle || "").trim();
    const hairColourText = hairColour.toLowerCase();
    const hairStyleText = hairStyle.toLowerCase();

    if (isDragonborn(character)) {
        if (hairStyleText === "smooth scaled head") {
            return "a smooth scaled draconic head";
        }

        if (hairStyle && hairColour) {
            return `${hairStyleText} with ${hairColourText} head, horn or crest colouring`;
        }

        if (hairStyle) {
            return `${hairStyleText} draconic head detail`;
        }

        if (hairColour) {
            return `${hairColourText} head, horn or crest colouring`;
        }

        return "species-appropriate draconic head detail";
    }

    if (
        hairStyleText === "no hair" ||
        hairStyleText === "bald" ||
        hairStyleText === "shaved head" ||
        hairColourText === "no hair"
    ) {
        return hairStyle || hairColour || "no hair";
    }

    if (hairColour && hairStyle) {
        return `${hairColour} ${hairStyleText}`;
    }

    if (hairColour) {
        return `${hairColour} hair`;
    }

    if (hairStyle) {
        return hairStyleText;
    }

    return "unspecified hair";
}

function getSkinOrScaleDescription(character) {
    const skinTone = String(character.skinTone || "").trim();

    if (isDragonborn(character)) {
        return skinTone
            ? `${skinTone} scales`
            : "unspecified scale colour";
    }

    return skinTone
        ? `${skinTone} skin`
        : "unspecified skin tone";
}

function getNotableFeatureDescription(character) {
    const featureName = getNotableFeatureName(character);

    if (hasNoObviousNotableFeature(character)) {
        return "They have no obvious unusual feature.";
    }

    return `Their notable feature is ${featureName}.`;
}

export function getIdentityText(alignment, traits, character = state.character) {
    if (!character) {
        return "";
    }

    const speciesName = getSpeciesName(character);
    const portraitPresentation = character.portraitPresentation
        ? ` Their portrait presentation is ${character.portraitPresentation}.`
        : "";

    const hairDescription = getHairDescription(character);
    const skinOrScaleDescription = getSkinOrScaleDescription(character);
    const notableFeatureDescription = getNotableFeatureDescription(character);

    const appearance = `${character.name} is a ${character.ageRange} ${speciesName} ${character.className} ${getGenderDescription(character)}, with a ${character.height}, ${character.build} frame, ${character.eyeColour} eyes, ${hairDescription} and ${skinOrScaleDescription}. ${notableFeatureDescription}${portraitPresentation}`;

    const traitText = traits.length > 0
        ? `They appear most strongly defined by ${traits.join(", ")}.`
        : "Their strongest traits are still emerging.";

    return `${appearance} ${traitText} Their choices suggest a ${alignment} outlook.`;
}

export function getSpeciesProfileText(character = state.character) {
    if (!character) {
        return "";
    }

    const speciesName = getSpeciesName(character);
    const species = character.species || {};
    const typicalTraits = Array.isArray(species.typicalTraits) && species.typicalTraits.length > 0
        ? species.typicalTraits.join(", ")
        : defaultText.noTypicalTraits;

    const description = species.description || defaultText.noSpeciesBackground;
    const playstyleBias = species.playstyleBias || defaultText.flexiblePlaystyle;
    const weaknessBias = species.weaknessBias || defaultText.noSpeciesWeakness;

    return `${description} Typical ${speciesName} traits: ${typicalTraits}. Species tendency: ${playstyleBias}. Possible pressure point: ${weaknessBias}`;
}


/* =========================================================
    9. Generated Profile Object
   ========================================================= */

export function createGeneratedProfile(character = state.character) {
    if (!character) {
        return null;
    }

    const traits = getTopTraits();
    const alignment = getAlignment();
    const faithProfile = getFaithProfile();
    const weakness = getWeakness();
    const playstyle = getPlaystyle();
    const identityText = getIdentityText(alignment, traits, character);
    const speciesProfileText = getSpeciesProfileText(character);

    return {
        traits,
        alignment,
        faithProfile,
        weakness,
        playstyle,
        identityText,
        speciesProfileText,
        profileScores: {
            ...state.profileScores
        }
    };
}