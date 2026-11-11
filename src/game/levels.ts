/**
 * Diwali: The Festival of Lights
 * ------------------------------------------------------------------
 * Level data for the adventure. All geometry is in the internal
 * 480 x 270 game resolution. Items and hazards are positioned by
 * their CENTRE point; platforms use top-left + width/height.
 */

export type PlatformStyle = "brick" | "stone" | "wood" | "flower" | "gold" | "roof";
export type ItemKind = "diya" | "laddoo" | "gift";
export type HazardKind = "flame" | "chakra" | "spirit" | "rocket" | "thorn";

export interface PlatformDef {
  x: number; y: number; w: number; h: number; style: PlatformStyle;
}

export interface ItemDef {
  id: string; kind: ItemKind; x: number; y: number;
}

export interface HazardDef {
  kind: HazardKind; x: number; y: number; w: number; h: number;
  axis?: "x" | "y"; range?: number; speed?: number; phase?: number;
}

export interface Theme {
  sky: [string, string, string];
  far: string;
  mid: string;
  ground: string;
  groundTop: string;
  platform: string;
  accent: string;
  accent2: string;
  glow: string;
  particle: string;
  moon: string;
}

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  location: string;
  description: string;
  width: number;
  requiredDiyas: number;
  theme: Theme;
  platforms: PlatformDef[];
  items: ItemDef[];
  hazards: HazardDef[];
  checkpoints: { x: number; y: number }[];
  goal: { x: number; y: number };
  spawn: { x: number; y: number };
  emoji: string;
  cardGradient: string;
  hazardHint: string;
}

export const GROUND_Y = 234;
export const VIEW_W = 480;
export const VIEW_H = 270;

const P = (x: number, y: number, w: number, h = 16, style: PlatformStyle = "brick"): PlatformDef => ({ x, y, w, h, style });

type ItemSpec = [ItemKind, number, number];
const items = (specs: ItemSpec[], prefix: string): ItemDef[] =>
  specs.map(([kind, x, y], i) => ({ id: `${prefix}-${i}`, kind, x, y }));

const H = (
  kind: HazardKind, x: number, y: number, w: number, h: number,
  axis: "x" | "y" = "x", range = 0, speed = 1.2, phase = 0,
): HazardDef => ({ kind, x, y, w, h, axis, range, speed, phase });

