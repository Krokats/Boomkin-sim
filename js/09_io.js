// ============================================================================
// IMPORT / EXPORT LOGIC
// ============================================================================

var CONFIG_VERSION = 2; // Version 2: Delta-Encoding aktiv!

// Wörterbuch für die Standardwerte (alles was nicht hier steht, ist standardmäßig 0 oder "")
var DEFAULT_CFG_VALUES = {
    "sim_patch": "1.18.1c",
    "maxTime": 60,
    "simCount": 10000,
    "calcMethod": "S",
    "stat_proc_nature": 60,
    "stat_proc_arcane": 40,
    "enemy_level": 63,
    "char_race": "Tauren"
};

var GEAR_SLOT_ORDER = [
    "Head", "Neck", "Shoulder", "Back", "Chest", "Wrist", "Hands", "Waist", "Legs", "Feet", 
    "Finger 1", "Finger 2", "Trinket 1", "Trinket 2", "Main Hand", "Off Hand", "Relic"
];

var OP_MAP = [">", "<", ">=", "<=", "=="];
var TARGET_MAP = [
    "Moonfire", "Insect Swarm", "Nature Eclipse", "Arcane Eclipse", 
    "Nature's Grace", "Arcane Solstice", "Natural Solstice", "Starfire", "Wrath"
];


function packConfig(cfg) {
    var packedValues = [];
    
    // NEU: Delta-Encoding! Speichere nur Werte, die vom Standard abweichen
    CONFIG_IDS.forEach(function (id, idx) {
        var val = cfg[id];
        var def = DEFAULT_CFG_VALUES[id] !== undefined ? DEFAULT_CFG_VALUES[id] : 0;
        
        if (val != def) { // Nur bei Abweichung speichern (als flaches Paar: Index, Wert)
            packedValues.push(idx, val);
        }
    });

    var gearArr = [];
    var itemCount = 0;
    var enchantArr = [];

    GEAR_SLOT_ORDER.forEach(function(slot) {
        var val = cfg.gearSelection ? cfg.gearSelection[slot] : null;
        var idToSave = (val && typeof val === 'object' && val.id) ? val.id : (val || 0);
        gearArr.push(idToSave);
        if (idToSave != 0) itemCount++;

        var eVal = cfg.enchantSelection ? cfg.enchantSelection[slot] : null;
        var eIdToSave = (eVal && typeof eVal === 'object' && eVal.id) ? eVal.id : (eVal || 0);
        enchantArr.push(eIdToSave);
    });

    while(gearArr.length > 0 && gearArr[gearArr.length - 1] === 0) gearArr.pop();
    while(enchantArr.length > 0 && enchantArr[enchantArr.length - 1] === 0) enchantArr.pop();

    var compactRota = [
        cfg.custom_rotation.name === "Custom Rotation" ? "" : (cfg.custom_rotation.name || ""),
        cfg.custom_rotation.desc || "",
        cfg.custom_rotation.steps.map(function(step) {
            var sIdx = ROTATION_SKILLS.findIndex(function(s) { return s.id === step.skill; });
            var mappedSkill = sIdx !== -1 ? sIdx : step.skill;

            var flatStep = [mappedSkill, step.disabled ? 1 : 0];

            step.conditions.forEach(function(cond) {
                var cIdx = CONDITION_TYPES.findIndex(function(c) { return c.id === cond.type; });
                var mappedType = cIdx !== -1 ? cIdx : cond.type;
                var tIdx = TARGET_MAP.indexOf(cond.target);
                var oIdx = OP_MAP.indexOf(cond.op);
                var bVal = (cond.bool === "true" || cond.bool === true) ? 1 : 0;
                
                flatStep.push(mappedType, tIdx, oIdx, cond.val || 0, bVal);
            });

            return flatStep;
        })
    ];

    return {
        data: [CONFIG_VERSION, packedValues, gearArr, enchantArr, compactRota],
        itemCount: itemCount
    };
}

