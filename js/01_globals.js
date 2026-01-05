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

var ITEM_DB = [];
var ENCHANT_DB = []; 
var GEAR_SELECTION = {}; 
var ENCHANT_SELECTION = {}; 

var CONFIG_IDS = [
    "maxTime", "simCount", "avcd", "calcMethod", 
    "statHit", "statCrit", "statHaste", 
    "sp_gen", "sp_nature", "sp_arcane", "sp_pen", 
    "enemy_level", "res_arcane", "res_nature", "enemy_cos",
    "rota_fish", "start_boat", "wrath_flight", 
    "rota_is", "rota_mf", "rota_eclDot", "rota_interrupt",
    "rota_starfire", "rota_wrath",
    "t3_4p", "t3_6p", "t3_8p", "t35_5p",
    "idolEoF", "idolMoon", "idolProp", "idolMoonfang",
    "item_binding", "item_scythe", "item_sulfuras", "item_woc",
    "item_reos", "item_toep", "item_roop", "item_zhc", "item_scythe_use",
    "trinket_strat",
    "char_race",
    "manual_stats", // NEW: Toggle for manual editing
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

// Base 3.33% Crit for Druids, Base Hit 3 (From Talents)
const RACE_STATS = {
    "Tauren":   { hit: 3, crit: 3.33, haste: 0, stam: 72, int: 95 },
    "NightElf": { hit: 3, crit: 3.33, haste: 1, stam: 69, int: 100 }
    
};

// Simulation Object Constructor
function SimObject(id, name) { this.id = id; this.name = name; this.config = {}; this.results = null; }