/* ------------------------------------------------------------------ */
/* 1. THE DIWALI VILLAGE                                               */
/* ------------------------------------------------------------------ */
const village: LevelDef = {
  id: 0,
  name: "The Diwali Village",
  subtitle: "Where every doorway wears a garland",
  location: "Village of Amarpur",
  description: "Clay lamps line the lanes and fireworks bloom above the rooftops. Gather the first flames and wake the old toran gate.",
  width: 2420,
  requiredDiyas: 8,
  emoji: "🏠",
  cardGradient: "linear-gradient(180deg,#3b1a63 0%,#7a3070 48%,#e0744b 100%)",
  hazardHint: "Dancing flames patrol the lanes. Jump them!",
  theme: {
    sky: ["#1a0b3c", "#3c1c62", "#8a3f6b"],
    far: "#2a1446", mid: "#3c1b4f", ground: "#3a1f45", groundTop: "#a2604f",
    platform: "#4b2a5a", accent: "#ffc85c", accent2: "#ff7d5c",
    glow: "#ffb347", particle: "#ffd27a", moon: "#fff3c9",
  },
  platforms: [
    P(0, GROUND_Y, 600, 40, "brick"),
    P(640, GROUND_Y, 480, 40, "brick"),
    P(1160, GROUND_Y, 320, 40, "brick"),
    P(1520, GROUND_Y, 900, 40, "brick"),
    P(240, 192, 88, 14, "wood"),
    P(390, 158, 72, 14, "wood"),
    P(540, 196, 60, 14, "wood"),
    P(700, 188, 104, 14, "wood"),
    P(865, 154, 76, 14, "wood"),
    P(1000, 196, 84, 14, "wood"),
    P(1200, 182, 80, 14, "wood"),
    P(1310, 146, 72, 14, "wood"),
    P(1600, 180, 96, 14, "wood"),
    P(1770, 146, 80, 14, "wood"),
    P(1930, 184, 100, 14, "wood"),
    P(2090, 148, 86, 14, "wood"),
    P(2240, 188, 80, 14, "wood"),
  ],
  items: items([
    ["diya", 130, 214], ["diya", 260, 166], ["diya", 420, 138], ["diya", 520, 214],
    ["diya", 562, 174], ["diya", 722, 166], ["diya", 898, 132], ["diya", 1042, 172],
    ["diya", 1238, 160], ["diya", 1350, 124], ["diya", 1670, 156], ["diya", 1810, 126],
    ["diya", 1940, 212], ["diya", 2085, 132], ["diya", 2245, 168], ["diya", 2320, 212],
    ["laddoo", 200, 212], ["laddoo", 350, 120], ["laddoo", 700, 212], ["laddoo", 1110, 150],
    ["laddoo", 1560, 158], ["laddoo", 1900, 178], ["laddoo", 2280, 138],
    ["gift", 898, 102], ["gift", 2085, 96],
  ], "v"),
  hazards: [
    H("flame", 380, 214, 18, 26, "x", 80, 1.1),
    H("spirit", 620, 168, 16, 18, "y", 26, 1.6),
    H("thorn", 800, 228, 38, 12),
    H("flame", 1120, 214, 18, 26, "x", 70, 1.3, 1.4),
    H("chakra", 1500, 188, 18, 18, "y", 30, 1.7),
    H("thorn", 1850, 228, 38, 12),
    H("spirit", 2000, 170, 16, 18, "y", 30, 1.9, 2),
    H("flame", 2200, 214, 18, 26, "x", 90, 1.2),
  ],
  checkpoints: [{ x: 1430, y: GROUND_Y }],
  goal: { x: 2350, y: GROUND_Y },
  spawn: { x: 70, y: GROUND_Y },
};

