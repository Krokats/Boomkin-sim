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

var ITEM_DB = [];
var ENCHANT_DB = [];
var GEAR_SELECTION = {};
var ENCHANT_SELECTION = {};

// ============================================================================
// GEAR PRESETS (BiS Lists)
// ============================================================================
var GEAR_PRESETS = {
    "AQ40 BiS": {
        gear: {
            "Head": 41077, // Ersetze 0 durch die tatsächliche Item-ID
            "Neck": 61522,
            "Shoulder": 47347,
            "Back": 22731,
            "Chest": 21357,
            "Wrist": 47349,
            "Hands": 21585,
            "Waist": 22730,
            "Legs": 21356,
            "Feet": 21355,
            "Finger 1": 21709,
            "Finger 2": 21836,
            "Trinket 1": 61209,
            "Trinket 2": 19379,
            "Main Hand": 19356,
            "Off Hand": 0,
            "Relic": 0
        },
        enchants: {
            "Head": 22844,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22844,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },"Naxx BiS": {
        gear: {
            "Head": 41077, // Ersetze 0 durch die tatsächliche Item-ID
            "Neck": 23057,
            "Shoulder": 47373,
            "Back": 23050,
            "Chest": 47374,
            "Wrist": 47375,
            "Hands": 47376,
            "Waist": 47377,
            "Legs": 47378,
            "Feet": 47379,
            "Finger 1": 47380,
            "Finger 2": 23025,
            "Trinket 1": 23046,
            "Trinket 2": 19379,
            "Main Hand": 22632,
            "Off Hand": 0,
            "Relic": 0
        },
        enchants: {
            "Head": 22844,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22844,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
    "Kara40 BiS": {
        gear: {"Head": 47396,
            "Neck": 47401,
            "Shoulder": 47397,
            "Back": 23050,
            "Chest": 47398,
            "Wrist": 55106,
            "Hands": 55354,
            "Waist": 55355,
            "Legs": 47399,
            "Feet": 47400,
            "Finger 1": 55094,
            "Finger 2": 61251,
            "Trinket 1": 55093,
            "Trinket 2": 19379,
            "Main Hand": 55120,
            "Off Hand": 23049,
            "Relic": 0},  
         enchants: {
            "Head": 22844,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22844,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
    "Kara40+Scythe BiS": {
        gear: {"Head": 47396,
            "Neck": 47401,
            "Shoulder": 47397,
            "Back": 23050,
            "Chest": 47398,
            "Wrist": 55106,
            "Hands": 55354,
            "Waist": 55355,
            "Legs": 47399,
            "Feet": 47400,
            "Finger 1": 55094,
            "Finger 2": 61251,
            "Trinket 1": 55505,
            "Trinket 2": 19379,
            "Main Hand": 55348,
            "Off Hand": 0,
            "Relic": 0},  
         enchants: {
            "Head": 22844,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22844,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    }
};

var CONFIG_IDS = [
    "weight_haste_steps", "sim_patch", "maxTime", "simCount", "rng_seed", "avcd", "calcMethod",
    "statHit", "statCrit", "statHaste",
    "sp_gen", "sp_nature", "sp_arcane", "sp_pen",
    "stat_override_eclipse", "stat_proc_nature", "stat_proc_arcane",
    "enemy_level", "res_arcane", "res_nature", "enemy_cos", "enemy_ext_mf", "enemy_ext_is",
    "start_boat", "wrath_flight",
    "rota_interrupt", "rota_interrupt_thresh",
    "t3_4p", "t3_6p", "t3_8p", "t35_5p",
    "idolEoF", "idolMoon", "idolProp", "idolMoonfang", "idolAcidity", "idolEquilibrium",
    "item_binding", "item_scythe", "item_nobility", "item_thane", "item_sulfuras", "item_sigil", "item_chromie", "item_kelp", "item_sphere",
    "item_reos", "item_toep", "item_roop", "item_zhc",
    "char_race",
    // BUFFS
    "buff_moonkin", "buff_atiesh_druid", "buff_atiesh_mage", "buff_atiesh_warlock",
    "buff_arcane_brilliance", "buff_bok", "buff_emerald", "buff_gotw",
    "buff_food_sp", "buff_food_int",
    "buff_elixir_dreamshard", "buff_elixir_nature", "buff_elixir_arcane_power", "buff_elixir_greater_arcane",
    "buff_dreamtonic", "buff_cerebral", "buff_wizard_oil", "buff_flask"
];

var SLOT_LAYOUT = {
    left: ["Head", "Neck", "Shoulder", "Back", "Chest", "Wrist"],
    right: ["Hands", "Waist", "Legs", "Feet", "Finger 1", "Finger 2", "Trinket 1", "Trinket 2"],
    bottom: ["Main Hand", "Off Hand"]
};

// Base 3.38% Crit for Druids, Base Hit 0
const RACE_STATS = {
    "Tauren": { hit: 3, crit: 3.33, haste: 0, stam: 72, int: 95 },
    "NightElf": { hit: 3, crit: 3.33, haste: 1, stam: 69, int: 100 }
};

// ============================================================================
// 1b. ROTATION BUILDER STATE & DICTIONARIES
// ============================================================================

var ROTATION_SKILLS = [
    { id: "Starfire", name: "Starfire", icon: "spell_arcane_starfire" },
    { id: "Wrath", name: "Wrath", icon: "spell_nature_abolishmagic" },
    { id: "Moonfire", name: "Moonfire", icon: "spell_nature_starfall" },
    { id: "InsectSwarm", name: "Insect Swarm", icon: "spell_nature_insectswarm" },
    { id: "Trinket1", name: "Use Trinket 1", icon: "inv_jewelry_trinket_04" },
    { id: "Trinket2", name: "Use Trinket 2", icon: "inv_jewelry_trinket_04" }
];

var CONDITION_TYPES = [
    { id: "debuff_rem", label: "Target Debuff Rem. (s)", hasTarget: ["Moonfire", "Insect Swarm"], hasOp: true, hasVal: true },
    { id: "buff_rem", label: "Player Buff Rem. (s)", hasTarget: ["Nature Eclipse", "Arcane Eclipse", "Nature's Grace"], hasOp: true, hasVal: true },
    { id: "player_debuff_rem", label: "Player Debuff Rem. (s)", hasTarget: ["Arcane Solstice", "Natural Solstice"], hasOp: true, hasVal: true },
    { id: "time_elapsed", label: "Time Elapsed (s)", hasOp: true, hasVal: true },
    { id: "time_remaining", label: "Time Remaining (s)", hasOp: true, hasVal: true },
    { id: "ecl_vs_cast", label: "Eclipse Rem. > Cast Time", hasTarget: ["Starfire", "Wrath"], hasBool: true },
    { id: "last_cast", label: "Last Cast was", hasTarget: ["Starfire", "Wrath"] }
];

var PRESET_ROTATIONS = {
    "Standard 1": {
        name: "Full Rotation (Wrath Fishing)",
        desc: "Default rotation with DoTs and Eclipse. Refresh DoTs at End of Eclipse, use Wrath for Fishing outside of Solstices.",
        steps: [
            { id: 1, skill: "Trinket1", conditions: [{ type: "time_elapsed",  op: "<=", val: "0" }], disabled: false },
            { id: 2, skill: "Trinket2", conditions: [{ type: "time_elapsed",  op: "<=", val: "0" }], disabled: false },
            { id: 3, skill: "InsectSwarm", conditions: [
                { type: "debuff_rem", target: "Insect Swarm", op: "<=", val: "0"}, 
                { type: "buff_rem", target: "Nature Eclipse", op: "<=", val: "0"},
                { type: "buff_rem", target: "Arcane Eclipse", op: "<=", val: "0"},
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 4, skill: "InsectSwarm", conditions: [
                { type: "ecl_vs_cast", target: "Wrath", bool: "false" }, 
                { type:"buff_rem", target: "Nature Eclipse", op: ">", val: "0"},
                { type: "debuff_rem", target: "Insect Swarm", op: "<=", val: "12"}, 
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 5, skill: "Moonfire", conditions: [
                { type: "debuff_rem", target: "Moonfire", op: "<=", val: "0" }, 
                { type: "buff_rem", target: "Nature Eclipse", op: "<=", val: "0"},
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 6, skill: "Moonfire", conditions: [
                { type: "ecl_vs_cast", target: "Starfire", bool: "false" }, 
                { type:"buff_rem", target: "Arcane Eclipse", op: ">", val: "0"},
                { type: "debuff_rem", target: "Moonfire", op: "<=", val: "12"}, 
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 7, skill: "Starfire", conditions: [
                { type: "buff_rem", target: "Arcane Eclipse", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "2.5"}
            ], disabled: false },
            { id: 8, skill: "Wrath", conditions: [
                { type: "buff_rem", target: "Nature Eclipse", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "1.5"}
            ], disabled: false },
            { id: 9, skill: "Starfire", conditions: [
                { type: "player_debuff_rem", target: "Natural Solstice", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "2.5"}
            ], disabled: false },
            { id: 10, skill: "Wrath", conditions: [
                { type: "player_debuff_rem", target: "Arcane Solstice", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "1.5"}
            ], disabled: false },
            { id: 11, skill: "Wrath", conditions: [
                { type: "time_remaining",  op: ">=", val: "1.5"}], disabled: false },
            { id: 12, skill: "Moonfire", conditions: [
                { type: "time_remaining",  op: "<", val: "1.5"}
            ], disabled: false }
                
        ]
    },
    "Standard 2": {
        name: "Full Rotation (Starfire Fishing)",
        desc: "Default rotation with DoTs and Eclipse. Refresh DoTs at End of Eclipse, use Starfire for Fishing outside of Solstices.",
        steps: [
            { id: 1, skill: "Trinket1", conditions: [{ type: "time_elapsed",  op: "<=", val: "0" }], disabled: false },
            { id: 2, skill: "Trinket2", conditions: [{ type: "time_elapsed",  op: "<=", val: "0" }], disabled: false },
            { id: 3, skill: "InsectSwarm", conditions: [
                { type: "debuff_rem", target: "Insect Swarm", op: "<=", val: "0"}, 
                { type: "buff_rem", target: "Nature Eclipse", op: "<=", val: "0"},
                { type: "buff_rem", target: "Arcane Eclipse", op: "<=", val: "0"},
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 4, skill: "InsectSwarm", conditions: [
                { type: "ecl_vs_cast", target: "Wrath", bool: "false" }, 
                { type:"buff_rem", target: "Nature Eclipse", op: ">", val: "0"},
                { type: "debuff_rem", target: "Insect Swarm", op: "<=", val: "12"}, 
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 5, skill: "Moonfire", conditions: [
                { type: "debuff_rem", target: "Moonfire", op: "<=", val: "0" }, 
                { type: "buff_rem", target: "Nature Eclipse", op: "<=", val: "0"},
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 6, skill: "Moonfire", conditions: [
                { type: "ecl_vs_cast", target: "Starfire", bool: "false" }, 
                { type:"buff_rem", target: "Arcane Eclipse", op: ">", val: "0"},
                { type: "debuff_rem", target: "Moonfire", op: "<=", val: "12"}, 
                { type: "time_remaining",  op: ">=", val: "15"}
            ], disabled: false },
            { id: 7, skill: "Starfire", conditions: [
                { type: "buff_rem", target: "Arcane Eclipse", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "2.5"}
            ], disabled: false },
            { id: 8, skill: "Wrath", conditions: [
                { type: "buff_rem", target: "Nature Eclipse", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "1.5"}
            ], disabled: false },
            { id: 9, skill: "Starfire", conditions: [
                { type: "player_debuff_rem", target: "Natural Solstice", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "2.5"}
            ], disabled: false },
            { id: 10, skill: "Wrath", conditions: [
                { type: "player_debuff_rem", target: "Arcane Solstice", op: ">", val: "0" },
                { type: "time_remaining",  op: ">=", val: "1.5"}
            ], disabled: false },
            { id: 11, skill: "Starfire", conditions: [
                { type: "time_remaining",  op: ">=", val: "2.5"}], disabled: false },
            { id: 12, skill: "Moonfire", conditions: [
                { type: "time_remaining",  op: "<", val: "1.5"}
            ], disabled: false }
                
        ]
    }
};

// Das globale Status-Objekt für den aktuell im UI bearbeiteten Builder
var CUSTOM_ROTATION = JSON.parse(JSON.stringify(PRESET_ROTATIONS["Standard 1"]));

// Simulation Object Constructor
function SimObject(id, name) {
    this.id = id;
    this.name = name;
    this.config = {};
    this.customRotation = JSON.parse(JSON.stringify(PRESET_ROTATIONS["Standard 1"])); // NEU: Rotations-Speicher
    this.results = null; // Hier werden DPS und Stat Weights individuell pro Sim gespeichert
}


// ============================================================================
// PIXEL ART DATA (LOADING SCREEN)
// ============================================================================

const C = {
    _: null, B: '#8B4513', D: '#5A3210', G: '#A9A9A9', W: '#FFFFFF', Y: '#F0E68C',
    P1: '#9370DB', P2: '#BA55D3', DB: '#4169E1', LB: '#87CEFA',
    ExpY: '#FFFF00', ExpO: '#FFA500', R: '#FF0000', TX: '#FFFFFF', TB: '#00BFFF',
    TY: '#FFD700', SV: '#C0C0C0',
    NG: '#32CD32', DG: '#006400', LG: '#98FB98'
};

const T = (rows, color = C.TX) => rows.map(r => r.split('').map(c => c === 'X' ? color : C._));

const SPRITES = {
    moonkinLarge: [
        [C._, C._, C.G, C._, C._, C._, C._, C.G, C._, C._],
        [C._, C.G, C.D, C.D, C._, C._, C.D, C.D, C.G, C._],
        [C._, C.G, C.B, C.B, C.B, C.B, C.B, C.B, C.G, C._],
        [C._, C.B, C.B, C.W, C.B, C.B, C.W, C.B, C.B, C._],
        [C.D, C.B, C.B, C.B, C.Y, C.Y, C.B, C.B, C.B, C.D],
        [C.B, C.D, C.B, C.B, C.B, C.B, C.B, C.B, C.D, C.B],
        [C.B, C.B, C.B, C.W, C.B, C.B, C.W, C.B, C.B, C.B],
        [C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B],
        [C._, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C.B, C._],
        [C._, C._, C.D, C.D, C._, C._, C.D, C.D, C._, C._]
    ],
    dummyLarge: [
        [C._, C._, C._, C.D, C.D, C.D, C._, C._, C._],
        [C._, C._, C.D, C.Y, C.Y, C.Y, C.D, C._, C._],
        [C._, C._, C.D, C.Y, C.Y, C.Y, C.D, C._, C._],
        [C._, C.G, C.G, C.G, C.G, C.G, C.G, C.G, C._],
        [C._, C.G, C.B, C.B, C.D, C.B, C.B, C.G, C._],
        [C._, C.G, C.B, C.D, C.Y, C.D, C.B, C.G, C._],
        [C._, C._, C.B, C.B, C.D, C.B, C.B, C._, C._],
        [C._, C._, C._, C.D, C.B, C.D, C._, C._, C._],
        [C._, C._, C._, C.D, C.B, C.D, C._, C._, C._],
        [C._, C._, C.D, C.D, C.D, C.D, C.D, C._, C._]
    ],
    castBall1: [[C._, C.P1, C.P1, C._], [C.P1, C.P2, C.P2, C.P1], [C.P1, C.P2, C.P2, C.P1], [C._, C.P1, C.P1, C._]],
    castBall2: [[C._, C.P1, C.P2, C.P1, C._], [C.P1, C.P2, C.W, C.P2, C.P1], [C.P2, C.W, C.W, C.W, C.P2], [C.P1, C.P2, C.W, C.P2, C.P1], [C._, C.P1, C.P2, C.P1, C._]],
    beamSegment: [[C.DB, C.LB, C.W, C.W, C.LB, C.DB], [C.DB, C.LB, C.W, C.W, C.LB, C.DB], [C.DB, C.LB, C.W, C.W, C.LB, C.DB], [C.DB, C.LB, C.W, C.W, C.LB, C.DB]],
    impactSplash: [[C._, C.LB, C._, C.LB, C._], [C.LB, C.W, C.LB, C.W, C.LB], [C.ExpY, C.LB, C.W, C.LB, C.ExpY], [C.ExpO, C.ExpY, C.LB, C.ExpY, C.ExpO]],
    redBeamSegment: [[C.R, C.LB, C.W, C.W, C.LB, C.R], [C.R, C.LB, C.W, C.W, C.LB, C.R], [C.R, C.LB, C.W, C.W, C.LB, C.R], [C.R, C.LB, C.W, C.W, C.LB, C.R]],
    wrathBall: [[C._, C.DG, C.DG, C._], [C.DG, C.NG, C.NG, C.DG], [C.DG, C.NG, C.W, C.DG], [C._, C.DG, C.DG, C._]],
    wrathSplash: [[C._, C.NG, C._, C.NG, C._], [C.NG, C.LG, C.NG, C.LG, C.NG], [C.DG, C.NG, C.W, C.NG, C.DG], [C._, C.DG, C.NG, C.DG, C._]],
    tear: [[C.TB], [C.TB], [C.TB]],

    txtC: T(['XXX', 'X..', 'X..', 'X..', 'XXX']),
    txtR: T(['XXX', 'X.X', 'XXX', 'X.X', 'X.X']),
    txtI: T(['XXX', '.X.', '.X.', '.X.', 'XXX']),
    txtT: T(['XXX', '.X.', '.X.', '.X.', '.X.']),
    txtM: T(['X.X', 'XXX', 'X.X', 'X.X', 'X.X']),
    txtS: T(['XXX', 'X..', 'XXX', '..X', 'XXX']),
    txtEcl: T(['.X.', '.X.', '.X.', '...', '.X.']),
    txtI_y: T(['XXX', '.X.', '.X.', '.X.', 'XXX'], C.TY),
    txtM_y: T(['X.X', 'XXX', 'X.X', 'X.X', 'X.X'], C.TY),
    txtU_y: T(['X.X', 'X.X', 'X.X', 'X.X', 'XXX'], C.TY),
    txtN_y: T(['XX.', 'X.X', 'X.X', 'X.X', 'X.X'], C.TY),
    txtE_y: T(['XXX', 'X..', 'XXX', 'X..', 'XXX'], C.TY),
    txtEcl_y: T(['.X.', '.X.', '.X.', '...', '.X.'], C.TY),
    shield: [[C.SV, C.SV, C.SV, C.SV, C.SV], [C.SV, C.W, C.SV, C.W, C.SV], [C.SV, C.SV, C.SV, C.SV, C.SV], [C._, C.SV, C.SV, C.SV, C._], [C._, C._, C.SV, C._, C._]]
};