function unpackConfig(packed) {
    if (!Array.isArray(packed)) return packed;

    var isVersioned = typeof packed[0] === 'number';
    var version = isVersioned ? packed[0] : 0;
    
    if (version > CONFIG_VERSION) {
        alert("Achtung: Dieser Link stammt aus einer neueren Version des Simulators und wird möglicherweise nicht korrekt geladen!");
    }

    var valuesData = isVersioned ? packed[1] : packed[0];
    var gearData = isVersioned ? packed[2] : packed[1];
    var enchantData = isVersioned ? packed[3] : packed[2];
    var compactRota = isVersioned ? packed[4] : (packed.length > 3 ? packed[3] : null);

    var cfg = {};

    // 1. Alle CONFIG_IDS initial mit Defaults (oder 0) füllen
    CONFIG_IDS.forEach(function (id) {
        cfg[id] = DEFAULT_CFG_VALUES[id] !== undefined ? DEFAULT_CFG_VALUES[id] : 0;
    });

    // 2. Werte aus dem Link verarbeiten
    if (Array.isArray(valuesData)) {
        if (version >= 2) {
            // NEU: Delta-Array verarbeiten [Index, Wert, Index, Wert, ...]
            for (var i = 0; i < valuesData.length; i += 2) {
                var cId = CONFIG_IDS[valuesData[i]];
                if (cId) cfg[cId] = valuesData[i+1];
            }
        } else {
            // ALT: Klassisches komplettes Array aus Vorgängerversionen
            CONFIG_IDS.forEach(function (id, idx) {
                if (idx < valuesData.length) cfg[id] = valuesData[idx];
            });
        }
    }

    cfg.gearSelection = {};
    if (gearData) {
        if (Array.isArray(gearData)) {
            gearData.forEach(function(id, idx) {
                if (id != 0 && idx < GEAR_SLOT_ORDER.length) {
                    var item = ITEM_DB.find(function(i) { return String(i.id) === String(id); });
                    if (item) cfg.gearSelection[GEAR_SLOT_ORDER[idx]] = item.id;
                }
            });
        } else {
            for (var slot in gearData) {
                var id = gearData[slot];
                var item = ITEM_DB.find(function (i) { return String(i.id) === String(id); });
                if (item) cfg.gearSelection[slot] = item.id;
            }
        }
    }

    cfg.enchantSelection = {};
    if (enchantData) {
        if (Array.isArray(enchantData)) {
            enchantData.forEach(function(id, idx) {
                if (id != 0 && idx < GEAR_SLOT_ORDER.length) {
                    var ench = ENCHANT_DB.find(function(e) { return String(e.id) === String(id); });
                    if (ench) cfg.enchantSelection[GEAR_SLOT_ORDER[idx]] = ench.id;
                }
            });
        } else {
            for (var slot in enchantData) {
                var id = enchantData[slot];
                var ench = ENCHANT_DB.find(function (e) { return String(e.id) === String(id); });
                if (ench) cfg.enchantSelection[slot] = ench.id;
            }
        }
    }

    if (compactRota) {
        if (Array.isArray(compactRota)) {
            cfg.custom_rotation = {
                name: compactRota[0] || "Custom Rotation",
                desc: compactRota[1] || "",
                steps: compactRota[2].map(function(s, stepIdx) { 
                    var isOldNested = Array.isArray(s[s.length - 1]) || (s.length > 2 && Array.isArray(s[2]));
                    var sId = Date.now() + stepIdx + Math.floor(Math.random()*1000);
                    
                    if (isOldNested) {
                        var isVeryOld = s.length === 4;
                        if(isVeryOld) sId = s[0];
                        var skillData = isVeryOld ? s[1] : s[0];
                        var disData = isVeryOld ? s[2] : s[1];
                        var condsData = isVeryOld ? s[3] : s[2];
                        
                        var skillVal = typeof skillData === 'number' && ROTATION_SKILLS[skillData] ? ROTATION_SKILLS[skillData].id : skillData;
                        
                        var parsedConds = (condsData || []).map(function(c) {
                            if (Array.isArray(c)) {
                                var typeVal = typeof c[0] === 'number' && CONDITION_TYPES[c[0]] ? CONDITION_TYPES[c[0]].id : c[0];
                                var condObj = { type: typeVal };
                                if (c[1] !== undefined && c[1] !== -1 && TARGET_MAP[c[1]]) condObj.target = TARGET_MAP[c[1]];
                                if (c[2] !== undefined && c[2] !== -1 && OP_MAP[c[2]]) condObj.op = OP_MAP[c[2]];
                                condObj.val = c[3] || 0;
                                if (c[4] !== undefined) condObj.bool = c[4] === 1 ? "true" : "false";
                                return condObj;
                            }
                            return c; 
                        });
                        
                        return { id: sId, skill: skillVal, disabled: disData === 1, conditions: parsedConds }; 
                    } else {
                        var skillVal = typeof s[0] === 'number' && ROTATION_SKILLS[s[0]] ? ROTATION_SKILLS[s[0]].id : s[0];
                        var parsedConds = [];
                        
                        for (var i = 2; i < s.length; i += 5) {
                            var typeVal = typeof s[i] === 'number' && CONDITION_TYPES[s[i]] ? CONDITION_TYPES[s[i]].id : s[i];
                            var condObj = { type: typeVal };
                            
                            if (s[i+1] !== undefined && s[i+1] !== -1 && TARGET_MAP[s[i+1]]) condObj.target = TARGET_MAP[s[i+1]];
                            if (s[i+2] !== undefined && s[i+2] !== -1 && OP_MAP[s[i+2]]) condObj.op = OP_MAP[s[i+2]];
                            condObj.val = s[i+3] || 0;
                            if (s[i+4] !== undefined) condObj.bool = s[i+4] === 1 ? "true" : "false";
                            
                            parsedConds.push(condObj);
                        }
                        
                        return { id: sId, skill: skillVal, disabled: s[1] === 1, conditions: parsedConds }; 
                    }
                })
            };
        } else {
            cfg.custom_rotation = {
                name: compactRota.n || "Imported",
                desc: compactRota.d || "",
                steps: compactRota.s.map(function(s) { return { id: s[0], skill: s[1], disabled: s[2] === 1, conditions: s[3] || [] }; })
            };
        }
    } else {
        var defaultRota = PRESET_ROTATIONS["Standard 1"] || PRESET_ROTATIONS["standard"];
        cfg.custom_rotation = JSON.parse(JSON.stringify(defaultRota));
        showToast("Old config imported: Using standard rotation");
    }

    return cfg;
}