/* ------------------------------------------------------------------ */
/* 2. THE RANGOLI GARDEN                                               */
/* ------------------------------------------------------------------ */
const garden: LevelDef = {
  id: 1,
  name: "The Rangoli Garden",
  subtitle: "Petals, patterns and moonlit lotus pools",
  location: "Bagiya of a Thousand Colours",
  description: "A garden embroidered with rangoli. Leap across lotus leaves, dodge thorn vines and gather the lamps hidden among the blossoms.",
  width: 2600,
  requiredDiyas: 10,
  emoji: "🌸",
  cardGradient: "linear-gradient(180deg,#072c46 0%,#0d5b58 50%,#e9739b 100%)",
  hazardHint: "Thorny vines hide in the flowerbeds.",
  theme: {
    sky: ["#061d3a", "#0b3d4d", "#16665f"],
    far: "#0b343e", mid: "#0f4344", ground: "#17463d", groundTop: "#7fd0a3",
    platform: "#1b5e50", accent: "#ff9fc0", accent2: "#ffd166",
    glow: "#6ff2ca", particle: "#ffb8d6", moon: "#d7fff1",
  },
  platforms: [
    P(0, GROUND_Y, 460, 36, "flower"),
    P(520, GROUND_Y, 380, 36, "flower"),
    P(960, GROUND_Y, 300, 36, "flower"),
    P(1320, GROUND_Y, 500, 36, "flower"),
    P(1880, GROUND_Y, 720, 36, "flower"),
    P(180, 196, 90, 14, "flower"),
    P(320, 160, 80, 14, "flower"),
    P(560, 186, 100, 14, "flower"),
    P(730, 152, 70, 14, "flower"),
    P(880, 118, 60, 14, "flower"),
    P(1060, 184, 90, 14, "flower"),
    P(1180, 146, 76, 14, "flower"),
    P(1400, 196, 70, 14, "flower"),
    P(1550, 164, 90, 14, "flower"),
    P(1700, 132, 70, 14, "flower"),
    P(1920, 186, 100, 14, "flower"),
    P(2080, 150, 80, 14, "flower"),
    P(2240, 114, 64, 14, "flower"),
    P(2360, 178, 80, 14, "flower"),
  ],
  items: items([
    ["diya", 120, 212], ["diya", 250, 174], ["diya", 358, 138], ["diya", 540, 212],
    ["diya", 602, 164], ["diya", 768, 130], ["diya", 1010, 212], ["diya", 1092, 162],
    ["diya", 1225, 124], ["diya", 1420, 174], ["diya", 1560, 142], ["diya", 1700, 110],
    ["diya", 1980, 164], ["diya", 2130, 128], ["diya", 2290, 92], ["diya", 2400, 156],
    ["diya", 2490, 212],
    ["laddoo", 400, 212], ["laddoo", 690, 212], ["laddoo", 970, 150], ["laddoo", 1360, 212],
    ["laddoo", 1840, 212], ["laddoo", 2340, 212],
    ["gift", 768, 100], ["gift", 2130, 96],
  ], "g"),
  hazards: [
    H("flame", 280, 214, 18, 26, "x", 60, 1.2),
    H("spirit", 860, 150, 16, 18, "y", 30, 1.7),
    H("thorn", 990, 228, 40, 12),
    H("flame", 740, 214, 18, 26, "x", 90, 1.4, 1),
    H("spirit", 1250, 140, 16, 18, "y", 26, 2),
    H("flame", 1450, 214, 18, 26, "x", 70, 1.6),
    H("chakra", 1680, 150, 18, 18, "y", 35, 1.6),
    H("thorn", 1810, 228, 34, 12),
    H("flame", 2100, 214, 18, 26, "x", 60, 1.4, 2),
    H("spirit", 2400, 140, 16, 18, "y", 30, 1.9),
  ],
  checkpoints: [{ x: 1400, y: GROUND_Y }],
  goal: { x: 2500, y: GROUND_Y },
  spawn: { x: 70, y: GROUND_Y },
};

