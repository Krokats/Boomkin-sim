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
    "Tauren": { hit: 3, crit: 3.33, haste: 0, stam: 72, int: 95 },
    "NightElf": { hit: 3, crit: 3.33, haste: 1, stam: 69, int: 100 }
};


