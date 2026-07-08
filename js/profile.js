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
    - calculate traits, title trait, alignment, faith outlook,
      weakness and playstyle
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

function formatProseValue(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function getArticleFor(value) {
    const text = formatProseValue(value);

    if (!text) {
        return "a";
    }

    if (/^(a|e|i|o|u)/.test(text)) {
        return "an";
    }

    return "a";
}

function joinProseList(items) {
    const cleanItems = items
        .map(formatProseValue)
        .filter(Boolean);

    if (cleanItems.length === 0) {
        return "";
    }

    if (cleanItems.length === 1) {
        return cleanItems[0];
    }

    if (cleanItems.length === 2) {
        return `${cleanItems[0]} and ${cleanItems[1]}`;
    }

    return `${cleanItems.slice(0, -1).join(", ")} and ${cleanItems[cleanItems.length - 1]}`;
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
    6. Trait, Title And Alignment Logic
   ========================================================= */

function getTraitDisplayName(scoreKey) {
    const traitNames = {
        mercy: "Merciful",
        ruthlessness: "Ruthless",
        honour: "Honourable",
        deception: "Deceptive",
        faith: "Faithful",
        scepticism: "Sceptical",
        courage: "Courageous",
        caution: "Watchful",
        greed: "Greedy",
        generosity: "Generous",
        loyalty: "Loyal",
        independence: "Independent",
        curiosity: "Curious",
        pragmatism: "Pragmatic",
        violence: "Fierce",
        diplomacy: "Diplomatic",
        pride: "Proud",
        humility: "Humble",
        wisdom: "Wise",
        ambition: "Ambitious",
        confidence: "Confident",
        justice: "Just",
        investigation: "Investigative",
        perception: "Perceptive",
        skill: "Skilled"
    };

    return traitNames[scoreKey] || capitalise(scoreKey);
}

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
        .filter(([, value]) => {
            return Number(value) > 0;
        })
        .sort((a, b) => {
            return b[1] - a[1];
        })
        .slice(0, 4)
        .map(([key]) => {
            return getTraitDisplayName(key);
        });
}

function getTitleOptions() {
    return [
        {
            title: "Merciful",
            score: getScore("mercy") + getScore("generosity") + getScore("humility")
        },
        {
            title: "Honourable",
            score: getScore("honour") + getScore("justice") + getScore("loyalty")
        },
        {
            title: "Courageous",
            score: getScore("courage") + getScore("confidence") + getScore("pride")
        },
        {
            title: "Watchful",
            score: getScore("caution") + getScore("perception") + getScore("wisdom")
        },
        {
            title: "Curious",
            score: getScore("curiosity") + getScore("investigation") + getScore("skill")
        },
        {
            title: "Silver-Tongued",
            score: getScore("diplomacy") + getScore("deception") + getScore("confidence")
        },
        {
            title: "Kind-Hearted",
            score: getScore("mercy") + getScore("generosity") + getScore("loyalty")
        },
        {
            title: "Iron-Willed",
            score: getScore("courage") + getScore("pragmatism") + getScore("independence")
        },
        {
            title: "Wise",
            score: getScore("wisdom") + getScore("humility") + getScore("caution")
        },
        {
            title: "Ambitious",
            score: getScore("ambition") + getScore("pride") + getScore("confidence")
        },
        {
            title: "Independent",
            score: getScore("independence") + getScore("pragmatism") + getScore("scepticism")
        },
        {
            title: "Fierce",
            score: getScore("violence") + getScore("courage") + getScore("ruthlessness")
        },
        {
            title: "Pragmatic",
            score: getScore("pragmatism") + getScore("caution") + getScore("wisdom")
        },
        {
            title: "Devout",
            score: getScore("faith") + getScore("honour") + getScore("humility")
        },
        {
            title: "Restless",
            score: getScore("curiosity") + getScore("ambition") + getScore("independence")
        }
    ];
}

export function getProfileTitleTrait() {
    const titleOptions = getTitleOptions()
        .filter(option => {
            return Number(option.score) > 0;
        })
        .sort((a, b) => {
            return b.score - a.score;
        });

    if (titleOptions.length === 0) {
        return "Adventurous";
    }

    const highestScore = titleOptions[0].score;
    const tiedOptions = titleOptions.filter(option => {
        return option.score === highestScore;
    });

    return shuffleArray(tiedOptions)[0]?.title || "Adventurous";
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

    return `who is ${formatProseValue(gender)}`;
}

function getHairDescription(character) {
    const hairColour = String(character.hairColour || "").trim();
    const hairStyle = String(character.hairStyle || "").trim();
    const hairColourText = formatProseValue(hairColour);
    const hairStyleText = formatProseValue(hairStyle);

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
        return hairStyleText || hairColourText || "no hair";
    }

    if (hairColour && hairStyle) {
        return `${hairColourText} ${hairStyleText}`;
    }

    if (hairColour) {
        return `${hairColourText} hair`;
    }

    if (hairStyle) {
        return hairStyleText;
    }

    return "unspecified hair";
}

function getSkinOrScaleDescription(character) {
    const skinTone = formatProseValue(character.skinTone);

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

    return `Their notable feature is ${formatProseValue(featureName)}.`;
}

function getPortraitPresentationDescription(character) {
    const portraitPresentation = formatProseValue(character?.portraitPresentation);

    if (!portraitPresentation) {
        return "";
    }

    return ` Their portrait presentation is ${portraitPresentation}.`;
}

export function getIdentityText(alignment, traits, character = state.character) {
    if (!character) {
        return "";
    }

    const speciesName = formatProseValue(getSpeciesName(character));
    const className = formatProseValue(character.className);
    const ageRange = formatProseValue(character.ageRange);
    const height = formatProseValue(character.height);
    const build = formatProseValue(character.build);
    const eyeColour = formatProseValue(character.eyeColour);

    const ageSpeciesClass = [
        ageRange,
        speciesName,
        className
    ].filter(Boolean).join(" ");

    const frameDescription = [
        height,
        build
    ].filter(Boolean).join(", ");

    const frameText = frameDescription
        ? `with ${getArticleFor(frameDescription)} ${frameDescription} frame`
        : "with an unspecified frame";

    const hairDescription = getHairDescription(character);
    const skinOrScaleDescription = getSkinOrScaleDescription(character);
    const notableFeatureDescription = getNotableFeatureDescription(character);
    const portraitPresentation = getPortraitPresentationDescription(character);

    const appearance = `${character.name} is ${getArticleFor(ageSpeciesClass)} ${ageSpeciesClass} ${getGenderDescription(character)}, ${frameText}, ${eyeColour || "unspecified"} eyes, ${hairDescription} and ${skinOrScaleDescription}. ${notableFeatureDescription}${portraitPresentation}`;

    const traitText = traits.length > 0
        ? `They appear most strongly defined by ${joinProseList(traits)}.`
        : "Their strongest traits are still emerging.";

    return `${appearance} ${traitText} Their choices suggest a ${formatProseValue(alignment)} outlook.`;
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
    const titleTrait = getProfileTitleTrait();
    const alignment = getAlignment();
    const faithProfile = getFaithProfile();
    const weakness = getWeakness();
    const playstyle = getPlaystyle();
    const identityText = getIdentityText(alignment, traits, character);
    const speciesProfileText = getSpeciesProfileText(character);

    return {
        titleTrait,
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