/* ------------------------------------------------------------------ */
/* 3. THE MAGICAL TEMPLE                                               */
/* ------------------------------------------------------------------ */
const temple: LevelDef = {
  id: 2,
  name: "The Magical Temple",
  subtitle: "Bells that ring with golden light",
  location: "Shri Deepak Mandir",
  description: "Climb the floating stone terraces of an old mountain temple. Sacred flames drift between the pillars, guarding an ancient flame.",
  width: 2680,
  requiredDiyas: 11,
  emoji: "🛕",
  cardGradient: "linear-gradient(180deg,#160f45 0%,#3b2476 50%,#c07a3a 100%)",
  hazardHint: "Sacred flames drift on the breeze — keep moving.",
  theme: {
    sky: ["#0d0a2e", "#241a58", "#4e2f70"],
    far: "#1c1845", mid: "#2b2054", ground: "#2e2a55", groundTop: "#c7a15c",
    platform: "#3a3563", accent: "#ffd479", accent2: "#ff9d5c",
    glow: "#ffe1a1", particle: "#ffd479", moon: "#fff4d6",
  },
  platforms: [
    P(0, GROUND_Y, 520, 36, "stone"),
    P(580, GROUND_Y, 380, 36, "stone"),
    P(1020, GROUND_Y, 460, 36, "stone"),
    P(1540, GROUND_Y, 340, 36, "stone"),
    P(1940, GROUND_Y, 740, 36, "stone"),
    P(140, 192, 90, 14, "gold"),
    P(300, 156, 70, 14, "gold"),
    P(450, 120, 64, 14, "gold"),
    P(650, 186, 90, 14, "gold"),
    P(800, 148, 76, 14, "gold"),
    P(950, 110, 70, 14, "gold"),
    P(1120, 184, 90, 14, "gold"),
    P(1290, 150, 80, 14, "gold"),
    P(1420, 118, 70, 14, "gold"),
    P(1620, 186, 92, 14, "gold"),
    P(1770, 150, 80, 14, "gold"),
    P(1890, 116, 70, 14, "gold"),
    P(2010, 184, 90, 14, "gold"),
    P(2180, 148, 70, 14, "gold"),
    P(2330, 112, 64, 14, "gold"),
    P(2470, 180, 80, 14, "gold"),
  ],
  items: items([
    ["diya", 120, 212], ["diya", 240, 172], ["diya", 360, 136], ["diya", 470, 174],
    ["diya", 610, 212], ["diya", 680, 166], ["diya", 810, 128], ["diya", 950, 90],
    ["diya", 1100, 162], ["diya", 1230, 130], ["diya", 1390, 178], ["diya", 1600, 212],
    ["diya", 1660, 166], ["diya", 1790, 124], ["diya", 1970, 212], ["diya", 2100, 162],
    ["diya", 2200, 124], ["diya", 2390, 212], ["diya", 2500, 150], ["diya", 2580, 212],
    ["laddoo", 300, 212], ["laddoo", 760, 212], ["laddoo", 1230, 98], ["laddoo", 1700, 212],
    ["laddoo", 2160, 110], ["laddoo", 2460, 212],
    ["gift", 950, 72], ["gift", 2200, 94], ["gift", 2580, 192],
  ], "t"),
  hazards: [
    H("flame", 250, 214, 18, 26, "x", 60, 1.2),
    H("thorn", 700, 228, 38, 12),
    H("spirit", 880, 140, 16, 18, "y", 32, 1.8),
    H("chakra", 1150, 130, 18, 18, "y", 36, 1.5),
    H("flame", 1620, 214, 18, 26, "x", 70, 1.5, 1),
    H("thorn", 1680, 228, 38, 12),
    H("spirit", 1850, 160, 16, 18, "y", 28, 2.1),
    H("thorn", 2080, 228, 38, 12),
    H("chakra", 2260, 130, 18, 18, "y", 34, 1.7),
    H("flame", 2450, 214, 18, 26, "x", 80, 1.4),
    H("rocket", 1360, 170, 14, 24, "y", 26, 1.5),
  ],
  checkpoints: [{ x: 1420, y: GROUND_Y }],
  goal: { x: 2610, y: GROUND_Y },
  spawn: { x: 70, y: GROUND_Y },
};

