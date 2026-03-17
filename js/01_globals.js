/**
 * Moonkin Simulation - File 1: Global State & Constants
 */

// ============================================================================
// 1. GLOBAL STATE
// ============================================================================
var SIM_LIST = [];
var ACTIVE_SIM_INDEX = 0;
var SIM_DATA = null;
var CURRENT_VIEW = 'avg';
var toastTimer = null;

var GLOBAL_DPS_MIN = 0;
var GLOBAL_DPS_MAX = 0;

var ITEM_DB = [];
var ENCHANT_DB = [];
var GEAR_SELECTION = {};
var ENCHANT_SELECTION = {};

var CONFIG_IDS = [
    "weight_haste_steps", "sim_patch", "maxTime", "simCount", "rng_seed", "avcd", "calcMethod",
    "statHit", "statCrit", "statHaste",
    "sp_gen", "sp_nature", "sp_arcane", "sp_pen",
    "stat_override_eclipse", "stat_proc_nature", "stat_proc_arcane",
    "enemy_level", "res_arcane", "res_nature", "enemy_cos", "enemy_ext_mf", "enemy_ext_is",
    "rota_fish", "start_boat", "wrath_flight", "rota_dot_cutoff",
    "rota_is", "rota_mf", "rota_eclDot", "rota_interrupt", "rota_interrupt_thresh",
    "rota_starfire", "rota_wrath",
    "t3_4p", "t3_6p", "t3_8p", "t35_5p",
    "idolEoF", "idolMoon", "idolProp", "idolMoonfang",
    "item_binding", "item_scythe", "item_nobility", "item_thane", "item_sulfuras", "item_sigil", "item_chromie", "item_kelp", "item_sphere",
    "item_reos", "item_toep", "item_roop", "item_zhc", "trinket_strat",
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

// Simulation Object Constructor
// Simulation Object Constructor
function SimObject(id, name) {
    this.id = id;
    this.name = name;
    this.config = {};
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