function importFromClipboard() {
    var modal = document.getElementById('importConfigModal');
    var textarea = document.getElementById('importConfigInput');
    if (modal && textarea) {
        textarea.value = ""; // Textarea leeren
        modal.classList.remove('hidden');
        textarea.focus();
    }
}

function closeImportConfigModal() {
    var modal = document.getElementById('importConfigModal');
    if (modal) modal.classList.add('hidden');
}

// 2. Führt den eigentlichen Import aus, wenn der User im Modal auf "Import" klickt
function confirmImportConfig() {
    var textarea = document.getElementById('importConfigInput');
    if (!textarea) return;
    var input = textarea.value.trim();
    
    if (!input) {
        showToast("Please paste a valid config string.");
        return;
    }

    if (ITEM_DB.length === 0) {
        alert("Database not loaded yet. Please wait a moment.");
        return;
    }

    var b64 = input;
    if (input.includes("?s=")) { b64 = input.split("?s=")[1]; }

    try {
        var json = null;
        if (typeof LZString !== 'undefined') {
            json = LZString.decompressFromEncodedURIComponent(b64);
        }
        if (!json) {
            try { json = atob(b64); } catch (e) { }
        }

        if (!json) throw new Error("Could not decode string");

        var data = JSON.parse(json);
        if (!Array.isArray(data)) data = [data];

        data.forEach(function (s) {
            var newId = Date.now() + Math.floor(Math.random() * 1000);
            var simName = (Array.isArray(s) ? s[0] : (s.n || s.name || "Simulation")) + " (Imp)";
            var newSim = new SimObject(newId, simName);

            if (Array.isArray(s) && s.length === 2 && Array.isArray(s[1])) {
                newSim.config = unpackConfig(s[1]);
            } else if (s.d) {
                newSim.config = unpackConfig(s.d);
            } else if (s.config) {
                newSim.config = s.config;
            } else {
                newSim.config = unpackConfig(s);
            }

            SIM_LIST.push(newSim);
        });

        closeImportConfigModal();
        renderSidebar();
        switchSim(SIM_LIST.length - 1);
        showToast("Imported successfully!");

    } catch (e) {
        console.error(e);
        alert("Invalid Config String!");
    }
}

function exportSettings() {
    saveCurrentState();

    if (SIM_LIST[ACTIVE_SIM_INDEX]) {
        SIM_LIST[ACTIVE_SIM_INDEX].config = getCurrentConfigFromUI();
    }

    var isOverview = !document.getElementById('comparisonView').classList.contains('hidden');
    var simsToProcess = isOverview ? SIM_LIST : (SIM_LIST[ACTIVE_SIM_INDEX] ? [SIM_LIST[ACTIVE_SIM_INDEX]] : []);

    var hasAnyGear = false;
    /*
    var dataToExport = simsToProcess.map(function (s) {
        var packResult = packConfig(s.config);
        if (packResult.itemCount > 0) hasAnyGear = true;
        return { n: s.name, d: packResult.data };
    });*/

    var dataToExport = simsToProcess.map(function (s) {
        var packResult = packConfig(s.config);
        if (packResult.itemCount > 0) hasAnyGear = true;
        // NEU: Platz sparen, wenn der Name nur "Simulation X" ist
        var exportName = s.name.startsWith("Simulation ") ? "" : s.name;
        return [exportName, packResult.data]; 
    });

    if (!hasAnyGear) {
        alert("ACHTUNG: Es wurde KEIN Gear gefunden!\nBitte wähle im Simulator erst Items aus, bevor du exportierst.");
        return;
    }

    var jsonStr = JSON.stringify(dataToExport);
    var compressed = "";

    if (typeof LZString !== 'undefined') {
        compressed = LZString.compressToEncodedURIComponent(jsonStr);
    } else {
        compressed = btoa(jsonStr);
    }

    var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?s=' + compressed;
    window.history.pushState({ path: newUrl }, '', newUrl);
    navigator.clipboard.writeText(newUrl);

    var msg = isOverview ? "All Sims Copied!" : "Current Sim Copied!";
    showToast(msg);
}