/* ------------------------------------------------------------------ */
/* 4. THE FIREWORKS FESTIVAL                                           */
/* ------------------------------------------------------------------ */
const fireworks: LevelDef = {
  id: 3,
  name: "The Fireworks Festival",
  subtitle: "Rooftops beneath a blooming sky",
  location: "Aasman Rooftop Bazaar",
  description: "Race over the rooftops as rockets climb and burst overhead. Firework launchers crowd the terraces, so time every leap.",
  width: 2820,
  requiredDiyas: 12,
  emoji: "🎆",
  cardGradient: "linear-gradient(180deg,#070b2e 0%,#251658 50%,#c33f74 100%)",
  hazardHint: "Rockets launch from the rooftops. Watch their flight.",
  theme: {
    sky: ["#05061c", "#131044", "#42165c"],
    far: "#141336", mid: "#22204c", ground: "#25213f", groundTop: "#c26a54",
    platform: "#332c53", accent: "#ff9ec8", accent2: "#7ae8ff",
    glow: "#ffcf6b", particle: "#8de6ff", moon: "#f4eaff",
  },
  platforms: [
    P(0, GROUND_Y, 400, 38, "roof"),
    P(470, GROUND_Y, 340, 38, "roof"),
    P(880, GROUND_Y, 320, 38, "roof"),
    P(1270, GROUND_Y, 420, 38, "roof"),
    P(1750, GROUND_Y, 380, 38, "roof"),
    P(2200, GROUND_Y, 620, 38, "roof"),
    P(110, 198, 110, 14, "wood"),
    P(280, 162, 80, 14, "wood"),
    P(430, 126, 70, 14, "wood"),
    P(560, 190, 90, 14, "wood"),
    P(720, 154, 80, 14, "wood"),
    P(830, 112, 70, 14, "wood"),
    P(960, 166, 90, 14, "wood"),
    P(1100, 194, 90, 14, "wood"),
    P(1240, 140, 86, 14, "wood"),
    P(1390, 104, 70, 14, "wood"),
    P(1520, 184, 90, 14, "wood"),
    P(1660, 146, 80, 14, "wood"),
    P(1830, 190, 90, 14, "wood"),
    P(1970, 140, 86, 14, "wood"),
    P(2120, 176, 90, 14, "wood"),
    P(2290, 134, 80, 14, "wood"),
    P(2440, 174, 90, 14, "wood"),
    P(2590, 128, 70, 14, "wood"),
    P(2700, 190, 82, 14, "wood"),
  ],
  items: items([
    ["diya", 120, 212], ["diya", 250, 168], ["diya", 390, 120], ["diya", 520, 212],
    ["diya", 600, 160], ["diya", 760, 122], ["diya", 920, 212], ["diya", 1020, 160],
    ["diya", 1150, 116], ["diya", 1310, 212], ["diya", 1450, 140], ["diya", 1600, 90],
    ["diya", 1690, 212], ["diya", 1820, 154], ["diya", 1960, 212], ["diya", 2090, 120],
    ["diya", 2250, 212], ["diya", 2400, 146], ["diya", 2550, 104], ["diya", 2670, 156],
    ["laddoo", 350, 212], ["laddoo", 580, 168], ["laddoo", 980, 196], ["laddoo", 1360, 214],
    ["laddoo", 1900, 160], ["laddoo", 2340, 214], ["laddoo", 2760, 214],
    ["gift", 760, 100], ["gift", 1600, 68], ["gift", 2550, 82],
  ], "f"),
  hazards: [
    H("rocket", 700, 150, 14, 24, "y", 24, 1.6),
    H("chakra", 850, 150, 18, 18, "x", 50, 1.5),
    H("thorn", 1070, 228, 40, 12),
    H("rocket", 1180, 140, 14, 24, "y", 30, 1.8, 1),
    H("rocket", 1500, 130, 14, 24, "y", 28, 1.7, 2),
    H("chakra", 1700, 180, 18, 18, "x", 45, 1.6),
    H("rocket", 1980, 150, 14, 24, "y", 32, 1.9),
    H("thorn", 2070, 228, 40, 12),
    H("rocket", 2330, 130, 14, 24, "y", 30, 1.8, 1),
    H("flame", 2480, 214, 18, 26, "x", 70, 1.5),
    H("rocket", 2620, 140, 14, 24, "y", 26, 2),
  ],
  checkpoints: [{ x: 1570, y: GROUND_Y }],
  goal: { x: 2760, y: GROUND_Y },
  spawn: { x: 60, y: GROUND_Y },
};

