/* =========================================================
    Dicebound
    Character Profile And Question Scoring
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
    2. Randomised Question Set
     ========================================================= */

let randomisedQuestions = [];

function createRandomisedQuestionSet() {
    randomisedQuestions = shuffleArray(state.questions).map(question => {
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
    3. Question Flow
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
            } else {
                renderQuestion(onComplete);
            }
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
    4. Score Application
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
    5. Trait And Alignment Logic
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
        .filter(([key]) => !excluded.includes(key))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key]) => capitalise(key));
}

export function getAlignment() {
    const scores = state.profileScores;

    const goodScore =
        scores.mercy +
        scores.generosity +
        scores.honour +
        scores.justice;

    const selfishScore =
        scores.ruthlessness +
        scores.greed +
        scores.violence +
        scores.deception;

    const orderScore =
        scores.honour +
        scores.loyalty +
        scores.justice +
        scores.caution;

    const chaosScore =
        scores.independence +
        scores.deception +
        scores.pride +
        scores.ambition;

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
    6. Faith, Weakness And Playstyle
     ========================================================= */

export function getFaithProfile() {
    const faith = state.profileScores.faith;
    const scepticism = state.profileScores.scepticism;

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
    const scores = state.profileScores;

    const options = [
        {
            score: scores.mercy + scores.loyalty,
            text: "Guilt. They may take responsibility for pain they did not cause, especially when vulnerable people suffer."
        },
        {
            score: scores.pride + scores.confidence,
            text: "Pride. They may struggle to back down, admit weakness or accept help from rivals."
        },
        {
            score: scores.scepticism + scores.caution,
            text: "Suspicion. They may miss genuine kindness because they are always looking for the hidden threat."
        },
        {
            score: scores.greed + scores.ambition,
            text: "Greed. They may take dangerous risks when wealth, status or power is within reach."
        },
        {
            score: scores.courage + scores.violence,
            text: "Recklessness. They may act before thinking when danger, anger or glory is involved."
        },
        {
            score: scores.independence + scores.caution,
            text: "Isolation. They may keep too much to themselves and struggle to rely on allies."
        }
    ];

    options.sort((a, b) => b.score - a.score);

    return options[0].text;
}

export function getPlaystyle() {
    const scores = state.profileScores;

    const styles = [
        {
            score: scores.diplomacy + scores.mercy + scores.honour,
            text: "Diplomatic problem-solver. They are likely to talk first, search for context and avoid needless bloodshed."
        },
        {
            score: scores.curiosity + scores.caution + scores.investigation + scores.perception,
            text: "Careful investigator. They are likely to inspect clues, question motives and avoid rushing into danger."
        },
        {
            score: scores.violence + scores.courage + scores.confidence,
            text: "Direct combatant. They are likely to confront threats quickly and trust action more than debate."
        },
        {
            score: scores.pragmatism + scores.caution + scores.independence,
            text: "Pragmatic survivor. They are likely to choose the practical route, even when the answer is not morally clean."
        },
        {
            score: scores.greed + scores.ambition + scores.deception,
            text: "Ambitious opportunist. They are likely to notice rewards, leverage secrets and look for personal advantage."
        }
    ];

    styles.sort((a, b) => b.score - a.score);

    return styles[0].text;
}


/* =========================================================
    7. Character Profile Text
     ========================================================= */

export function getGenderDescription(character = state.character) {
    if (!character) {
        return "whose gender is not stated";
    }

    if (character.gender.toLowerCase() === "prefer not to say") {
        return "whose gender is not stated";
    }

    return `who is ${character.gender}`;
}

function getHairDescription(character) {
    const speciesName = String(character.species?.name || "").toLowerCase();
    const hairColour = String(character.hairColour || "").trim();
    const hairStyle = String(character.hairStyle || "").trim();

    if (speciesName === "dragonborn") {
        if (hairStyle && hairColour) {
            return `${hairColour.toLowerCase()} head detail in a ${hairStyle.toLowerCase()} style`;
        }

        if (hairStyle) {
            return `${hairStyle.toLowerCase()} head detail`;
        }

        if (hairColour) {
            return `${hairColour.toLowerCase()} head detail`;
        }

        return "species-appropriate draconic head detail";
    }

    if (
        hairStyle.toLowerCase() === "no hair" ||
        hairStyle.toLowerCase() === "bald" ||
        hairStyle.toLowerCase() === "shaved head" ||
        hairColour.toLowerCase() === "no hair"
    ) {
        return hairStyle || hairColour || "no hair";
    }

    if (hairColour && hairStyle) {
        return `${hairColour} ${hairStyle.toLowerCase()}`;
    }

    if (hairColour) {
        return `${hairColour} hair`;
    }

    if (hairStyle) {
        return hairStyle.toLowerCase();
    }

    return "unspecified hair";
}

export function getIdentityText(alignment, traits, character = state.character) {
    if (!character) {
        return "";
    }

    const portraitPresentation = character.portraitPresentation
        ? ` Their portrait presentation is ${character.portraitPresentation}.`
        : "";

    const hairDescription = getHairDescription(character);

    const appearance = `${character.name} is a ${character.ageRange} ${character.species.name} ${character.className} ${getGenderDescription(character)}, with a ${character.height}, ${character.build} frame, ${character.eyeColour} eyes, ${hairDescription} and ${character.skinTone} skin. Their notable feature is: ${character.notableFeature}.${portraitPresentation}`;

    const traitText = `They appear most strongly defined by ${traits.join(", ")}.`;

    return `${appearance} ${traitText} Their choices suggest a ${alignment} outlook.`;
}

export function getSpeciesProfileText(character = state.character) {
    if (!character) {
        return "";
    }

    const traits = character.species.typicalTraits.length > 0
        ? character.species.typicalTraits.join(", ")
        : defaultText.noTypicalTraits;

    return `${character.species.description} Typical species traits: ${traits}. Species tendency: ${character.species.playstyleBias}. Possible pressure point: ${character.species.weaknessBias}`;
}


/* =========================================================
    8. Generated Profile Object
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
        profileScores: { ...state.profileScores }
    };
}