var importRetries = 0;
function importSettings() {
    var params = new URLSearchParams(window.location.search);
    var b64 = params.get('s');

    if (b64) {
        if (ITEM_DB.length === 0) {
            if (importRetries < 50) {
                console.log("Waiting for Item DB to load (URL Import)...");
                importRetries++;
                setTimeout(importSettings, 200);
                return;
            } else {
                console.error("Database load timeout.");
                showToast("DB Load Timeout");
                return;
            }
        }

        try {
            var json = null;
            if (typeof LZString !== 'undefined') {
                json = LZString.decompressFromEncodedURIComponent(b64);
            }
            if (!json) { try { json = atob(b64); } catch (e) { } }

            if (json) {
                var data = JSON.parse(json);
                if (Array.isArray(data)) {
                    SIM_LIST = [];

                    /*
                    data.forEach(d => {
                        // KORREKTUR: Name explizit aus d.n (vom Export-Objekt) nehmen
                        var simName = d.n || d.name || "Simulation " + (SIM_LIST.length + 1);
                        var s = new SimObject(Date.now() + Math.random(), simName);

                        if (d.d) s.config = unpackConfig(d.d);
                        else s.config = d.config || d;

                        SIM_LIST.push(s);
                    });
                    */

                    data.forEach(d => {
                        var simName = "Simulation " + (SIM_LIST.length + 1);
                        var configData = null;

                        if (Array.isArray(d) && d.length === 2 && Array.isArray(d[1])) {
                            // Neues Format
                            simName = d[0] || simName;
                            configData = unpackConfig(d[1]);
                        } else {
                            // Altes Format
                            simName = d.n || d.name || simName;
                            if (d.d) configData = unpackConfig(d.d);
                            else configData = d.config || d;
                        }

                        var s = new SimObject(Date.now() + Math.random(), simName);
                        s.config = configData;

                        SIM_LIST.push(s);
                    });

                    if (SIM_LIST.length > 0) {
                        ACTIVE_SIM_INDEX = 0;
                        // KORREKTUR: Den Namen auch im UI-Input setzen
                        var nameInput = document.getElementById('simName');
                        if (nameInput) nameInput.value = SIM_LIST[0].name;

                        applyConfigToUI(SIM_LIST[0].config);
                        renderSidebar();
                        showOverview();
                    } else {
                        addSim(true);
                    }
                }
            }
        } catch (e) {
            console.error("Import failed", e);
        }
    }
}

function exportCSV() {
    if (!SIM_DATA || !CURRENT_VIEW || !SIM_DATA[CURRENT_VIEW]) {
        alert("Please run a simulation first.");
        return;
    }

    var logData = SIM_DATA[CURRENT_VIEW].log;
    if (!logData || logData.length === 0) {
        alert("No log data available for " + CURRENT_VIEW + " view.");
        return;
    }

    // Define CSV Headers
    var header = ["Time", "Event", "Spell", "Result", "Dmg_Normal", "Dmg_Eclipse", "Dmg_Crit", "Total_Dmg", "CastTime", "Mana", "Eclipse", "MF_Rem", "IS_Rem", "BoaT", "NG", "OoC", "Boon", "SP", "Info"];
    var csvContent = "data:text/csv;charset=utf-8,";
    csvContent += header.join(",") + "\r\n";

    // Format Rows
    logData.forEach(function (row) {
        // Calculate Total damage for clarity
        var totalDmg = (row.dmgNorm || 0) + (row.dmgEcl || 0) + (row.dmgCrit || 0);

        var rowData = [
            row.t,
            row.evt,
            row.spell,
            row.res,
            Math.floor(row.dmgNorm || 0),
            Math.floor(row.dmgEcl || 0),
            Math.floor(row.dmgCrit || 0),
            Math.floor(totalDmg),
            (row.castTime || "0").replace('s', ''), // Clean "1.5s" -> "1.5"
            row.mana !== "-" ? row.mana : 0,
            row.ecl === "" ? "None" : row.ecl, // Explicit None
            row.mfRem !== "-" ? row.mfRem : 0,
            row.isRem !== "-" ? row.isRem : 0,
            row.boat,
            row.ng === "YES" ? 1 : 0, // Boolean to INT for Excel
            row.ooc === "YES" ? 1 : 0,
            row.boon !== "-" ? row.boon : 0,
            row.sp,
            '"' + (row.info || "") + '"' // Escape commas in info
        ];
        csvContent += rowData.join(",") + "\r\n";
    });

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Unique filename with view type and timestamp
    var timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.setAttribute("download", "moonkin_sim_log_" + CURRENT_VIEW + "_" + timestamp + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