/* ------------------------------------------------------------------ */
/* 5. THE GRAND DIWALI CELEBRATION                                     */
/* ------------------------------------------------------------------ */
const celebration: LevelDef = {
  id: 4,
  name: "The Grand Celebration",
  subtitle: "A palace of a thousand lights",
  location: "Deepmahal Palace",
  description: "The final night. Fireworks crown the palace domes and every lantern burns gold. Light the last lamps and bring the festival home.",
  width: 3000,
  requiredDiyas: 12,
  emoji: "👑",
  cardGradient: "linear-gradient(180deg,#2a0a3d 0%,#7a2354 50%,#ffb45c 100%)",
  hazardHint: "The palace guardians are quick. Use your double jump!",
  theme: {
    sky: ["#1b0630", "#461146", "#8f3359"],
    far: "#2c103d", mid: "#441a46", ground: "#3f1b3e", groundTop: "#e2a95e",
    platform: "#542a52", accent: "#ffd479", accent2: "#ff7fa8",
    glow: "#ffcf6b", particle: "#ffe59d", moon: "#fff6dc",
  },
  platforms: [
    P(0, GROUND_Y, 520, 36, "gold"),
    P(590, GROUND_Y, 400, 36, "gold"),
    P(1050, GROUND_Y, 360, 36, "gold"),
    P(1470, GROUND_Y, 520, 36, "gold"),
    P(2050, GROUND_Y, 950, 36, "gold"),
    P(140, 190, 96, 14, "gold"),
    P(300, 154, 80, 14, "gold"),
    P(460, 116, 70, 14, "gold"),
    P(650, 188, 100, 14, "gold"),
    P(810, 150, 76, 14, "gold"),
    P(950, 112, 64, 14, "gold"),
    P(1100, 180, 90, 14, "gold"),
    P(1230, 144, 74, 14, "gold"),
    P(1360, 108, 66, 14, "gold"),
    P(1520, 188, 96, 14, "gold"),
    P(1680, 150, 80, 14, "gold"),
    P(1820, 114, 68, 14, "gold"),
    P(1950, 152, 76, 14, "gold"),
    P(2100, 184, 90, 14, "gold"),
    P(2240, 146, 80, 14, "gold"),
    P(2380, 110, 66, 14, "gold"),
    P(2520, 146, 76, 14, "gold"),
    P(2660, 180, 86, 14, "gold"),
    P(2790, 128, 72, 14, "gold"),
    P(2880, 180, 90, 14, "gold"),
  ],
  items: items([
    ["diya", 120, 212], ["diya", 240, 170], ["diya", 360, 130], ["diya", 470, 212],
    ["diya", 640, 168], ["diya", 760, 130], ["diya", 900, 212], ["diya", 1100, 160],
    ["diya", 1220, 124], ["diya", 1370, 212], ["diya", 1540, 168], ["diya", 1670, 130],
    ["diya", 1830, 94], ["diya", 1920, 212], ["diya", 2120, 164], ["diya", 2230, 126],
    ["diya", 2380, 90], ["diya", 2480, 156], ["diya", 2600, 212], ["diya", 2700, 150],
    ["diya", 2820, 108], ["diya", 2920, 176],
    ["laddoo", 300, 212], ["laddoo", 820, 212], ["laddoo", 1300, 212], ["laddoo", 1760, 212],
    ["laddoo", 2300, 212], ["laddoo", 2750, 212],
    ["gift", 850, 110], ["gift", 1830, 72], ["gift", 2820, 84],
  ], "c"),
  hazards: [
    H("flame", 280, 214, 18, 26, "x", 80, 1.4),
    H("spirit", 520, 160, 16, 18, "y", 30, 1.9),
    H("thorn", 720, 228, 40, 12),
    H("chakra", 1150, 140, 18, 18, "y", 40, 1.7),
    H("flame", 1350, 214, 18, 26, "x", 60, 1.5),
    H("spirit", 1600, 140, 16, 18, "y", 30, 2),
    H("thorn", 1880, 228, 40, 12),
    H("chakra", 2200, 140, 18, 18, "y", 40, 1.8),
    H("flame", 2350, 214, 18, 26, "x", 80, 1.6),
    H("rocket", 2500, 160, 14, 24, "y", 25, 1.9),
    H("spirit", 2650, 140, 16, 18, "y", 28, 2.1),
    H("flame", 2820, 214, 18, 26, "x", 60, 1.5),
  ],
  checkpoints: [
    { x: 1920, y: GROUND_Y },
    { x: 2620, y: GROUND_Y },
  ],
  goal: { x: 2920, y: GROUND_Y },
  spawn: { x: 60, y: GROUND_Y },
};

export const LEVELS: LevelDef[] = [village, garden, temple, fireworks, celebration];

export const levelById = (id: number): LevelDef => LEVELS[id] ?? LEVELS[0];
