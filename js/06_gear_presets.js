// ============================================================================
// GEAR PRESETS (BiS Lists)
// ============================================================================
var GEAR_PRESETS = {
    "BWL+ES+TMH BiS": {
        gear: {
            "Head": 19375, // Ersetze 0 durch die tatsächliche Item-ID
            "Neck": 61522,
            "Shoulder": 33381,
            "Back": 19857,
            "Chest": 61524,
            "Wrist": 47349,
            "Hands": 47350,
            "Waist": 19388,
            "Legs": 33384,
            "Feet": 33385,
            "Finger 1": 22721,
            "Finger 2": 19403,
            "Trinket 1": 61209,
            "Trinket 2": 19379,
            "Main Hand": 19356,
            "Off Hand": 0,
            "Idol": 55497
        },
        enchants: {
            "Head": 41077,
            "Neck": 51043,
            "Shoulder": 57156,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22840,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
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
            "Idol": 55497
        },
        enchants: {
            "Head": 41077,
            "Neck": 51043,
            "Shoulder": 57156,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22840,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
    "Naxx BiS": {
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
            "Idol": 55497
        },
        enchants: {
            "Head": 22840,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22840,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
    "Kara40 BiS": {
        gear: {
            "Head": 47396,
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
            "Idol": 55497
        },
        enchants: {
            "Head": 22840,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22840,
            "Feet": 57135,
            "Finger 1": 51043,
            "Finger 2": 51043,
            "Main Hand": 22749,
        }
    },
    "Kara40+Scythe BiS": {
        gear: {
            "Head": 47396,
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
            "Idol": 55497
        },
        enchants: {
            "Head": 22840,
            "Neck": 51043,
            "Shoulder": 29467,
            "Back": 25084,
            "Chest": 57135,
            "Wrist": 57028,
            "Hands": 13948,
            "Waist": 57182,
            "Legs": 22840,
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
    "stag_5p", "t3_4p", "t3_6p", "t3_8p", "t35_3p", "t35_5p",
    "idolEoF", "idolMoon", "idolProp", "idolMoonfang", "idolAcidity", "idolEquilibrium", "idolEquilibriumV2", "idolEquilibriumV3",
    "item_binding", "item_scythe", "item_nobility", "item_thane", "item_sulfuras", "item_sigil", "item_chromie", "item_kelp", "item_sphere",
    "item_reos", "item_toep", "item_roop", "item_zhc", "item_decay", "item_droplet", "item_markali",
    "char_race",
    // BUFFS
    "buff_moonkin", "buff_atiesh_druid", "buff_atiesh_mage", "buff_atiesh_warlock",
    "buff_arcane_brilliance", "buff_bok", "buff_emerald", "buff_gotw",
    "buff_food_sp", "buff_food_medley", "buff_food_int",
    "buff_elixir_dreamshard", "buff_elixir_nature", "buff_elixir_arcane_power", "buff_elixir_greater_arcane",
    "buff_dreamtonic", "buff_cerebral", "buff_wizard_oil", "buff_flask",
    "aoe_targets", "aoe_mode"
];

var SLOT_LAYOUT = {
    left: ["Head", "Neck", "Shoulder", "Back", "Chest", "Wrist"],
    right: ["Hands", "Waist", "Legs", "Feet", "Finger 1", "Finger 2", "Trinket 1", "Trinket 2"],
    bottom: ["Main Hand", "Off Hand", "Idol"]
};