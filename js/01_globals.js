/**
 * Moonkin Simulation - File 1: Global State & Constants
 */

// ============================================================================
// 1. GLOBAL STATE
// ============================================================================
var SIM_LIST = [];
var ACTIVE_SIM_INDEX = 0;
var SIM_DATA = null;
var CURRENT_VIEW = 'median';
var toastTimer = null;

var GLOBAL_DPS_MIN = 0;
var GLOBAL_DPS_MAX = 0;



// Simulation Object Constructor
function SimObject(id, name) {
    this.id = id;
    this.name = name;
    this.config = {};
    this.customRotation = JSON.parse(JSON.stringify(PRESET_ROTATIONS["Standard 1"])); // NEU: Rotations-Speicher
    this.results = null; // Hier werden DPS und Stat Weights individuell pro Sim gespeichert
}


// Base 3.38% Crit for Druids, Base Hit 0
const RACE_STATS = {
    "Tauren": { hit: 0, crit: 3.33, haste: 0, stam: 72, int: 95 },
    "NightElf": { hit: 0, crit: 3.33, haste: 1, stam: 69, int: 100 }
};

// ============================================================================
// BASE SPELL DATABASE (Keine Talente, Base Level 60)
// ============================================================================
const SPELL_DB = {
    "Wrath": {
        id: "Wrath", name: "Wrath", type: "Nature",
        baseCast: 2.0, // Untalentiert 2.0s
        min: 292, max: 328, base: 310, coeff: 0.60,
        cost: 149, isDot: false
    },
    "Starfire": {
        id: "Starfire", name: "Starfire", type: "Arcane",
        baseCast: 3.5, // Untalentiert 3.5s
        min: 496, max: 584, base: 540, coeff: 1.0,
        cost: 241, isDot: false
    },
    "Moonfire": {
        id: "Moonfire", name: "Moonfire", type: "Arcane",
        baseCast: 0,
        base: 210, coeff: 0.14,
        tickBase: 95.6, tickCoeff: 0.13,
        dur: 18.0, tick: 3.0,
        cost: 266, isDot: true
    },
    "InsectSwarm": {
        id: "InsectSwarm", name: "Insect Swarm", type: "Nature",
        baseCast: 0,
        base: 0, coeff: 0,
        tickBase: 53.35, tickCoeff: ((18 / 15) * 0.95 * 1.25) / 9, 
        dur: 18.0, tick: 2.0,
        cost: 128, isDot: true
    },
    "Hurricane": {
        id: "Hurricane", name: "Hurricane", type: "Nature",
        baseCast: 0,
        base: 134, coeff: 0.096,
        tickBase: 134, tickCoeff: 0.096, // Vereinfachung
        dur: 10.0, tick: 1.0,
        cost: 880, isDot: true 
    }
};

// ============================================================================
// AKTUELLER TALENT STATE (Ersetzt vorerst deine harten Zahlen im Code)
// ============================================================================
var CURRENT_TALENTS = {
    //balnace talents
    impWrath: 5,        // -0.1s Casttime pro Punkt
    impMoonfire: 2,     // +5% Dmg und +5% Crit pro Punkt
    naturalWeapon: 3,   // +1 Hit pro Punkt
    moonfury: 3,        // +4% Dmg pro Punkt
    ooc: 1,             // Omen of Clarity (0 oder 1)
    vengeance: 5,       // Erhöht den Crit-Schadens-Bonus (Base 50%) um 20% pro Punkt
    moonglow: 3,        // -3% Manakosten pro Punkt
    moonkinForm: 1,     // Moonkin Form (0 oder 1)
    naturesGrace: 1,    // 0.5s Casttime Reduktion bei Crit (0 oder 1)
    impStarfire: 3,     // -0.2/-0.3/-0.5s Casttime pro Punkt
    boat: 3,            // Balance of All Things: 3% Crit / 10% Mana pro Punkt
    eclipse: 1,         // Damage from Wrath has 40% Chance to grant Arcane Eclipse, Damage from Starfire has 60% Chance to grant Nature Eclipse. Damage Bonus is 10% plus 60%*SpellCrit
    //Resto Talents
    improvedMotW: 5,    // Increase effect of Mark of the Wild by 7% per point
    genesis: 3,         // Increase damage of periodic spells by 5% per point
};


