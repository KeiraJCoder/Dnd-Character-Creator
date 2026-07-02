function createDemoPortrait(character) {
    const name = character.name || "Unnamed Adventurer";
    const species = character.species?.name || "Unknown Species";
    const className = character.className || "Unknown Class";
    const gender = character.gender || "Unknown";
    const ageRange = character.ageRange || "Unknown";
    const height = character.height || "Unknown";
    const build = character.build || "Unknown";
    const eyeColour = character.eyeColour || "Unknown";
    const hairColour = character.hairColour || "Unknown";
    const skinTone = character.skinTone || "Unknown";
    const notableFeature = character.notableFeature || "No notable feature";
    const weaponName = character.weapon?.name || "Unknown Weapon";
    const weaponDamage = character.weapon?.damage || "";
    const profile = character.generatedProfile || {};
    const traits = Array.isArray(profile.traits) && profile.traits.length > 0
        ? profile.traits.slice(0, 4)
        : ["Unwritten", "Mysterious", "Untested"];

    const initials = getInitials(name);
    const classAccent = getClassAccent(className);
    const skinColour = getSkinColour(skinTone);
    const hairColourHex = getHairColour(hairColour);
    const eyeColourHex = getEyeColour(eyeColour);

    const nameLines = splitTextIntoLines(name, 22, 2);
    const detailLines = splitTextIntoLines(`${species} ${className}`, 28, 2);
    const featureLines = splitTextIntoLines(notableFeature, 34, 2);
    const weaponText = weaponDamage ? `${weaponName}, ${weaponDamage}` : weaponName;

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#120c08"/>
            <stop offset="42%" stop-color="#24140b"/>
            <stop offset="100%" stop-color="#050505"/>
        </linearGradient>

        <radialGradient id="glow" cx="50%" cy="28%" r="55%">
            <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="${classAccent}" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <linearGradient id="robe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${classAccent}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#111827" stop-opacity="0.95"/>
        </linearGradient>

        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
    </defs>

    <rect width="1024" height="1024" fill="url(#bg)"/>
    <rect width="1024" height="1024" fill="url(#glow)"/>

    <circle cx="512" cy="140" r="245" fill="${classAccent}" opacity="0.12"/>
    <circle cx="160" cy="165" r="95" fill="#facc15" opacity="0.07"/>
    <circle cx="865" cy="230" r="125" fill="#f5e6c8" opacity="0.05"/>

    <g filter="url(#shadow)">
        <path d="M285 780 C310 580 365 470 512 470 C659 470 714 580 739 780 Z" fill="url(#robe)"/>
        <path d="M330 785 C360 640 405 555 512 555 C619 555 664 640 694 785 Z" fill="#0f172a" opacity="0.38"/>

        <circle cx="512" cy="330" r="150" fill="${skinColour}"/>

        <path d="M365 318 C372 190 442 130 515 130 C602 130 675 202 664 330 C626 286 575 265 508 267 C450 269 400 288 365 318 Z" fill="${hairColourHex}"/>

        <path d="M365 312 C374 215 435 160 512 160 C594 160 653 224 660 315 C622 255 572 230 512 230 C452 230 403 255 365 312 Z" fill="${hairColourHex}" opacity="0.88"/>

        <ellipse cx="455" cy="337" rx="18" ry="11" fill="${eyeColourHex}"/>
        <ellipse cx="569" cy="337" rx="18" ry="11" fill="${eyeColourHex}"/>
        <circle cx="455" cy="337" r="5" fill="#111827"/>
        <circle cx="569" cy="337" r="5" fill="#111827"/>

        <path d="M470 404 C493 424 530 424 554 404" fill="none" stroke="#3f2412" stroke-width="8" stroke-linecap="round" opacity="0.55"/>

        <path d="M368 462 C415 535 608 535 656 462 C626 520 397 520 368 462 Z" fill="#000000" opacity="0.12"/>
    </g>

    <g>
        <rect x="72" y="70" width="235" height="72" rx="18" fill="#000000" opacity="0.3" stroke="#d6a84f" stroke-opacity="0.55"/>
        <text x="190" y="115" text-anchor="middle" fill="#facc15" font-size="28" font-family="Arial, sans-serif" font-weight="700">
            DEMO MODE
        </text>
    </g>

    <g>
        <circle cx="835" cy="140" r="58" fill="#000000" opacity="0.25" stroke="#d6a84f" stroke-opacity="0.65"/>
        <text x="835" y="160" text-anchor="middle" fill="#d6a84f" font-size="46" font-family="Georgia, serif" font-weight="700">
            ${escapeSvgText(initials)}
        </text>
    </g>

    <g>
        <rect x="92" y="790" width="840" height="162" rx="28" fill="#070707" opacity="0.68" stroke="#d6a84f" stroke-opacity="0.45"/>

        ${createSvgTextLines(nameLines, 512, 840, 46, "#f7ead8", 52, "Georgia, serif", "700")}
        ${createSvgTextLines(detailLines, 512, 890, 34, "#f4d9a9", 32, "Arial, sans-serif", "600")}

        <text x="512" y="930" text-anchor="middle" fill="#cbd5e1" font-size="24" font-family="Arial, sans-serif">
            ${escapeSvgText(gender)} • ${escapeSvgText(ageRange)} • ${escapeSvgText(height)} • ${escapeSvgText(build)}
        </text>
    </g>

    <g>
        <rect x="80" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
        <text x="105" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">APPEARANCE</text>
        <text x="105" y="680" fill="#f7ead8" font-size="24" font-family="Georgia, serif">Hair: ${escapeSvgText(hairColour)}</text>
        <text x="105" y="715" fill="#f7ead8" font-size="24" font-family="Georgia, serif">Eyes: ${escapeSvgText(eyeColour)}</text>
    </g>

    <g>
        <rect x="674" y="600" width="270" height="150" rx="22" fill="#000000" opacity="0.38" stroke="#d6a84f" stroke-opacity="0.32"/>
        <text x="699" y="638" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">WEAPON</text>
        ${createSvgTextLines(splitTextIntoLines(weaponText, 17, 2), 699, 680, 30, "#f7ead8", 24, "Georgia, serif", "700", "start")}
    </g>

    <g>
        <rect x="360" y="610" width="304" height="130" rx="22" fill="#000000" opacity="0.34" stroke="#d6a84f" stroke-opacity="0.26"/>
        <text x="512" y="648" text-anchor="middle" fill="#d6a84f" font-size="22" font-family="Arial, sans-serif" font-weight="700">CORE TRAITS</text>
        <text x="512" y="692" text-anchor="middle" fill="#f7ead8" font-size="26" font-family="Georgia, serif">
            ${escapeSvgText(traits.slice(0, 2).join(" • "))}
        </text>
        <text x="512" y="727" text-anchor="middle" fill="#f7ead8" font-size="24" font-family="Georgia, serif">
            ${escapeSvgText(traits.slice(2, 4).join(" • "))}
        </text>
    </g>

    <g>
        <text x="512" y="65" text-anchor="middle" fill="#f7ead8" font-size="28" font-family="Arial, sans-serif" opacity="0.82">
            Dicebound Character Portrait
        </text>
    </g>

    <g>
        <text x="512" y="990" text-anchor="middle" fill="#dbc59d" font-size="19" font-family="Arial, sans-serif" opacity="0.8">
            ${escapeSvgText(featureLines.join(" "))}
        </text>
    </g>
</svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getInitials(name) {
    return String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "A";
}

function splitTextIntoLines(text, maxLength, maxLines) {
    const words = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const lines = [];
    let currentLine = "";

    words.forEach(word => {
        const possibleLine = currentLine ? `${currentLine} ${word}` : word;

        if (possibleLine.length <= maxLength) {
            currentLine = possibleLine;
            return;
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        currentLine = word;
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length > maxLines) {
        const trimmedLines = lines.slice(0, maxLines);
        trimmedLines[maxLines - 1] = `${trimmedLines[maxLines - 1].replace(/\.+$/, "")}...`;
        return trimmedLines;
    }

    return lines;
}

function createSvgTextLines(
    lines,
    x,
    y,
    lineHeight,
    fill,
    fontSize,
    fontFamily,
    fontWeight,
    anchor = "middle"
) {
    return lines
        .map((line, index) => {
            return `
                <text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}">
                    ${escapeSvgText(line)}
                </text>
            `;
        })
        .join("");
}

function getClassAccent(className) {
    const colours = {
        fighter: "#b45309",
        rogue: "#6d28d9",
        ranger: "#15803d",
        cleric: "#ca8a04",
        wizard: "#2563eb"
    };

    return colours[String(className).toLowerCase()] || "#d6a84f";
}

function getSkinColour(skinTone) {
    const colours = {
        pale: "#ead7c5",
        fair: "#e8c7a3",
        olive: "#b89768",
        golden: "#d6a05f",
        bronze: "#a97142",
        "warm brown": "#8b5a3c",
        "deep brown": "#5c3728",
        ashen: "#9ca3af",
        grey: "#9ca3af",
        "pale grey": "#c7c9cc",
        "stone grey": "#8b9096",
        green: "#6b8f5a",
        "grey-green": "#6f8072",
        "yellow-green": "#9a9f45",
        red: "#9f3a2f",
        purple: "#7651a8",
        "blue-grey": "#6f86a3",
        "copper-toned": "#b8734f",
        "red scales": "#9f3a2f",
        "gold scales": "#c49a3a",
        "silver scales": "#cbd5e1",
        "black scales": "#1f2937",
        "blue scales": "#315a9e",
        "green scales": "#2f7d45",
        "bronze scales": "#8a5a2b",
        "copper scales": "#b8734f",
        "white scales": "#e5e7eb"
    };

    return colours[String(skinTone).toLowerCase()] || "#d8b08c";
}

function getHairColour(hairColour) {
    const colours = {
        black: "#111111",
        brown: "#4a2c1a",
        auburn: "#7c2d12",
        red: "#b91c1c",
        blonde: "#d6b25e",
        white: "#f3f4f6",
        silver: "#cbd5e1",
        grey: "#9ca3af",
        "ash-grey": "#858b92",
        copper: "#b87333",
        "dark blue": "#1e3a8a",
        gold: "#d6a84f",
        "no hair": "#d8b08c",
        "horned crest": "#d6a84f",
        "bone crest": "#e5dcc8",
        "spined crest": "#d6a84f",
        "scaled crest": "#d6a84f"
    };

    return colours[String(hairColour).toLowerCase()] || "#4a2c1a";
}

function getEyeColour(eyeColour) {
    const colours = {
        green: "#22c55e",
        blue: "#38bdf8",
        grey: "#94a3b8",
        brown: "#7c4a25",
        hazel: "#a87932",
        amber: "#f59e0b",
        black: "#111827",
        silver: "#cbd5e1",
        violet: "#8b5cf6",
        gold: "#facc15",
        red: "#dc2626",
        yellow: "#facc15",
        white: "#f8fafc"
    };

    return colours[String(eyeColour).toLowerCase()] || "#facc15";
}

function escapeSvgText(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

module.exports = {
    createDemoPortrait
};