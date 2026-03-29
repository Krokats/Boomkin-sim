/**
 * Moonkin Simulation - File 4: UI Manager
 */

// ============================================================================
// UI SETUP & EVENT LISTENERS
// ============================================================================
var CURRENT_LOG_PAGE = 0;
var LOG_ENTRIES_PER_PAGE = 50;

function setupUIListeners() {
    var methodSelect = document.getElementById('calcMethod');
    setupCollapsibleCards();
    var iterInput = document.getElementById('simCount');
    if (iterInput) {
        iterInput.disabled = false;
        iterInput.parentElement.style.opacity = "1";
    }

    // IDOL EXCLUSIVITY FOR 1.18.1c
    var idolIds = ["idolEoF", "idolMoon", "idolProp", "idolMoonfang", "idolAcidity","idolEquilibrium","idolEquilibriumV2","idolEquilibriumV3"];
    idolIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function (e) {
                if (e.target.checked) {
                    idolIds.forEach(function (otherId) {
                        if (otherId !== id) {
                            var other = document.getElementById(otherId);
                            if (other) other.checked = false;
                        }
                    });
                }
                saveCurrentState();
            });
        }
    });

    var enemyInputs = ['enemy_level', 'res_arcane', 'res_nature', 'sp_pen'];
    enemyInputs.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function () {
                updateEnemyInfo();
                saveCurrentState();
            });
            el.addEventListener('input', updateEnemyInfo);
        }
    });

    var iMoon = document.getElementById('idolMoon');
    var iMoonfang = document.getElementById('idolMoonfang');
    if (iMoon && iMoonfang) {
        iMoon.addEventListener('change', function (e) {
            if (e.target.checked) iMoonfang.checked = false;
            saveCurrentState();
        });
        iMoonfang.addEventListener('change', function (e) {
            if (e.target.checked) iMoon.checked = false;
            saveCurrentState();
        });
    }

    // FOOD EXCLUSIVITY
    var fSp = document.getElementById('buff_food_sp');
    var fMedley = document.getElementById('buff_food_medley');
    if (fSp && fMedley) {
        fSp.addEventListener('change', function (e) {
            if (e.target.checked) fMedley.checked = false;
            saveCurrentState();
        });
        fMedley.addEventListener('change', function (e) {
            if (e.target.checked) fSp.checked = false;
            saveCurrentState();
        });
    }

    var raceSel = document.getElementById('char_race');
    if (raceSel) {
        raceSel.addEventListener('change', function () {
            calculateGearStats();
            saveCurrentState();
        });
    }

    // ECLIPSE OVERRIDE LISTENER
    var elEclOver = document.getElementById('stat_override_eclipse');
    if (elEclOver) {
        elEclOver.addEventListener('change', function () {
            var elNat = document.getElementById('stat_proc_nature');
            var elArc = document.getElementById('stat_proc_arcane');
            if (elNat && elArc) {
                var active = elEclOver.checked;
                elNat.disabled = !active;
                elArc.disabled = !active;
                // Wenn deaktiviert, visuell auf Standard zurücksetzen
                if (!active) {
                    elNat.value = 60;
                    elArc.value = 40;
                }
            }
            saveCurrentState();
        });
    }

    // Robust Buff & Config Listener Attachment
    CONFIG_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function () {
                // maxTime hinzugefügt, damit bei Änderung neu gerechnet wird
                if (id.startsWith("buff_") || id === "maxTime") calculateGearStats();
                if (id === "maxTime") recalcItemScores();
                updateSpellStats(); // NEU: Automatisches Update der Damage Scaling Tabelle
                saveCurrentState();
            });

            // NEU: Für echtes Live-Update schon während dem Tippen in der Fight Duration
            if (id === "maxTime") {
                el.addEventListener('input', function () {
                    calculateGearStats();
                    recalcItemScores();
                });
            }
        }
    });

    // MODAL CLOSE LISTENERS
    document.addEventListener('keydown', function (e) {
        if (e.key === "Escape") {
            closeItemModal();
            closeEnchantModal();
        }
    });

    var modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(function (modal) {
        modal.addEventListener('mousedown', function (e) {
            if (e.target === modal) {
                closeItemModal();
                closeEnchantModal();
            }
        });
    });
}


function setupCollapsibleCards() {
    var headers = document.querySelectorAll('.card-header');
    headers.forEach(function (header) {
        header.addEventListener('click', function (e) {
            // Verhindern, dass Klicks auf Buttons im Header die Karte zuklappen
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            var card = header.closest('.card');
            if (card) {
                card.classList.toggle('collapsed');
            }
        });
    });
}

// ============================================================================
// MANAGEMENT & STATE
// ============================================================================

function getCurrentConfigFromUI() {
    var cfg = {};
    CONFIG_IDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { if (el.type === 'checkbox') cfg[id] = el.checked ? 1 : 0; else cfg[id] = el.value; }
    });

    if (typeof GEAR_SELECTION !== 'undefined') {
        cfg.gearSelection = JSON.parse(JSON.stringify(GEAR_SELECTION));
    } else {
        cfg.gearSelection = {};
    }

    if (typeof ENCHANT_SELECTION !== 'undefined') {
        cfg.enchantSelection = JSON.parse(JSON.stringify(ENCHANT_SELECTION));
    } else {
        cfg.enchantSelection = {};
    }

    // NEU: Rotation in die Konfiguration packen
    cfg.custom_rotation = JSON.parse(JSON.stringify(CUSTOM_ROTATION));

    return cfg;
}

function applyConfigToUI(cfg) {
    if (!cfg) return;

    for (var id in cfg) {
        if (id === 'gearSelection' || id === 'enchantSelection') continue;
        var el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') el.checked = (cfg[id] == 1);
            else el.value = cfg[id];
        }
    }

    if (cfg.gearSelection) {
        GEAR_SELECTION = JSON.parse(JSON.stringify(cfg.gearSelection));
    } else {
        GEAR_SELECTION = {};
    }

    if (cfg.enchantSelection) {
        ENCHANT_SELECTION = JSON.parse(JSON.stringify(cfg.enchantSelection));
    } else {
        ENCHANT_SELECTION = {};
    }

    if (typeof initGearPlannerUI === 'function') {
        initGearPlannerUI();
    }

    if (GEAR_SELECTION && Object.keys(GEAR_SELECTION).length > 0) {
        for (var slot in GEAR_SELECTION) {
            var item = GEAR_SELECTION[slot];
            if (item && item.icon) {
                var slotIds = ["slot_" + slot, "gear_" + slot, "item_" + slot, slot];
                for (var i = 0; i < slotIds.length; i++) {
                    var el = document.getElementById(slotIds[i]);
                    if (el) {
                        var iconUrl = "https://wow.zamimg.com/images/wow/icons/large/" + item.icon + ".jpg";
                        el.style.backgroundImage = "url('" + iconUrl + "')";
                        el.classList.add("has-item");
                        var img = el.querySelector("img");
                        if (img) img.src = iconUrl;
                        break;
                    }
                }
            }
        }

    }

    // Update Interrupt Threshold Display
    var elThresh = document.getElementById("rota_interrupt_thresh");
    var elThreshDisp = document.getElementById("disp_interrupt_thresh");
    if (elThresh && elThreshDisp) {
        elThreshDisp.innerText = elThresh.value + "%";
    }


    calculateGearStats();
    updateEnemyInfo();
    updateSpellStats();
    updatePatchUI();

    // Sync Eclipse UI State
    var elEclOver = document.getElementById('stat_override_eclipse');
    var elNat = document.getElementById('stat_proc_nature');
    var elArc = document.getElementById('stat_proc_arcane');
    if (elEclOver && elNat && elArc) {
        elNat.disabled = !elEclOver.checked;
        elArc.disabled = !elEclOver.checked;
    }

    // NEU: Custom Rotation aus dem Config-Objekt laden und UI neu rendern
    if (cfg.custom_rotation) {
        CUSTOM_ROTATION = JSON.parse(JSON.stringify(cfg.custom_rotation));
    } else {
        CUSTOM_ROTATION = JSON.parse(JSON.stringify(PRESET_ROTATIONS["standard"]));
    }

    if (typeof renderRotationList === 'function') {
        renderRotationList();
    }
}

function saveCurrentState() {
    if (SIM_LIST[ACTIVE_SIM_INDEX]) {
        var isOverview = !document.getElementById('comparisonView').classList.contains('hidden');
        if (!isOverview) {
            SIM_LIST[ACTIVE_SIM_INDEX].config = getCurrentConfigFromUI();
            var nameInput = document.getElementById('simName');
            if (nameInput) SIM_LIST[ACTIVE_SIM_INDEX].name = nameInput.value;
        }
    }
}

function addSim(isFirst) {
    if (!isFirst) saveCurrentState();
    var newId = Date.now();
    var newName = isFirst ? "Simulation 1" : "Simulation " + (SIM_LIST.length + 1);
    var newSim = new SimObject(newId, newName);

    if (!isFirst && SIM_LIST.length > 0) {
        newSim.config = JSON.parse(JSON.stringify(SIM_LIST[ACTIVE_SIM_INDEX].config));
    } else {
        newSim.config = getCurrentConfigFromUI();
    }

    SIM_LIST.push(newSim);

    if (!isFirst) {
        switchSim(SIM_LIST.length - 1);
    } else {
        renderSidebar();
    }
}

function deleteSim(index) {
    if (!confirm("Delete?")) return;
    SIM_LIST.splice(index, 1);
    if (SIM_LIST.length === 0) { addSim(true); return; }
    if (index === ACTIVE_SIM_INDEX) { ACTIVE_SIM_INDEX = Math.max(0, index - 1); } else if (index < ACTIVE_SIM_INDEX) { ACTIVE_SIM_INDEX--; }
    renderSidebar(); renderComparisonTable(); showToast("Deleted");
}

function switchSim(index) {
    if (index < 0 || index >= SIM_LIST.length) return;
    saveCurrentState();
    ACTIVE_SIM_INDEX = index;

    var sim = SIM_LIST[index];
    var nameInput = document.getElementById('simName');

    // Setze den Namen im Header
        if (nameInput) {
            nameInput.value = sim.name;
            nameInput.disabled = false;
            nameInput.style.color = "var(--druid-orange)";
        }

        var res = sim.results;
        // WICHTIG: SIM_DATA setzen BEVOR das UI geupdatet wird, damit die Rotation die neuen Zahlen hat!
        SIM_DATA = res ? res : null;

        // Lade die Konfiguration in das UI
        applyConfigToUI(sim.config);

        // Ansichten umschalten
        document.getElementById('comparisonView').classList.add('hidden');
        document.getElementById('singleSimView').classList.remove('hidden');
        // Update Name in Results Header
        var resNameEl = document.getElementById('resultSimName');
        if (resNameEl) resNameEl.innerText = sim.name;

        var weightResBox = document.getElementById("weightResults");

        if (res) {
            document.getElementById('resultsArea').classList.remove('hidden');
            switchView(CURRENT_VIEW);

        // Anzeige der Stat Weights aktualisieren
        if (weightResBox) {
            if (res.statWeights) {
                weightResBox.classList.remove("hidden");
                // Befülle die HTML-Container mit den gespeicherten Werten
                if (document.getElementById("val_crit")) document.getElementById("val_crit").innerHTML = res.statWeights.crit || "";
                if (document.getElementById("val_hit")) document.getElementById("val_hit").innerHTML = res.statWeights.hit || "";
                if (document.getElementById("val_haste")) document.getElementById("val_haste").innerHTML = res.statWeights.haste || "";
                if (document.getElementById("haste_steps_container")) document.getElementById("haste_steps_container").innerHTML = res.statWeights.hasteStepsHtml || "";
            } else {
                weightResBox.classList.add("hidden");
            }
        }

        var btnW = document.getElementById("btnWeights");
        if (btnW) btnW.disabled = false;

        if (document.getElementById("viewSeed")) setText("viewSeed", "Seed Run (" + res.seed.dps.toFixed(1) + ")");
        setText("viewMedian", "Median (" + res.median.dps.toFixed(1) + ")");
        setText("viewP5", "5% DPS (" + res.p5.dps.toFixed(1) + ")");
        setText("viewP95", "95% DPS (" + res.p95.dps.toFixed(1) + ")");
    } else {
        SIM_DATA = null;
        document.getElementById('resultsArea').classList.add('hidden');
        if (weightResBox) weightResBox.classList.add("hidden");
        var btnW = document.getElementById("btnWeights");
        if (btnW) btnW.disabled = true;
    }

    renderSidebar();
}

function addNewSim() { addSim(false); showToast("Duplicated!"); }
function updateSimName() {
    if (SIM_LIST[ACTIVE_SIM_INDEX]) {
        SIM_LIST[ACTIVE_SIM_INDEX].name = document.getElementById('simName').value;
        saveCurrentState();
        renderSidebar();
    }
}

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

/*
function packConfig(cfg) {
    var values = CONFIG_IDS.map(function (id) { return cfg[id]; });

    var gearIds = {};
    var itemCount = 0;
    if (cfg.gearSelection) {
        for (var slot in cfg.gearSelection) {
            var val = cfg.gearSelection[slot];

            var idToSave = null;
            if (val && typeof val === 'object' && val.id) {
                idToSave = val.id;
            } else if (val && (typeof val === 'number' || typeof val === 'string')) {
                idToSave = val;
            }

            if (idToSave && idToSave != 0) {
                gearIds[slot] = idToSave;
                itemCount++;
            }
        }
    }

    var enchantIds = {};
    if (cfg.enchantSelection) {
        for (var slot in cfg.enchantSelection) {
            var val = cfg.enchantSelection[slot];

            var idToSave = null;
            if (val && typeof val === 'object' && val.id) {
                idToSave = val.id;
            } else if (val && (typeof val === 'number' || typeof val === 'string')) {
                idToSave = val;
            }

            if (idToSave && idToSave != 0) {
                enchantIds[slot] = idToSave;
            }
        }
    }

    // NEU: Rotation ultra-kompakt verpacken
    var compactRota = {
        n: cfg.custom_rotation.name,
        d: cfg.custom_rotation.desc,
        s: cfg.custom_rotation.steps.map(step => [step.id, step.skill, step.disabled ? 1 : 0, step.conditions])
    };

    return {
        data: [values, gearIds, enchantIds, compactRota],
        itemCount: itemCount
    };
}
    */

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

/*
function unpackConfig(packed) {
    // Toleranz für 3 (alt) oder 4 (neu) Arrays
    if (!Array.isArray(packed) || packed.length < 3 || !Array.isArray(packed[0])) {
        return packed;
    }

    var values = packed[0];
    var gearIds = packed[1];
    var enchantIds = packed[2];
    var compactRota = packed.length > 3 ? packed[3] : null;
    var cfg = {};

    CONFIG_IDS.forEach(function (id, idx) {
        if (idx < values.length) cfg[id] = values[idx];
    });

    cfg.gearSelection = {};
    if (gearIds && ITEM_DB.length > 0) {
        for (var slot in gearIds) {
            var id = gearIds[slot];
            var item = ITEM_DB.find(function (i) { return String(i.id) === String(id); });
            if (item) {
                cfg.gearSelection[slot] = item.id;
            }
        }
    }

    cfg.enchantSelection = {};
    if (enchantIds && ENCHANT_DB.length > 0) {
        for (var slot in enchantIds) {
            var id = enchantIds[slot];
            var ench = ENCHANT_DB.find(function (e) { return String(e.id) === String(id); });
            if (ench) {
                cfg.enchantSelection[slot] = ench.id;
            }
        }
    }

    // NEU: Rotation entpacken oder Fallback nutzen
    if (compactRota) {
        cfg.custom_rotation = {
            name: compactRota.n || "Imported",
            desc: compactRota.d || "",
            steps: compactRota.s.map(s => ({ id: s[0], skill: s[1], disabled: s[2] === 1, conditions: s[3] || [] }))
        };
    } else {
        cfg.custom_rotation = JSON.parse(JSON.stringify(PRESET_ROTATIONS["standard"]));
        showToast("Old config imported: Using standard rotation");
    }

    return cfg;
}*/

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
    var input = prompt("Paste the config string (or full URL) here:");
    if (!input) return;

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

        /*
        data.forEach(function (s) {
            var newId = Date.now() + Math.floor(Math.random() * 1000);
            var newSim = new SimObject(newId, s.n + " (Imp)");

            if (s.d) newSim.config = unpackConfig(s.d);
            else if (s.config) newSim.config = s.config;
            else newSim.config = unpackConfig(s);

            SIM_LIST.push(newSim);
        });*/

        data.forEach(function (s) {
            var newId = Date.now() + Math.floor(Math.random() * 1000);
            
            // Abwärtskompatibilität: Check, ob Array (neu) oder Objekt (alt)
            var simName = (Array.isArray(s) ? s[0] : (s.n || s.name || "Simulation")) + " (Imp)";
            var newSim = new SimObject(newId, simName);

            if (Array.isArray(s) && s.length === 2 && Array.isArray(s[1])) {
                // Neues Format
                newSim.config = unpackConfig(s[1]);
            } else if (s.d) {
                // Altes Format
                newSim.config = unpackConfig(s.d);
            } else if (s.config) {
                newSim.config = s.config;
            } else {
                newSim.config = unpackConfig(s);
            }

            SIM_LIST.push(newSim);
        });

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

function renderSidebar() { var c = document.getElementById('sidebar'); if (!c) return; var isComp = !document.getElementById('comparisonView').classList.contains('hidden'); var html = '<div class="sidebar-btn btn-overview ' + (isComp ? 'active' : '') + '" onclick="showOverview()">📊</div><div class="sidebar-separator"></div>'; SIM_LIST.forEach(function (sim, idx) { var a = (idx === ACTIVE_SIM_INDEX && !isComp) ? 'active' : ''; html += '<div class="sidebar-btn ' + a + '" onclick="switchSim(' + idx + ')" title="' + sim.name + '">' + (idx + 1) + '</div>'; }); html += '<div class="sidebar-btn btn-add" onclick="addNewSim()">+</div>'; c.innerHTML = html; }

function showOverview() {
    saveCurrentState();
    updateGlobalDpsRange();
    document.getElementById('singleSimView').classList.add('hidden');
    document.getElementById('comparisonView').classList.remove('hidden');

    var n = document.getElementById('simName');
    n.value = "Overview"; n.disabled = true; n.style.color = "#888";
    renderComparisonTable();
    renderSidebar();
}

function renderComparisonTable() {
    var b = document.getElementById('comparisonBody');
    b.innerHTML = "";
    var max = 0;
    SIM_LIST.forEach(s => { if (s.results && s.results.median.dps > max) max = s.results.median.dps; });

    SIM_LIST.forEach(function (s, i) {
        var c = s.config;
        var r = s.results;
        var avgDps = r ? r.median.dps.toFixed(1) : "-";
        var minDps = (r && r.p5) ? r.p5.dps.toFixed(1) : "-";
        var maxDps = (r && r.p95) ? r.p95.dps.toFixed(1) : "-";
        var method = 'RNG';
        var rName = c.custom_rotation ? c.custom_rotation.name : "Custom";
        var rota = '<span class="detail-text">Rota: ' + rName + '</span>';
        var activeSpells = [];
        if(c.custom_rotation) {
            c.custom_rotation.steps.forEach(st => { 
                if(!st.disabled && !activeSpells.includes(st.skill)) {
                    var shortName = st.skill;
                    if(shortName === "Moonfire") shortName = "MF";
                    if(shortName === "InsectSwarm") shortName = "IS";
                    if(shortName === "Starfire") shortName = "SF";
                    if(shortName === "Wrath") shortName = "Wr";
                    activeSpells.push(shortName); 
                }
            });
        }
        rota += '<span class="detail-text">' + activeSpells.slice(0, 4).join('/') + (activeSpells.length > 4 ? '/...' : '') + '</span>';
        if (c.start_boat > 0) rota += '<span class="detail-text">B:' + c.start_boat + '</span>';
        var gear = "";
        if (c.t3_8p == 1) gear += "T3(8)";
        else if (c.t3_6p == 1) gear += "T3(6)";
        else if (c.t3_4p == 1) gear += "T3(4)";
        if (c.t35_5p == 1) gear += " T3.5";
        var trinkets = [];
        if (c.item_reos == 1) trinkets.push("ReoS");
        if (c.item_toep == 1) trinkets.push("ToEP");
        if (c.item_sphere == 1) trinkets.push("Sphere"); // NEU: Sphere Kürzel
        if (trinkets.length > 0) gear += '<br><span class="detail-text" style="color:#aaa">' + trinkets.join('+') + '</span>';
        if (gear === "") gear = "-";
        var html = '<tr onclick="switchSim(' + i + ')" style="cursor:pointer">' +
            '<td><strong>' + s.name + '</strong></td>' +
            '<td>' + c.maxTime + 's <span class="detail-text">' + method + '</span></td>' +
            '<td>' + c.simCount + '</td>' +
            '<td>' + c.statHit + '</td>' +
            '<td>' + c.statCrit + '%</td>' +
            '<td>' + c.statHaste + '%</td>' +
            '<td>' + c.sp_gen + '</td>' +
            '<td>' + c.enemy_level + '</td>' +
            '<td>' + rota + '</td>' +
            '<td>' + gear + '</td>' +
            '<td style="color:#90caf9; text-align:right;">' + minDps + '</td>' +
            '<td style="color:#ffb74d; font-weight:bold; font-size:1.1em; text-align:right;">' + avgDps + '</td>' +
            '<td style="color:#a5d6a7; text-align:right;">' + maxDps + '</td>' +
            '<td style="text-align:center"><button class="btn-icon-delete" onclick="event.stopPropagation(); deleteSim(' + i + ')">🗑️</button></td>' +
            '</tr>';
        b.innerHTML += html;
    });
}

/*
function generateSummaryImage() {
    if (!SIM_DATA) { alert("Run Sim first."); return; }

    var sim = SIM_LIST[ACTIVE_SIM_INDEX];
    var c = sim.config;
    var r = sim.results;

    setText("sumSimName", sim.name);
    setText("sumDate", new Date().toLocaleDateString());
    setText("sumMedian", r.median.dps.toFixed(1));
    setText("sumP5", r.p5.dps.toFixed(1));
    setText("sumP95", r.p95.dps.toFixed(1));
    setText("sumTime", c.maxTime + "s");

    var methodMap = { "S": "RNG", "D_CYC": "Deterministic (Cyc)", "D_AVG": "Deterministic (Avg)" };
    setText("sumMethod", methodMap[c.calcMethod] || c.calcMethod);

    setText("sumSP", c.sp_gen);
    setText("sumCrit", c.statCrit + "%");
    setText("sumHit", c.statHit);
    setText("sumHaste", c.statHaste + "%");

    setText("sumLvl", c.enemy_level);
    setText("sumRes", "Nat:" + c.res_nature + " / Arc:" + c.res_arcane);

    var ulRot = document.getElementById("sumRotaList");
    ulRot.innerHTML = "";
    function addLi(ul, text) { ul.innerHTML += "<li>" + text + "</li>"; }

    addLi(ulRot, "Preset: " + (c.custom_rotation ? c.custom_rotation.name : "Custom"));
    if(c.custom_rotation) {
        c.custom_rotation.steps.forEach(function(st, idx) {
            if(!st.disabled) {
                var condStr = st.conditions.length === 0 ? "Always" : st.conditions.length + " Cond.";
                addLi(ulRot, (idx+1) + ". " + st.skill + " (" + condStr + ")");
            }
        });
    }
    if (c.start_boat > 0) addLi(ulRot, "Start BoaT: " + c.start_boat);
    if (c.rota_interrupt == 1) addLi(ulRot, "Cancel bad Casts");

    var ulGear = document.getElementById("sumGearList");
    ulGear.innerHTML = "";
    if (c.t3_8p == 1) addLi(ulGear, "T3 (8-Set)");
    else if (c.t3_6p == 1) addLi(ulGear, "T3 (6-Set)");
    else if (c.t3_4p == 1) addLi(ulGear, "T3 (4-Set)");
    if (c.t35_5p == 1) addLi(ulGear, "T3.5 (5-Set)");

    if (c.idolEoF == 1) addLi(ulGear, "Idol: Ebb & Flow");
    if (c.idolMoon == 1) addLi(ulGear, "Idol: Moon");
    if (c.idolMoonfang == 1) addLi(ulGear, "Idol: Moonfang");
    if (c.idolProp == 1) addLi(ulGear, "Idol: Propagation");
    if (c.idolAcidity == 1) addLi(ulGear, "Idol: Acidity");
    if (c.idolEquilibrium == 1) addLi(ulGear, "Idol: Equilibrium");
    if (c.item_nobility == 1) addLi(ulGear, "Spellwoven Nobility Drape");
    if (c.item_thane == 1) addLi(ulGear, "Harness of the High Thane");
    if (c.item_kelp == 1) addLi(ulGear, "Pristine Enchanted South Seas Kelp");

    var ulTrink = document.getElementById("sumTrinketList");
    ulTrink.innerHTML = "";
    if (c.item_reos == 1) addLi(ulTrink, "Essence of Sapphiron");
    if (c.item_toep == 1) addLi(ulTrink, "Talisman (ToEP)");
    if (c.item_binding == 1) addLi(ulTrink, "Binding (Blue Dragon)");
    if (c.item_scythe == 1) addLi(ulTrink, "Scythe of Elune");
    if (c.item_sulfuras == 1) addLi(ulTrink, "True Band of Sulfuras");
    if (c.item_sigil == 1) addLi(ulTrink, "Sigil of the Ancient Accord");
    if (c.item_chromie == 1) addLi(ulTrink, "Chromie's Broken Pocket Watch");
    if (c.item_sphere == 1) addLi(ulTrink, "Sphere of the Endless Gulch"); // NEU: Sphere Liste

    addLi(ulTrink, "Strat: " + (c.trinket_strat === "START" ? "On Start" : "On Eclipse"));

    var sourceChart = document.getElementById("dpsChart");
    var targetContainer = document.getElementById("sumChartContainer");
    if (sourceChart && targetContainer) {
        targetContainer.innerHTML = sourceChart.innerHTML;

        showToast("Generating...");
        var card = document.getElementById("summaryCard");
        html2canvas(card, { scale: 2, backgroundColor: null, useCORS: true }).then(function (canvas) {
            // Aufräumen nach Generierung
            if (targetContainer) targetContainer.innerHTML = "";

            var link = document.createElement('a');
            link.download = 'moonkin_sim_summary.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}*/

// ============================================================================
// VIEW RENDERING
// ============================================================================

function switchView(type) {
    if (!SIM_DATA) return;
    CURRENT_LOG_PAGE = 0;
    CURRENT_VIEW = type;
    document.getElementById("resultsArea").classList.remove("hidden");

    // NEU: Verteilungsgrafik immer aktualisieren
    updateGlobalDpsRange();
    renderDPSDistribution(SIM_DATA);

    var btns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');

    if (type === 'seed') { var btn = document.getElementById('viewSeed'); if(btn) btn.classList.add('active'); }
    if (type === 'median') document.getElementById('viewMedian').classList.add('active');
    if (type === 'p5') document.getElementById('viewP5').classList.add('active');
    if (type === 'p95') document.getElementById('viewP95').classList.add('active');

    var data = SIM_DATA[type];

    setText("out_dps_main", data.dps.toFixed(1));
    setText("out_total_dmg", Math.floor(data.stats.totalDmg).toLocaleString());

    if (document.getElementById("out_total_mana")) {
        setText("out_total_mana", Math.floor(data.stats.totalMana).toLocaleString());
    }
    if (document.getElementById("out_mps")) {
        var mps = data.stats.totalMana / getVal("maxTime");
        setText("out_mps", mps.toFixed(1) + " MPS");
    }

    var maxT = getVal("maxTime");
    var pctNE = (data.stats.uptimeNE / maxT) * 100;
    var pctAE = (data.stats.uptimeAE / maxT) * 100;
    var pctNone = Math.max(0, 100 - pctNE - pctAE); // Restliche Zeit

    if (document.getElementById("out_up_ne")) setText("out_up_ne", pctNE.toFixed(1) + "%");
    if (document.getElementById("out_up_ae")) setText("out_up_ae", pctAE.toFixed(1) + "%");
    if (document.getElementById("out_up_none")) setText("out_up_none", pctNone.toFixed(1) + "%");

    var bNe = document.getElementById("bar_up_ne"); if (bNe) bNe.style.width = pctNE + "%";
    var bAe = document.getElementById("bar_up_ae"); if (bAe) bAe.style.width = pctAE + "%";
    var bNone = document.getElementById("bar_up_none"); if (bNone) bNone.style.width = pctNone + "%";

    var tbody = document.getElementById("tbl_body");
    if (tbody) {
        tbody.innerHTML = "";

        // Helper: Standard Damage Row with Bar
        function addRow(label, dmg, total) {
            var rawPct = (total > 0) ? (dmg / total * 100) : 0;
            var pctStr = rawPct.toFixed(1) + "%";
            var barWidth = rawPct.toFixed(1) + "%";
            var barColor = "var(--druid-orange)";
            if (label.includes("Starfire") || label.includes("Moonfire")) barColor = "var(--arcane-blue)";
            if (label.includes("Wrath") || label.includes("Insect")) barColor = "var(--nature-green)";
            if (label.includes("Total Arcane")) barColor = "var(--arcane-blue)";
            if (label.includes("Total Nature")) barColor = "var(--nature-green)";

            var row = '<tr><td class="text-left" style="font-weight:500">' + label + '</td>' +
                '<td class="text-right" style="color:#fff">' + Math.floor(dmg).toLocaleString() + '</td>' +
                '<td class="text-right" style="color:var(--text-muted)">' + pctStr + '</td>' +
                '<td class="bar-col"><div class="bar-bg"><div class="bar-fill" style="width: ' + barWidth + '; background-color: ' + barColor + '"></div></div></td></tr>';
            tbody.innerHTML += row;
        }

        // Helper: Simple Stat Row (No Bar)
        function addStatRow(label, valString, subVal, isHeader) {
            if (isHeader) {
                tbody.innerHTML += '<tr class="section-header"><td colspan="4">' + label + '</td></tr>';
                return;
            }
            var row = '<tr><td class="text-left" style="font-weight:500; color:#aaa;">' + label + '</td>' +
                '<td class="text-right stat-value">' + valString + '</td>' +
                '<td class="text-right" style="color:var(--text-muted)">' + (subVal || "") + '</td>' +
                '<td class="bar-col"></td></tr>';
            tbody.innerHTML += row;
        }

        // Retrieve Spell Stats safely
        var getStats = function (id) {
            return (data.stats.spellStats && data.stats.spellStats[id]) ? data.stats.spellStats[id] : { count: 0, timeSum: 0, hits: 0, crits: 0 };
        };
        var sf = getStats("Starfire");
        var wr = getStats("Wrath");

        // --- SECTION 1: ACTIVE DAMAGE SOURCES ---
        addStatRow("Active Damage Sources", "", "", true);
        addRow("Starfire", data.stats.dmgStarfire, data.stats.totalDmg);
        addRow("Wrath", data.stats.dmgWrath, data.stats.totalDmg);
        addRow("Moonfire (Hit)", data.stats.dmgMFDirect, data.stats.totalDmg);
        addRow("Moonfire (Tick)", data.stats.dmgMFTick, data.stats.totalDmg);
        addRow("Insect Swarm", data.stats.dmgIS, data.stats.totalDmg);

        // --- SECTION 2: PROCS & BONUSES (Only if active) ---
        var hasProcs = (data.stats.dmgT36p > 0 || data.stats.dmgIdol > 0 || data.stats.dmgT34p > 0 || data.stats.dmgScythe > 0 || data.stats.dmgSigil > 0);
        if (hasProcs) {
            addStatRow("Procs & Bonuses", "", "", true);
            if (data.stats.dmgT36p > 0) addRow("Proc: T3 6p", data.stats.dmgT36p, data.stats.totalDmg);
            if (data.stats.dmgIdol > 0) addRow("Bonus: Idols", data.stats.dmgIdol, data.stats.totalDmg);
            if (data.stats.dmgT34p > 0) addRow("Bonus: T3 4p", data.stats.dmgT34p, data.stats.totalDmg);
            if (data.stats.dmgScythe > 0) addRow("Proc: Scythe", data.stats.dmgScythe, data.stats.totalDmg);
            if (data.stats.dmgSigil > 0) addRow("Proc: Sigil of Accord", data.stats.dmgSigil, data.stats.totalDmg);
        }

        // --- NEW SECTION: SPELL SCHOOL ---
        addStatRow("Spell School", "", "", true);
        var totalArcane = data.stats.dmgStarfire + data.stats.dmgMFDirect + data.stats.dmgMFTick + (data.stats.dmgScythe || 0) + (data.stats.dmgSigil || 0);
        var totalNature = data.stats.dmgWrath + data.stats.dmgIS;
        addRow("Total Arcane Damage", totalArcane, data.stats.totalDmg);
        addRow("Total Nature Damage", totalNature, data.stats.totalDmg);

        // --- SECTION 3: PERFORMANCE METRICS ---
        addStatRow("Performance Metrics", "", "", true);
        addRow("Critical Damage (Total)", data.stats.dmgCrit, data.stats.totalDmg);

        var wrCritPct = wr.hits > 0 ? (wr.crits / wr.hits * 100).toFixed(1) + "%" : "-";
        addStatRow("Wrath Crit Rate", wrCritPct, wr.crits.toFixed(0) + " Crits");

        var sfCritPct = sf.hits > 0 ? (sf.crits / sf.hits * 100).toFixed(1) + "%" : "-";
        addStatRow("Starfire Crit Rate", sfCritPct, sf.crits.toFixed(0) + " Crits");

        // Moonfire Stats sicher abrufen
        var mf = (data.stats.spellStats && data.stats.spellStats["Moonfire"]) ? data.stats.spellStats["Moonfire"] : { hits: 0, crits: 0, count: 0, timeSum: 0 };
        var mfCritPct = mf.hits > 0 ? (mf.crits / mf.hits * 100).toFixed(1) + "%" : "-";
        addStatRow("Moonfire Crit Rate", mfCritPct, mf.crits.toFixed(0) + " Crits");


        // --- SECTION 4: CASTING STATS ---
        addStatRow("Casting Stats", "", "", true);
        var sfTime = sf.count > 0 ? (sf.timeSum / sf.count).toFixed(2) + "s" : "-";
        addStatRow("Avg. Cast Starfire", sfTime, sf.count.toFixed(0) + " Casts");

        var wrTime = wr.count > 0 ? (wr.timeSum / wr.count).toFixed(2) + "s" : "-";
        addStatRow("Avg. Cast Wrath", wrTime, wr.count.toFixed(0) + " Casts");

        // Moonfire Cast Zeit
        addStatRow("Avg. Cast Moonfire","" , mf.count.toFixed(0) + " Casts");

        // Insect Swarm Stats sicher abrufen und Cast Zeit berechnen
        var isw = (data.stats.spellStats && data.stats.spellStats["InsectSwarm"]) ? data.stats.spellStats["InsectSwarm"] : { hits: 0, crits: 0, count: 0, timeSum: 0 };
        addStatRow("Avg. Cast Insect Swarm", "", isw.count.toFixed(0) + " Casts");
    }

    var logLabel = document.getElementById("logTypeLabel");
    if (logLabel) {
        if (!data.log || data.log.length === 0) {
            logLabel.innerText = "(No Log)";
            if (document.getElementById("logBody")) document.getElementById("logBody").innerHTML = "<tr><td colspan='22' style='text-align:center; padding:20px; color:#666;'>Log available in Min/Max view or Single runs.</td></tr>";
        } else {
            // Geänderte Beschriftung für den Average-View und Seed-View
                var labelSuffix = type === 'median' ? "REPRESENTATIVE RUN" : (type === 'seed' ? "SEED RUN (ITERATION 0)" : type.toUpperCase());
                logLabel.innerText = "(" + labelSuffix + ")";
                    renderCombatChart(data.log); // Zeichnet unser neues Diagramm
                    renderCombatLog(data.log);
                }
                var logSec = document.getElementById("combatLogSection");
        if (logSec) logSec.classList.remove("hidden");
    }
}

function renderCombatLog(logData) {
    if (!logData || logData.length === 0) return;
    var cfg = getInputs();
    var showBoat = false;

    // Container und Header-Referenzen
    var thead = document.getElementById("logHeader");
    var tbody = document.getElementById("logBody");

    // Header-Erstellung (Bleibt identisch mit Ihrem Code)
    var baseCols = `<th style="width: 50px;">Time</th><th style="width: 50px;">Event</th><th class="col-left" style="width: 90px;">Spell</th><th style="width: 40px;">CastT</th><th style="width: 30px;">Res</th><th style="width: 50px; text-align:right;">Norm</th><th style="width: 50px; text-align:right;">Ecl</th><th style="width: 50px; text-align:right;">Crit</th><th style="width: 40px;">MF(s)</th><th style="width: 40px;">IS(s)</th>`;
    if (showBoat) baseCols += `<th style="width: 30px;">BoaT</th>`;
    baseCols += `<th style="width: 30px;">NG</th><th style="width: 30px;">OoC</th><th style="width: 30px;">NB</th><th style="width: 40px;">SP</th><th style="width: 45px; color:#ff9800;">Haste</th><th style="width: 30px;">T3.6</th><th style="width: 30px;">T3.8</th><th style="width: 40px; color:#00b0ff;">Mana</th>`;
    if (cfg.gear.binding) baseCols += `<th style="width: 40px; color:#e91e63;">Bind</th>`;
    if (cfg.gear.stag_5p) baseCols += `<th style="width: 40px; color:#ffeb3b;">Stag</th>`;
    if (cfg.gear.reos) baseCols += `<th style="width: 40px; color:#e91e63;">REoS</th>`;
    if (cfg.gear.toep) baseCols += `<th style="width: 40px; color:#e91e63;">ToEP</th>`;
    if (cfg.gear.roop) baseCols += `<th style="width: 40px; color:#e91e63;">RoOP</th>`;
    if (cfg.gear.zhc) baseCols += `<th style="width: 40px; color:#e91e63;">ZHC</th>`;
    baseCols += `<th class="col-left">Info</th>`;
    thead.innerHTML = `<tr>${baseCols}</tr>`;

    // PAGINIERUNG LOGIK
    var totalPages = Math.ceil(logData.length / LOG_ENTRIES_PER_PAGE);
    if (CURRENT_LOG_PAGE >= totalPages) CURRENT_LOG_PAGE = 0;

    var start = CURRENT_LOG_PAGE * LOG_ENTRIES_PER_PAGE;
    var end = start + LOG_ENTRIES_PER_PAGE;
    var pageData = logData.slice(start, end);

    tbody.innerHTML = "";

    // Zeilen rendern (Logik identisch mit Ihrem Code, nutzt nun 'pageData')
    for (var i = 0; i < pageData.length; i++) {
        var entry = pageData[i];
        var rowClass = "";
        if (entry.evt === "IMPACT") rowClass = "log-row-impact";
        if (entry.evt === "TICK") rowClass = "log-row-tick";
        if (entry.res === "CRIT") rowClass = "log-row-crit";
        if (entry.evt === "PROC DMG") rowClass = "log-row-proc";
        if (entry.evt === "PROC") rowClass = "log-row-proc";
        if (entry.isAE) rowClass += " row-arcane";
        if (entry.isNE) rowClass += " row-nature";

        var boatStr = entry.boat > 0 ? `<span class="col-boat">${entry.boat}</span>` : "-";
        var ngStr = (entry.ng === "YES") ? `<span class="col-ng">YES</span>` : "-";
        var oocStr = (entry.ooc === "YES") ? `<span class="col-ooc">YES</span>` : "-";
        var boonStr = (entry.boon !== "-" && entry.boon > 0) ? `<span class="col-boon">${entry.boon}</span>` : "-";
        var valNorm = entry.dmgNorm > 0 ? Math.floor(entry.dmgNorm) : "-";
        var valEcl = entry.dmgEcl > 0 ? `<span class="col-ecl">+${Math.floor(entry.dmgEcl)}</span>` : "-";
        var valCrit = (entry.evt === "TICK") ? "-" : (entry.dmgCrit > 0 ? `<span class="col-crit">+${Math.floor(entry.dmgCrit)}</span>` : "-");

        var html = `<tr class="${rowClass}"><td class="log-time">${entry.t}</td><td>${entry.evt}</td><td class="col-left">${entry.spell}</td><td>${entry.castTime}</td><td class="col-sp">${entry.res}</td><td class="col-right col-norm">${valNorm}</td><td class="col-right col-ecl">${valEcl}</td><td class="col-right col-crit">${valCrit}</td><td>${entry.mfRem}</td><td>${entry.isRem}</td>`;
        if (showBoat) html += `<td>${boatStr}</td>`;
        html += `<td>${ngStr}</td><td>${oocStr}</td><td>${boonStr}</td><td class="col-sp">${entry.sp}</td><td style="color:#ffb74d;">${entry.haste}</td><td>${entry.t36}</td><td>${entry.t38}</td><td class="col-mana">${entry.mana}</td>`;
        if (cfg.gear.binding) html += `<td>${entry.bBind}</td>`;
        if (cfg.gear.stag_5p) html += `<td style="color:#ffeb3b;">${entry.stag > 0 ? '+' + entry.stag + '%' : '-'}</td>`;
        if (cfg.gear.reos) html += `<td>${entry.bReos}</td>`;
        if (cfg.gear.toep) html += `<td>${entry.bToep}</td>`;
        if (cfg.gear.roop) html += `<td>${entry.bRoop}</td>`;
        if (cfg.gear.zhc) html += `<td>${entry.bZhc}</td>`;
        html += `<td class="col-left">${entry.info}</td></tr>`;
        tbody.innerHTML += html;
    }

    // Pagination-Controls hinzufügen
    renderLogPagination(logData.length);
}

function renderCombatChart(logData) {
    var logSection = document.getElementById("combatLogSection");
    if (!logSection) return;

    var container = document.getElementById("combatChartContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "combatChartContainer";
        
        var header = logSection.querySelector(".results-header");
        if (header && header.nextSibling) {
            logSection.insertBefore(container, header.nextSibling);
        } else {
            logSection.appendChild(container);
        }
    }
    
    // Höhe auf 260px erzwingen - Aus dem IF-Block herausgezogen, um HTML-Inline-Styles zu überschreiben
    container.style.cssText = "height: 260px; background: rgba(0,0,0,0.2); border: 1px dashed #444; border-radius: 8px; overflow-x: auto; overflow-y: hidden; margin-bottom: 20px; scrollbar-width: thin; position: relative;";
    
    container.innerHTML = "";
    
    if (!logData || logData.length === 0) {
        container.style.display = "none";
        return;
    }
    container.style.display = "block";

    var maxTime = logData[logData.length - 1].t || 1;
    var pixelsPerSecond = 25; 
    var timelineWidth = Math.max(container.clientWidth, maxTime * pixelsPerSecond);
    var chartOffsetX = 24; // NEU: Offset für die linke Icon-Leiste

    var innerContainer = document.createElement("div");
    innerContainer.style.position = "relative";
    innerContainer.style.width = (timelineWidth + chartOffsetX + 20) + "px"; // NEU: Breite um Offset + Puffer erweitert
    innerContainer.style.height = "100%";
    container.appendChild(innerContainer);

    var maxDmg = 0;
    var dmgEvents = [];
    
    var eclipseSegments = [];
    var currentEcl = "";
    var startEcl = 0;

    var mfSegments = [];
    var isMfActive = false;
    var startMf = 0;

    var isSegments = [];
    var isIsActive = false;
    var startIs = 0;
    
    var sfCasts = [];
    var wrCasts = [];
    var pendingCasts = {}; 

    var pendingMfStart = null; // Speichert den echten Cast-Start für MF
    var pendingIsStart = null; // Speichert den echten Cast-Start für IS

    // --- 1. DATEN SCHLEIFE ---
    logData.forEach(function(entry) {
        
        if (entry.evt === "CAST_START") {
            if (entry.spell.includes("Moonfire")) pendingMfStart = entry.t;
            if (entry.spell.includes("Insect")) pendingIsStart = entry.t;
        }

        // Vertikale Balken (Schaden & Initial-Casts)
        var dmg = parseFloat(entry.dmgNorm || 0) + parseFloat(entry.dmgEcl || 0) + parseFloat(entry.dmgCrit || 0);
        var resUp = entry.res ? entry.res.toUpperCase() : ""; // Groß/Kleinschreibung abfangen
        var isMiss = ["MISS", "RESIST", "IMMUNE", "DODGE", "PARRY"].includes(resUp);
        var isSpell = entry.spell && (entry.spell.includes("Starfire") || entry.spell.includes("Wrath") || entry.spell.includes("Moonfire") || entry.spell.includes("Insect") || entry.spell.includes("Idol of Acidity") || entry.spell.includes("Idol of Equil."));

        if (isSpell) {
            if (entry.evt === "CAST_START" || entry.evt === "CAST") {
                // Bei IS und MF geben wir dem Cast 1 Dmg, damit er als Balken sichtbar wird
                if (entry.spell.includes("Insect") || entry.spell.includes("Moonfire")) {
                    dmgEvents.push({ entry: entry, dmg: 1, isCastVisual: true });
                }
            } 
            
            // WICHTIG: Das 'else' wurde entfernt, damit Misses von Instant-Casts nicht verschluckt werden
            if (dmg > 0 || isMiss || entry.evt === "TICK" || entry.evt === "IMPACT") {
                if (dmg > maxDmg) maxDmg = dmg;
                dmgEvents.push({ entry: entry, dmg: dmg });
            }
        }

        // Eclipse Track
        var activeEcl = "";
        if (entry.ecl === "Nature" || entry.isNE) activeEcl = "Nature";
        if (entry.ecl === "Arcane" || entry.isAE) activeEcl = "Arcane";
        if (activeEcl !== currentEcl) {
            if (currentEcl !== "") eclipseSegments.push({ type: currentEcl, start: startEcl, end: entry.t });
            currentEcl = activeEcl;
            startEcl = entry.t;
        }

        // Moonfire DoT Track
        var mfNowActive = (entry.mfRem !== "-" && parseFloat(entry.mfRem) > 0);
        if (mfNowActive && !isMfActive) {
            isMfActive = true;
            startMf = pendingMfStart !== null ? pendingMfStart : entry.t;
        } else if (!mfNowActive && isMfActive) {
            isMfActive = false;
            mfSegments.push({ start: startMf, end: entry.t });
            pendingMfStart = null; // Reset
        }

        // Insect Swarm DoT Track
        var isNowActive = (entry.isRem !== "-" && parseFloat(entry.isRem) > 0);
        if (isNowActive && !isIsActive) {
            isIsActive = true;
            startIs = pendingIsStart !== null ? pendingIsStart : entry.t;
        } else if (!isNowActive && isIsActive) {
            isIsActive = false;
            isSegments.push({ start: startIs, end: entry.t });
            pendingIsStart = null; // Reset
        }
        
        // Casts Track (Wrath / Starfire)
        if (entry.evt === "CAST_START" && entry.castTime && entry.castTime !== "-") {
            var ct = parseFloat(entry.castTime);
            var startT = parseFloat(entry.t); // NEU: entry.t explizit in eine Zahl umwandeln
            
            if (!isNaN(ct) && ct > 0 && !isNaN(startT)) {
                var endT = startT + ct; // Jetzt wird mathematisch addiert (z.B. 3.00 + 1.50 = 4.50)
                if (entry.spell.includes("Starfire")) sfCasts.push({ start: startT, end: endT });
                if (entry.spell.includes("Wrath")) wrCasts.push({ start: startT, end: endT });
            }
        }
    });

    // Puffer berechnen & offene Segmente am Ende schließen
    if (maxDmg === 0) maxDmg = 1;
    maxDmg = maxDmg * 1.0; // Exakt 5% Puffer über dem höchsten Hit

    if (currentEcl !== "") eclipseSegments.push({ type: currentEcl, start: startEcl, end: maxTime });
    if (isMfActive) mfSegments.push({ start: startMf, end: maxTime });
    if (isIsActive) isSegments.push({ start: startIs, end: maxTime });

    // --- 2. TRACKS LAYOUT --- 
    // Reihenfolge wurde UMGEDREHT (SF ganz unten, Eclipse oben)
    var trackHeight = 12; 
    var trackGap = 2;
    
    var posSF = 8; 
    var posWr = posSF + trackHeight + trackGap;
    var posIs = posWr + trackHeight + trackGap;
    var posMf = posIs + trackHeight + trackGap;
    var posEcl = posMf + trackHeight + trackGap;

    function createTrack(bottomPos, segments, colorNature, colorArcane, iconName, labelText) {
        var track = document.createElement("div");
        track.style.position = "absolute";
        track.style.bottom = bottomPos + "px";
        track.style.left = "0";
        track.style.width = "100%";
        track.style.height = trackHeight + "px";
        track.style.backgroundColor = "rgba(255,255,255,0.03)";
        track.style.borderRadius = "2px";
        
        var label = document.createElement("div");
        label.style.position = "sticky";
        label.style.left = "2px";
        label.style.zIndex = "1";
        label.style.pointerEvents = "none";
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.height = "100%";
        
        if (iconName) {
            var iconImg = document.createElement("img");
            iconImg.src = "https://wow.zamimg.com/images/wow/icons/large/" + iconName + ".jpg";
            iconImg.style.width = trackHeight + "px";
            iconImg.style.height = trackHeight + "px";
            iconImg.style.borderRadius = "2px";
            iconImg.style.opacity = "0.9";
            label.appendChild(iconImg);
        } else {
            label.innerText = labelText;
            label.style.fontSize = "9px";
            label.style.color = "rgba(255,255,255,0.3)";
        }
        track.appendChild(label);
        innerContainer.appendChild(track);

        segments.forEach(function(seg) {
            var sVal = parseFloat(seg.start) || 0;
            var eVal = parseFloat(seg.end) || 0;
            var leftPct = (sVal / maxTime) * 100;
            var widthPct = ((eVal - sVal) / maxTime) * 100;
            
            var bar = document.createElement("div");
            bar.style.position = "absolute";
            bar.style.top = "0"; // NEU: Fixiert das Verrutschen um eine Zeile nach unten
            bar.style.left = "calc(" + leftPct + "% + " + chartOffsetX + "px)"; // NEU: Offset
            bar.style.width = widthPct + "%";
            bar.style.height = "100%";
            var bColor = (seg.type === "Nature" || colorNature === colorArcane) ? colorNature : colorArcane;
            bar.style.backgroundColor = bColor;
            bar.style.opacity = "0.7";
            bar.style.borderRadius = "2px";
            
            var tooltipText = labelText + (seg.type ? " (" + seg.type + ")" : "") + ": " + sVal.toFixed(2) + "s - " + eVal.toFixed(2) + "s";
            bar.title = tooltipText;
            track.appendChild(bar);
        });
    }

    // Zeichnen in aufsteigender Höhe
    createTrack(posSF, sfCasts, "var(--arcane-blue)", "var(--arcane-blue)", "spell_arcane_starfire", "SF Casts");
    createTrack(posWr, wrCasts, "var(--nature-green)", "var(--nature-green)", "spell_nature_abolishmagic", "Wrath Casts");
    createTrack(posIs, isSegments, "var(--nature-green)", "var(--nature-green)", "spell_nature_insectswarm", "IS Debuff");
    createTrack(posMf, mfSegments, "var(--arcane-blue)", "var(--arcane-blue)", "spell_nature_starfall", "MF Debuff");
    createTrack(posEcl, eclipseSegments, "var(--nature-green)", "var(--arcane-blue)", "spell_nature_naturesblessing", "Eclipse");

    // --- 3. VERTIKALE BALKEN (SCHADEN) ---
    var chartAreaBottom = posEcl + trackHeight + 10; 
    var chartAreaHeight = 140; // NEU: Feste Höhe. Schützt zu 100% vor Container- und Scrollbar-Überschneidungen
    
// --- NEU: DPS-Kurve (Gleitender Durchschnitt) ---
    var windowSize = 10;
    var dpsPoints = [];
    var maxRollingDps = 0;
    
    // Berechne die DPS in 0.5-Sekunden-Schritten
    for (var t = 0; t <= maxTime; t += 0.5) {
        var wStart = Math.max(0, t - windowSize / 2);
        var wEnd = Math.min(maxTime, t + windowSize / 2);
        var actualWindow = wEnd - wStart;
        if (actualWindow <= 0) actualWindow = 1;

        var dmgInWindow = 0;
        for (var i = 0; i < dmgEvents.length; i++) {
            var evTime = parseFloat(dmgEvents[i].entry.t);
            if (evTime >= wStart && evTime <= wEnd) {
                // Die visuellen 1-Dmg Initial-Casts aus der Berechnung ausschließen
                if (!dmgEvents[i].isCastVisual) {
                    dmgInWindow += dmgEvents[i].dmg;
                }
            }
        }
        var currentDps = dmgInWindow / actualWindow;
        if (currentDps > maxRollingDps) maxRollingDps = currentDps;
        dpsPoints.push({ t: t, dps: currentDps });
    }

    // Zeichne die Linie als SVG, wenn Schaden existiert
    if (maxRollingDps > 0) {
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");
        svg.style.position = "absolute";
        svg.style.left = "0px";
        svg.style.bottom = chartAreaBottom + "px";
        svg.style.width = (timelineWidth + chartOffsetX + 20) + "px";
        svg.style.height = chartAreaHeight + "px";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "5"; // Hinter die Event-Balken, aber über dem Hintergrund

        var polyline = document.createElementNS(svgNS, "polyline");
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "rgba(255, 255, 255, 0.4)"); // Transparentes Weiß
        polyline.setAttribute("stroke-width", "2");
        
        var pointsStr = "";
        dpsPoints.forEach(function(pt) {
            var x = (pt.t / maxTime) * timelineWidth + chartOffsetX;
            var pct = pt.dps / maxRollingDps;
            // 10% Puffer nach oben, damit die Linie nicht am Rand klebt
            var y = chartAreaHeight - (pct * (chartAreaHeight * 0.9)); 
            pointsStr += x + "," + y + " ";
        });
        
        polyline.setAttribute("points", pointsStr.trim());
        svg.appendChild(polyline);
        innerContainer.appendChild(svg);
        
        // Diskretes Label oben links für den Peak-DPS-Wert der Kurve
        var maxLabel = document.createElement("div");
        maxLabel.style.position = "absolute";
        maxLabel.style.left = "4px";
        maxLabel.style.bottom = (chartAreaBottom + chartAreaHeight - 14) + "px";
        maxLabel.style.fontSize = "9px";
        maxLabel.style.color = "rgba(255, 255, 255, 0.4)";
        maxLabel.innerText = "Peak: " + Math.floor(maxRollingDps) + " DPS";
        innerContainer.appendChild(maxLabel);
    }
    // --- ENDE DPS-Kurve ---

    function getIconForSpell(entry) {
        var spellName = entry.spell;
        var cleanName = spellName.replace(" (Tick)", "").replace(" (Hit)", "").replace(/\s+/g, "");
        if (cleanName === "InsectSwarm") cleanName = "InsectSwarm"; 
        
        if (typeof ROTATION_SKILLS !== 'undefined') {
            var skillDef = ROTATION_SKILLS.find(s => s.id === cleanName);
            if (skillDef && skillDef.icon) return skillDef.icon;
        }
        if (spellName.includes("Starfire")) return "spell_arcane_starfire";
        if (spellName.includes("Wrath")) return "spell_nature_abolishmagic";
        if (spellName.includes("Moonfire")) return "spell_nature_starfall";
        if (spellName.includes("Insect")) return "spell_nature_insectswarm";
        
        // NEU: Icons für die Idols
        if (spellName.includes("Acidity")) return "spell_nature_acid_01";
        if (spellName.includes("Equil.")) {
            if (entry.res && entry.res.includes("MF")) return "spell_nature_starfall";
            return "spell_nature_insectswarm";
        }
        return "inv_misc_questionmark";
    }

    dmgEvents.forEach(function(ev) {
        var entry = ev.entry;
        var leftPos = (entry.t / maxTime) * 100; 
        
        var pct = (ev.dmg / maxDmg) * 100;
        if (pct < 4) pct = 4; 
        if (ev.dmg <= 1) pct = 6; // Feste Mindesthöhe für 0-Dmg / 1-Dmg Initial-Casts

        var barColor = "#888"; 
        if (entry.spell.includes("Starfire") || entry.spell.includes("Moonfire")) barColor = "var(--arcane-blue)";
        if (entry.spell.includes("Wrath") || entry.spell.includes("Insect") || entry.spell.includes("Acidity")) barColor = "var(--nature-green)";
        if (entry.spell.includes("Equil.")) {
            if (entry.res && entry.res.includes("MF")) barColor = "var(--arcane-blue)";
            else barColor = "var(--nature-green)";
        }
        
        var resUp2 = entry.res ? entry.res.toUpperCase() : "";
        var isMissEvent = ["MISS", "RESIST", "IMMUNE", "DODGE", "PARRY"].includes(resUp2);
        
        if (isMissEvent) {
            barColor = "#f44336"; 
            // Misses mit z.B. 15% Höhe versehen, damit sie sich von den 6%-Dummy-Casts klar abheben
            if (ev.dmg <= 1 && !ev.isCastVisual) pct = 15; 
        }

        var isCrit = entry.dmgCrit > 0;
        var iconName = getIconForSpell(entry);

       var wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        wrapper.style.left = "calc(" + leftPos + "% + " + chartOffsetX + "px)";
        wrapper.style.bottom = chartAreaBottom + "px";
        wrapper.style.transform = "translateX(-50%)"; 
        // NEU: Flexbox entfernt, um Browser-Bugs mit Prozent-Höhen zu vermeiden
        wrapper.style.height = chartAreaHeight + "px";
        wrapper.style.width = "20px";
        wrapper.style.zIndex = "10";
        wrapper.style.cursor = "crosshair";
        
        var tooltip = "Time: " + entry.t + "s\n";
        tooltip += "Spell: " + entry.spell + "\n";
        tooltip += "Event: " + entry.evt + "\n";
        if (ev.dmg > 1) { // Alles über unserem 1-Dmg Dummy
            tooltip += "Damage: " + Math.floor(ev.dmg) + (isCrit ? " (CRITICAL)" : "") + "\n";
        } else {
            tooltip += "Damage: 0\n";
        }
        if (entry.res) tooltip += "Result: " + entry.res;
        wrapper.title = tooltip;

        var barArea = document.createElement("div");
        barArea.style.position = "relative"; // NEU: Zwingend für die absolute Positionierung des Balkens
        barArea.style.height = (chartAreaHeight - 20) + "px"; // NEU: Exakte Pixel-Höhe erzwingen
        barArea.style.width = "100%";

        var bar = document.createElement("div");
        bar.style.position = "absolute"; // NEU: Absolut am Boden der barArea verankert
        bar.style.bottom = "0"; 
        bar.style.left = "5px"; // (20px width / 2) - (10px bar / 2) = 5px
        bar.style.width = "10px"; 
        bar.style.height = pct + "%"; // Bezieht sich nun streng auf die Pixel-Höhe der barArea!
        bar.style.backgroundColor = barColor;
        bar.style.borderRadius = "3px 3px 0 0";
        bar.style.opacity = "0.85";
        bar.style.boxSizing = "border-box";
        
        if (isCrit) {
            bar.style.boxShadow = "0 0 5px #ffeb3b";
            bar.style.border = "1px solid #ffca28";
            bar.style.borderBottom = "none";
            bar.style.opacity = "1";
        }

        var resUp2 = entry.res ? entry.res.toUpperCase() : "";
        var isMissEvent = ["MISS", "RESIST", "IMMUNE", "DODGE", "PARRY"].includes(resUp2);
        
        // Zeige den initialen Cast von IS/MF transparent an
        if (ev.isCastVisual || (ev.dmg <= 1 && !isMissEvent && (entry.evt === "CAST_START" || entry.evt === "CAST"))) {
            bar.style.backgroundColor = "transparent";
            bar.style.border = "1px dashed " + barColor;
            bar.style.zIndex = "1"; 
        } else if (isMissEvent) {
            bar.style.zIndex = "5"; 
            bar.style.opacity = "1";
        }

        var iconArea = document.createElement("div");
        iconArea.style.height = "16px";
        iconArea.style.marginTop = "4px";
        iconArea.style.display = "flex"; // NEU: Zentriert das Icon sauber unter dem Balken
        iconArea.style.justifyContent = "center";
        
        var iconImg = document.createElement("img");
        iconImg.src = "https://wow.zamimg.com/images/wow/icons/large/" + iconName + ".jpg";
        iconImg.style.width = "14px";
        iconImg.style.height = "14px";
        iconImg.style.borderRadius = "3px";
        iconImg.style.border = "1px solid #333";

        barArea.appendChild(bar);
        iconArea.appendChild(iconImg);
        wrapper.appendChild(barArea);
        wrapper.appendChild(iconArea);
        
        wrapper.onmouseenter = function() { 
            bar.style.filter = "brightness(1.5)"; 
            wrapper.style.zIndex = "20"; 
        };
        wrapper.onmouseleave = function() { 
            bar.style.filter = "none"; 
            wrapper.style.zIndex = "10"; 
        };

        innerContainer.appendChild(wrapper);
    });
}

function renderLogPagination(totalEntries) {
    var container = document.getElementById("combatLogSection");
    // Prüfen ob Paginierungs-Element bereits existiert, sonst erstellen
    var nav = document.getElementById("logPaginationNav");
    if (!nav) {
        nav = document.createElement("div");
        nav.id = "logPaginationNav";
        nav.style.cssText = "display:flex; justify-content:center; align-items:center; gap:15px; margin: 15px 0; font-size:0.9rem;";
        // Vor dem Log-Container einfügen
        var logCont = document.querySelector(".log-container");
        container.insertBefore(nav, logCont);
    }

    var totalPages = Math.ceil(totalEntries / LOG_ENTRIES_PER_PAGE);

    nav.innerHTML = `
        <button class="btn-mini" onclick="changeLogPage(-1)" ${CURRENT_LOG_PAGE === 0 ? 'disabled' : ''}>&lt; Prev</button>
        <span style="color:var(--text-muted)">Page <strong>${CURRENT_LOG_PAGE + 1}</strong> of ${totalPages} (${totalEntries} entries)</span>
        <button class="btn-mini" onclick="changeLogPage(1)" ${CURRENT_LOG_PAGE >= totalPages - 1 ? 'disabled' : ''}>Next &gt;</button>
    `;
}

function changeLogPage(delta) {
    CURRENT_LOG_PAGE += delta;
    // Da wir das logData-Array nicht global haben, nutzen wir die aktuelle View-Daten
    if (SIM_DATA && CURRENT_VIEW && SIM_DATA[CURRENT_VIEW]) {
        renderCombatLog(SIM_DATA[CURRENT_VIEW].log);
    }
}


// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

function updateEnemyInfo() {
    if (!document.getElementById("info_hit_chance")) return;
    var lvl = getVal("enemy_level");
    var resNat = getVal("res_nature");
    var pen = getVal("sp_pen");
    var baseHit = 96; var needHit = 4;
    if (lvl == 61) { baseHit = 95; needHit = 5; }
    if (lvl == 62) { baseHit = 94; needHit = 6; }
    if (lvl == 63) { baseHit = 83; needHit = 16; }
    setText("info_hit_chance", baseHit + "% (Needs " + needHit + "%)");
    var baseRes = (lvl - 60) * 5; if (baseRes < 0) baseRes = 0;
    setText("info_base_res", baseRes);
    var totalRes = Math.max(0, baseRes + resNat - pen);
    var bTxt = document.getElementById("info_buckets_text");
    if (bTxt) bTxt.innerText = "Resistance: " + totalRes;

    var avgMit = Math.min(0.75, (totalRes / (lvl * 5)) * 0.75);
    var range = avgMit / 0.25;
    var bucket = Math.floor(range);
    var remainder = range - bucket;
    var probs = [0, 0, 0, 0];
    if (bucket < 3) { probs[bucket] = (1 - remainder) * 100; probs[bucket + 1] = remainder * 100; } else { probs[3] = 100; }
    var bar = document.getElementById("bucket_bar_nat");
    if (bar) {
        var barHtml = "";
        if (probs[0] > 0) barHtml += '<div class="bucket-seg seg-0" style="width:' + probs[0] + '%"></div>';
        if (probs[1] > 0) barHtml += '<div class="bucket-seg seg-25" style="width:' + probs[1] + '%"></div>';
        if (probs[2] > 0) barHtml += '<div class="bucket-seg seg-50" style="width:' + probs[2] + '%"></div>';
        if (probs[3] > 0) barHtml += '<div class="bucket-seg seg-75" style="width:' + probs[3] + '%"></div>';
        bar.innerHTML = barHtml;
    }
}




function updateSpellStats() {
    if (!document.getElementById("statHit")) return;
    var cfg = getInputs();
    var tbody = document.getElementById("spellCalcBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    function calcRow(name, base, coeff, sp, baseMod, eclMod, castTime, type) {
        var raw = base + (coeff * sp);
        var cosMult = 1.0;
        if (type === "Arcane") cosMult = 1 + 0.1 * cfg.enemy.cos;
        var scaledNoEcl = raw * (1 + baseMod) * cosMult;
        var scaledEcl = raw * (1 + baseMod + eclMod) * cosMult;
        var cTimeBase = castTime;
        if (name === "Starfire" && cfg.gear.idolEoF) cTimeBase -= 0.2;
        // Nutzt den neuen hasteFactor. Fallback auf 1.0, falls noch nicht geladen.
        var ct = Math.max(0, cTimeBase / (cfg.stats.hasteFactor || 1.0));
        return '<tr><td>' + name + '</td><td>' + base.toFixed(0) + '</td><td class="val-calc">' + Math.floor(scaledNoEcl) + '</td><td>+' + (eclMod * 100).toFixed(0) + '%</td><td class="val-calc">' + Math.floor(scaledEcl) + '</td><td>' + ct.toFixed(2) + 's</td></tr>';
    }
    var eclFactor = (10 + 60 * (cfg.stats.crit / 100)) / 100; // Int correction applied via input logic, here it takes the final stat
    var w_coeff = 0.62; //(2.0 / 3.5) * 1.05;
    tbody.innerHTML += calcRow("Wrath", 310, w_coeff, (cfg.power.sp + cfg.power.nat), 0.10, eclFactor, 1.5, "Nature");
    tbody.innerHTML += calcRow("Starfire", 540, 1.0, (cfg.power.sp + cfg.power.arc), 0.10, eclFactor, 3.0, "Arcane");
    var mf_coeff = 0.14; var mf_hit_mod = 0.20;
    if (cfg.gear.idolMoon) mf_hit_mod += 0.17;
    tbody.innerHTML += calcRow("Moonfire (Hit)", 210, mf_coeff, (cfg.power.sp + cfg.power.arc), mf_hit_mod, eclFactor, 0, "Arcane");
    var mf_t_coeff = 0.13; var mf_tick_mod = 0.35;
    if (cfg.gear.idolMoon) mf_tick_mod += 0.17;
    tbody.innerHTML += calcRow("Moonfire (Tick)", 95.6, mf_t_coeff, (cfg.power.sp + cfg.power.arc), mf_tick_mod, eclFactor, 0, "Arcane");
    var is_coeff = ((18 / 15) * 0.95 * 1.25) / 9; var is_mod = 0.25;
    if (cfg.gear.idolProp) is_mod += 0.17;
    tbody.innerHTML += calcRow("Insect Swarm (Tick)", 53.35, is_coeff, (cfg.power.sp + cfg.power.nat), is_mod, eclFactor, 0, "Nature");

    // --- Hurricane Berechnung ---
    var hurr_base = 134;
    var hurr_coeff = 0.096;
    var hurr_sp = cfg.power.sp + cfg.power.nat;
    var hurr_raw = hurr_base + (hurr_coeff * hurr_sp);
    var hurr_moonfury = 0.12;
    var hurr_genesis = 0.15;
    var eclipseModification = 1 + eclFactor; // (1 + Eclipse-Bonus) analog zur bestehenden Engine-Mathematik

    // Normaler Hurricane
    var hurr_scaledNoEcl = hurr_raw * (1 + hurr_moonfury + hurr_genesis);
    var hurr_scaledEcl = hurr_scaledNoEcl * eclipseModification;
    
    tbody.innerHTML += '<tr><td>Hurricane (Tick)</td><td>' + hurr_base.toFixed(0) + '</td><td class="val-calc">' + Math.floor(hurr_scaledNoEcl) + '</td><td>+' + (eclFactor * 100).toFixed(0) + '%</td><td class="val-calc">' + Math.floor(hurr_scaledEcl) + '</td><td>0.00s</td></tr>';

    // T3.5 Hurricane Zusatzschaden
    if (cfg.gear.t35_3p) {
        var hurr_t35_scaledNoEcl = hurr_raw / 2;
        var hurr_t35_scaledEcl = (hurr_raw * eclipseModification) / 2;
        
        tbody.innerHTML += '<tr><td>Hurricane T3.5 (Tick)</td><td>' + (hurr_base / 2).toFixed(0) + '</td><td class="val-calc">' + Math.floor(hurr_t35_scaledNoEcl) + '</td><td>+' + (eclFactor * 100).toFixed(0) + '%</td><td class="val-calc">' + Math.floor(hurr_t35_scaledEcl) + '</td><td>0.00s</td></tr>';
    }

    // AoE Chart immer direkt neu zeichnen, wenn Stats/Boni sich ändern
    /*if (typeof renderAoEChart === 'function') {
        renderAoEChart();
    }*/
    
}

// ============================================================================
// NEW: CSV EXPORT
// ============================================================================

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

// ============================================================================
// ARMORY IMPORT LOGIC (HTML PARSING)
// ============================================================================

function openArmoryModal() {
    var m = document.getElementById("armoryImportModal");
    if (m) m.classList.remove("hidden");
    document.getElementById("armoryName").focus();
}

function closeArmoryModal() {
    var m = document.getElementById("armoryImportModal");
    if (m) m.classList.add("hidden");
    setText("armoryStatus", "");
}

async function runArmoryImport() {
    var name = document.getElementById("armoryName").value.trim();
    var realm = document.getElementById("armoryRealm").value;
    var status = document.getElementById("armoryStatus");

    if (!name) {
        status.innerText = "Please enter a character name.";
        status.style.color = "#f44336";
        return;
    }

    status.innerText = "Fetching HTML ...";
    status.style.color = "#aaa";

    var targetUrl = `https://turtlecraft.gg/armory/${realm}/${name}`;
    
    // HIER DEINE WORKER URL EINTRAGEN:
    var workerUrl = `https://turtle-armory.johnrdoe89.workers.dev/?url=`; 
    var finalUrl = workerUrl + encodeURIComponent(targetUrl);

    try {
        var response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error("Network Error or Character not found (Status " + response.status + ")");
        }

        var htmlText = await response.text();
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlText, 'text/html');

        // Rasse aus dem HTML/JSON extrahieren
        var raceString = "Tauren";
        var raceMatch = htmlText.match(/&quot;race&quot;:(\d+)/) || htmlText.match(/"race":(\d+)/);
        if (raceMatch) {
            var rId = parseInt(raceMatch[1]);
            if (rId === 4) raceString = "NightElf";
            if (rId === 6) raceString = "Tauren";
        }

        // Extract Data
        var uniqueFoundItems = extractItemsFromHtml(doc);
        if (uniqueFoundItems.length === 0) {
            throw new Error("No items found on page. Character might be naked or parsing failed.");
        }

        // Apply Data & Get Match Statistics
        var results = applyImportData(uniqueFoundItems, raceString, name);
        var msg = "Armory Scan: Found " + uniqueFoundItems.length + " unique Item-IDs.<br>";

        if (results.matched > 0) {
            msg += "<span style='color:#4caf50'>Successfully imported " + results.matched + " items.</span>";
        } else {
            msg += "<span style='color:#f44336'>No items matched your local DB.</span>";
        }

        if (results.matched < uniqueFoundItems.length) {
            msg += "<br><span style='font-size:0.8em; color:#888;'>(" + (uniqueFoundItems.length - results.matched) + " items skipped - not in local DB)</span>";
        }

        status.innerHTML = msg;
        if (results.matched > 0) {
            setTimeout(closeArmoryModal, 3000);
        }

    } catch (e) {
        console.error(e);
        status.innerText = "Error: " + e.message;
        status.style.color = "#f44336";
    }
}
/*
async function runArmoryImport() {
    var name = document.getElementById("armoryName").value.trim();
    var realm = document.getElementById("armoryRealm").value;
    var status = document.getElementById("armoryStatus");

    if (!name) {
        status.innerText = "Please enter a character name.";
        status.style.color = "#f44336";
        return;
    }

    status.innerText = "Fetching HTML from turtlecraft.gg...";
    status.style.color = "#aaa";

    var targetUrl = `https://turtlecraft.gg/armory/${realm}/${name}`;
    //var proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(targetUrl);
    //var proxyUrl = `https://api.codetabs.com/v1/proxy?quest=` + encodeURIComponent(targetUrl);
    var proxyUrl = `https://api.allorigins.win/raw?url=` + encodeURIComponent(targetUrl);
    
    //var proxyUrl = targetUrl; // CORS Proxy disabled for demo purposes

    try {
        var response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error("Network Error or Character not found (Status " + response.status + ")");
        }

        var htmlText = await response.text();
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlText, 'text/html');

        // NEU: Rasse aus dem HTML/JSON extrahieren
        var raceString = "Tauren"; // Fallback
        var raceMatch = htmlText.match(/&quot;race&quot;:(\d+)/) || htmlText.match(/"race":(\d+)/);
        if (raceMatch) {
            var rId = parseInt(raceMatch[1]);
            if (rId === 4) raceString = "NightElf";
            if (rId === 6) raceString = "Tauren";
        }

        // Extract Data
        var uniqueFoundItems = extractItemsFromHtml(doc);

        if (uniqueFoundItems.length === 0) {
            throw new Error("No items found on page. Character might be naked or parsing failed.");
        }

        // Apply Data & Get Match Statistics
        var results = applyImportData(uniqueFoundItems, raceString, name);

        // Feedback Message
        var msg = "Armory Scan: Found " + uniqueFoundItems.length + " unique Item-IDs.<br>";
        if (results.matched > 0) {
            msg += "<span style='color:#4caf50'>Successfully imported " + results.matched + " items.</span>";
        } else {
            msg += "<span style='color:#f44336'>No items matched your local DB.</span>";
        }

        // Hint about missing items
        if (results.matched < uniqueFoundItems.length) {
            msg += "<br><span style='font-size:0.8em; color:#888;'>(" + (uniqueFoundItems.length - results.matched) + " items skipped - not in local DB)</span>";
        }

        status.innerHTML = msg;

        // Close modal only if successful match occurred
        if (results.matched > 0) {
            setTimeout(closeArmoryModal, 3000);
        }

    } catch (e) {
        console.error(e);
        status.innerText = "Error: " + e.message;
        status.style.color = "#f44336";
    }
}
*/

/**
 * Scans HTML for item links and returns a UNIQUE list of objects.
 
function extractItemsFromHtml(doc) {
    var foundMap = new Map(); // Use Map to deduplicate by ItemID immediately

    var links = doc.querySelectorAll('a[href*="item="]');
    links.forEach(function (a) {
        var href = a.getAttribute('href');
        var itemMatch = href.match(/item=(\d+)/);

        if (itemMatch) {
            var iId = parseInt(itemMatch[1]);
            // Only add if not already present 
            if (!foundMap.has(iId)) {
                foundMap.set(iId, {
                    itemId: iId,

                });
            }
        }
    });

    return Array.from(foundMap.values());
}
*/

/**
 * Scans HTML for item links and returns a UNIQUE list of objects.
 */
function extractItemsFromHtml(doc) {
    var foundMap = new Map(); // Use Map to deduplicate by ItemID immediately

    // 1. Vorhandene Logik: Items aus den Links auslesen
    var links = doc.querySelectorAll('a[href*="item="]');
    links.forEach(function (a) {
        var href = a.getAttribute('href');
        var itemMatch = href.match(/item=(\d+)/);

        if (itemMatch) {
            var iId = parseInt(itemMatch[1]);
            // Only add if not already present 
            if (!foundMap.has(iId)) {
                foundMap.set(iId, {
                    itemId: iId
                });
            }
        }
    });

    // 2. NEU: Quelltext nach dem versteckten JSON (itemEntry & enchantments) durchsuchen
    var htmlString = doc.documentElement.innerHTML;
    // Regex sucht nach &quot;itemEntry&quot;:ID ... &quot;enchantments&quot;:EFFECT_ID
    var regex = /&quot;itemEntry&quot;:(\d+)[^}]*?&quot;enchantments&quot;:(\d+)/g;
    var match;

    while ((match = regex.exec(htmlString)) !== null) {
        var iId = parseInt(match[1]);
        var eId = parseInt(match[2]);

        // Trage die effectId bei dem Item ein (oder lege es neu an, falls der Link es verpasst hat)
        if (foundMap.has(iId)) {
            foundMap.get(iId).effectId = eId;
        } else {
            foundMap.set(iId, { itemId: iId, effectId: eId });
        }
    }

    return Array.from(foundMap.values());
}

/*
function applyImportData(importedItems, race, charName) {
    var matchCount = 0;


    // 2. Clear current gear
    GEAR_SELECTION = {};

    // 3. Map Items
    importedItems.forEach(function (entry) {
        var dbItem = ITEM_ID_MAP[entry.itemId];

        // Skip if not in DB
        if (!dbItem) {
            return;
        }

        var slotToAssign = null;
        var slotKey = dbItem.slot; // e.g. "Head", "Two-Hand", "Trinket"

        // Handle Multi-Slots & Mapping Logic
        if (slotKey === "Finger" || slotKey === "Ring") {
            if (!GEAR_SELECTION["Finger 1"]) slotToAssign = "Finger 1";
            else slotToAssign = "Finger 2";
        }
        else if (slotKey === "Trinket") {
            if (!GEAR_SELECTION["Trinket 1"]) slotToAssign = "Trinket 1";
            else slotToAssign = "Trinket 2";
        }
        // FIXED: Added "Two-Hand" and "Mainhand" for Staves/Maces/Polearms
        else if (slotKey === "Two-hand" || slotKey === "One-hand") {
            slotToAssign = "Main Hand";
        }
        else if (slotKey === "Held In Off-Hand") {
            slotToAssign = "Off Hand";
        }
        else {
            // Direct Match (Head, Chest, Hands, etc.)
            slotToAssign = slotKey;
        }

        if (slotToAssign) {
            GEAR_SELECTION[slotToAssign] = entry.itemId;
            matchCount++;
        }
    });

    // 4. Update UI
    initGearPlannerUI();
    saveCurrentState();
    showToast("Imported data for " + charName);

    return { matched: matchCount };
}
*/

function applyImportData(importedItems, race, charName) {
    var matchCount = 0;

    // 1. NEU: Rasse im UI setzen, falls erkannt
    if (race) {
        var raceSel = document.getElementById('char_race');
        if (raceSel) {
            raceSel.value = race;
        }
    }

    // 2. Clear current gear
    GEAR_SELECTION = {};
    ENCHANT_SELECTION = {}; // NEU: Auch die Enchants zurücksetzen

    // 3. Map Items
    importedItems.forEach(function (entry) {
        var dbItem = ITEM_ID_MAP[entry.itemId];

        // Skip if not in DB
        if (!dbItem) {
            return;
        }

        var slotToAssign = null;
        var slotKey = dbItem.slot; // e.g. "Head", "Two-Hand", "Trinket"

        // Handle Multi-Slots & Mapping Logic
        if (slotKey === "Finger" || slotKey === "Ring") {
            if (!GEAR_SELECTION["Finger 1"]) slotToAssign = "Finger 1";
            else slotToAssign = "Finger 2";
        }
        else if (slotKey === "Trinket") {
            if (!GEAR_SELECTION["Trinket 1"]) slotToAssign = "Trinket 1";
            else slotToAssign = "Trinket 2";
        }
        // FIXED: Added "Two-Hand" and "Mainhand" for Staves/Maces/Polearms
        else if (slotKey === "Two-hand" || slotKey === "One-hand") {
            slotToAssign = "Main Hand";
        }
        else if (slotKey === "Held In Off-Hand") {
            slotToAssign = "Off Hand";
        }
        else if (slotKey === "Relic") {
            slotToAssign = "Idol";
        }
        else {
            // Direct Match (Head, Chest, Hands, etc.)
            slotToAssign = slotKey;
        }

        if (slotToAssign) {
            GEAR_SELECTION[slotToAssign] = entry.itemId;
            matchCount++;

            // NEU: Enchantment zuweisen, falls eine effectId gefunden wurde
            if (entry.effectId && entry.effectId !== 0) {
                var enchant = ENCHANT_DB.find(function (e) { return e.effectId === entry.effectId; });
                if (enchant) {
                    ENCHANT_SELECTION[slotToAssign] = enchant.id;
                }
            }
        }
    });

    // 4. Update UI
    initGearPlannerUI();
    saveCurrentState();
    showToast("Imported data for " + charName);

    return { matched: matchCount };
}

function updatePatchUI() {
    // 1. Disable BoaT Stacks Input for 1.18.1c (Passiv)
    var boatInput = document.getElementById('start_boat');
    if (boatInput) {
        boatInput.disabled = true;
        boatInput.parentElement.style.opacity = "0.5";
        boatInput.value = 0; // Reset visual value
    }

    // 2. Enable External DoTs
    var extIds = ["enemy_ext_mf", "enemy_ext_is"];
    extIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.disabled = false;
            if (el.parentElement) el.parentElement.style.opacity = "1";
        }
    });

    // 3. Ensure Single Idol Selection
    var idolIds = ["idolEoF", "idolMoon", "idolProp", "idolMoonfang","idolAcidity", "idolEquilibrium","idolEquilibriumV2","idolEquilibriumV3"];
    var found = false;
    idolIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.checked) {
            if (found) el.checked = false; // Deselect others if one is already found
            found = true;
        }
    });

    // 4. Update Eclipse Default Values visually if override is disabled
    var elEclOver = document.getElementById('stat_override_eclipse');
    var elNat = document.getElementById('stat_proc_nature');
    var elArc = document.getElementById('stat_proc_arcane');
    if (elEclOver && !elEclOver.checked && elNat && elArc) {
        elNat.value = 60;
        elArc.value = 40;
    }
}

/**
 * Zeichnet die DPS-Verteilung als Histogramm (Glockenkurve)
 */
function renderDPSDistribution(data) {
    var chart = document.getElementById('dpsChart');
    if (!chart || !data || !data.dpsDistribution) return;

    chart.innerHTML = "";
    var dpsValues = data.dpsDistribution;

    // 1. Verwende globale statt lokaler Min/Max Werte für die Skalierung
    var min = GLOBAL_DPS_MIN;
    var max = GLOBAL_DPS_MAX;
    var range = max - min;

    // Beschriftungen zeigen weiterhin lokale Werte der aktuellen Sim
    setText("distMinLabel", Math.floor(min) + " DPS");
    setText("distMaxLabel", Math.floor(max) + " DPS");

    // 2. Buckets erstellen
    var bucketCount = 60;
    var buckets = new Array(bucketCount).fill(0);
    var step = (range > 0) ? (range / bucketCount) : 1;

    dpsValues.forEach(function (val) {
        var idx = Math.floor((val - min) / step);
        if (idx >= bucketCount) idx = bucketCount - 1;
        if (idx < 0) idx = 0;
        buckets[idx]++;
    });

    var maxBucket = Math.max(...buckets);
    var medianDps = data.median.dps;
    var p5DpsVal = data.p5.dps; // NEU
    var p95DpsVal = data.p95.dps; // NEU

    // 3. Balken rendern
    buckets.forEach(function (count, i) {
        var heightPct = (maxBucket > 0) ? (count / maxBucket) * 100 : 0;
        var bar = document.createElement('div');
        bar.className = 'dist-bar';
        bar.style.height = heightPct + "%";

        var bucketStart = min + (i * step);
        var bucketEnd = bucketStart + step;

        // Highlight für Durchschnitt
        if (medianDps >= bucketStart && medianDps <= bucketEnd) {
            bar.classList.add('highlight');
        }
        // NEU: Highlight für Min (Blau)
        if (p5DpsVal >= bucketStart && p5DpsVal <= bucketEnd) {
            bar.classList.add('highlight-min');
        }
        // NEU: Highlight für Max (Grün)
        if (p95DpsVal >= bucketStart && p95DpsVal <= bucketEnd) {
            bar.classList.add('highlight-max');
        }

        chart.appendChild(bar);
    });

    // Stabilitäts-Label Update (bleibt gleich...)
    if (data.varianceCV !== undefined) {
        var cv = data.varianceCV;
        var rating = "";
        var color = "";
        if (cv < 7) { rating = "Stable"; color = "#4caf50"; }
        else if (cv < 12) { rating = "Moderate"; color = "#ffb74d"; }
        else { rating = "Volatile"; color = "#f44336"; }
        var vLabel = document.getElementById("out_variance");
        // Änderung: Label auf "CV" (Coefficient of Variation) gesetzt
        if (vLabel) vLabel.innerHTML = `CV: <span style="color:${color}">${cv.toFixed(1)}% (${rating})</span>`;
    }
}

// NEU: Berechnet den globalen DPS-Bereich über alle Simulationen für einheitliche Charts
function updateGlobalDpsRange() {
    var min = Infinity;
    var max = -Infinity;
    var found = false;

    SIM_LIST.forEach(function (sim) {
        if (sim.results && sim.results.dpsDistribution) {
            found = true;
            sim.results.dpsDistribution.forEach(function (val) {
                if (val < min) min = val;
                if (val > max) max = val;
            });
        }
    });

    if (!found) {
        GLOBAL_DPS_MIN = 0;
        GLOBAL_DPS_MAX = 2000; // Fallback
    } else {
        // Kleiner Puffer von 5%, damit die Balken nicht am Rand kleben
        var padding = (max - min) * 0.05;
        GLOBAL_DPS_MIN = Math.max(0, min - padding);
        GLOBAL_DPS_MAX = max + padding;
    }
}

// ============================================================================
// ROTATION BUILDER LOGIC (DRAG & DROP & INLINE EDITING)
// ============================================================================
var draggedSkillId = null;
var draggedStepIndex = null;

function initRotationBuilder() {
    try {
        console.log("Starte Rotation Builder...");
        populatePresetDropdown();
        renderRotationToolbox();
        renderRotationList();

        var dropzone = document.getElementById("rbDropzone");
        if (dropzone) {
            dropzone.addEventListener("dragover", function(e) {
                e.preventDefault();
                dropzone.classList.add("drag-over");
            });
            dropzone.addEventListener("dragleave", function(e) {
                dropzone.classList.remove("drag-over");
            });
            dropzone.addEventListener("drop", function(e) {
                e.preventDefault();
                dropzone.classList.remove("drag-over");
                
                if (draggedSkillId) {
                    addRotationStep(draggedSkillId);
                } else if (draggedStepIndex !== null) {
                    var steps = CUSTOM_ROTATION.steps || [];
                    moveRotationStep(draggedStepIndex, steps.length);
                }
                draggedSkillId = null;
                draggedStepIndex = null;
            });
        }
        console.log("Rotation Builder erfolgreich geladen!");
    } catch (e) {
        console.error("Fehler im Rotation Builder:", e);
        showToast("UI Fehler: " + e.message);
    }
}

function updateRotationMeta(field, val) {
    if (!CUSTOM_ROTATION) CUSTOM_ROTATION = { name: "", desc: "", steps: [] };
    CUSTOM_ROTATION[field] = val;
    saveCurrentState();
}

function renderRotationToolbox() {
    var tb = document.getElementById("rbSkillsList");
    if (!tb) return;
    tb.innerHTML = "";
    
    ROTATION_SKILLS.forEach(skill => {
        var el = document.createElement("div");
        el.className = "rb-skill";
        el.draggable = true;
        el.innerHTML = `<img src="https://wow.zamimg.com/images/wow/icons/large/${skill.icon}.jpg" class="rb-skill-icon" alt=""> ${skill.name}`;
        
        el.addEventListener("dragstart", function(e) {
            draggedSkillId = skill.id;
            draggedStepIndex = null;
        });
        tb.appendChild(el);
    });
}

function renderRotationList() {
    var dz = document.getElementById("rbDropzone");
    var empty = document.getElementById("rbEmptyState");
    if (!dz) return;
    
    // Update Meta UI Fields
    var nInput = document.getElementById("rb_meta_name");
    var dInput = document.getElementById("rb_meta_desc");
    if (nInput) nInput.value = CUSTOM_ROTATION.name || "";
    if (dInput) dInput.value = CUSTOM_ROTATION.desc || "";

    document.querySelectorAll(".rb-step").forEach(el => el.remove());

    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";

    CUSTOM_ROTATION.steps.forEach((step, idx) => {
        var skillDef = ROTATION_SKILLS.find(s => s.id === step.skill) || { name: step.skill, icon: "inv_misc_questionmark" };
        
        var stepEl = document.createElement("div");
        stepEl.className = "rb-step";
        if (step.disabled) stepEl.classList.add("is-disabled");
        stepEl.draggable = true;
        
        stepEl.addEventListener("dragstart", function(e) {
            draggedStepIndex = idx;
            draggedSkillId = null;
            e.stopPropagation();
        });
        stepEl.addEventListener("dragover", function(e) {
            e.preventDefault();
            stepEl.classList.add("drag-over");
        });
        stepEl.addEventListener("dragleave", function(e) {
            stepEl.classList.remove("drag-over");
        });
        stepEl.addEventListener("drop", function(e) {
            e.preventDefault();
            stepEl.classList.remove("drag-over");
            e.stopPropagation(); 
            
            if (draggedSkillId) {
                addRotationStep(draggedSkillId, idx);
            } else if (draggedStepIndex !== null) {
                moveRotationStep(draggedStepIndex, idx);
            }
            draggedSkillId = null;
            draggedStepIndex = null;
        });

        // Exact Execution Count from Engine (Moonkin Engine hook compat)
        var exactCount = 0;
        if (typeof SIM_DATA !== 'undefined' && SIM_DATA && SIM_DATA.median && SIM_DATA.median.stats && SIM_DATA.median.stats.stepCounts && SIM_DATA.median.stats.stepCounts[step.id]) {
            exactCount = Math.round(SIM_DATA.median.stats.stepCounts[step.id]);
        }
        // id="badge_step_${step.id}" is kept so 05_engine.js can update it natively!
        var countHtml = `<span class="rb-step-count" id="badge_step_${step.id}" style="${exactCount > 0 ? '' : 'display:none;'}">${exactCount}x</span>`;

        var html = `
            <div class="rb-step-header">
                <div class="rb-step-title">
                    <img src="https://wow.zamimg.com/images/wow/icons/large/${skillDef.icon}.jpg" class="rb-skill-icon" alt="">
                    ${idx + 1}. ${skillDef.name}
                </div>
                <div style="display:flex; align-items:center;">
                    ${countHtml}
                    <button class="rb-toggle-btn" onclick="toggleStepDisabled(${idx})" title="Enable/Disable Step">${step.disabled ? '🚫' : '✅'}</button>
                    <button class="rb-delete-btn" onclick="removeRotationStep(${idx})">✖</button>
                </div>
            </div>
            <div class="rb-conditions" id="rb_conds_${idx}"></div>
        `;
        stepEl.innerHTML = html;
        dz.appendChild(stepEl);

        var condContainer = document.getElementById(`rb_conds_${idx}`);
        if (step.conditions && step.conditions.length > 0) {
            step.conditions.forEach((cond, cIdx) => {
                condContainer.appendChild(createConditionRow(idx, cIdx, cond));
            });
        }
        
        var addBtn = document.createElement("button");
        addBtn.className = "rb-add-condition";
        addBtn.innerText = "+ Add Condition";
        addBtn.onclick = function() { addCondition(idx); };
        condContainer.appendChild(addBtn);
    });
    
    saveCurrentState();
    generateAutoDescription();
}

function createConditionRow(stepIdx, condIdx, cond) {
    var row = document.createElement("div");
    row.className = "rb-condition-row";
    
    // Type Select
    var typeSel = document.createElement("select");
    CONDITION_TYPES.forEach(cDef => {
        var opt = document.createElement("option");
        opt.value = cDef.id;
        opt.innerText = cDef.label;
        if (cDef.id === cond.type) opt.selected = true;
        typeSel.appendChild(opt);
    });
    typeSel.onchange = function() { updateCondition(stepIdx, condIdx, "type", this.value); };
    row.appendChild(typeSel);

    var cDef = CONDITION_TYPES.find(c => c.id === cond.type) || CONDITION_TYPES[0];
    
    // Target Select
    if (cDef.hasTarget) {
        var targetSel = document.createElement("select");
        cDef.hasTarget.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o; opt.innerText = o;
            if (o === cond.target) opt.selected = true;
            targetSel.appendChild(opt);
        });
        targetSel.onchange = function() { updateCondition(stepIdx, condIdx, "target", this.value); };
        row.appendChild(targetSel);
    }

    // Operator Select
    if (cDef.hasOp) {
        var opSel = document.createElement("select");
        var ops = [">", "<", ">=", "<=", "=="];
        ops.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o; opt.innerText = o;
            if (o === cond.op) opt.selected = true;
            opSel.appendChild(opt);
        });
        opSel.onchange = function() { updateCondition(stepIdx, condIdx, "op", this.value); };
        row.appendChild(opSel);
    }

    // Value Input
    if (cDef.hasVal) {
        var valInp = document.createElement("input");
        valInp.type = "number";
        valInp.value = cond.val !== undefined ? cond.val : 0;
        valInp.onchange = function() { updateCondition(stepIdx, condIdx, "val", parseFloat(this.value)); };
        row.appendChild(valInp);
    }

    // Boolean (True/False) Select
    if (cDef.hasBool) {
        var boolSel = document.createElement("select");
        var opts = [{val: "true", text: "True"}, {val: "false", text: "False"}];
        opts.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o.val; opt.innerText = o.text;
            // Default ist "true"
            if (cond.bool === o.val || (cond.bool === undefined && o.val === "true")) opt.selected = true;
            boolSel.appendChild(opt);
        });
        boolSel.onchange = function() { updateCondition(stepIdx, condIdx, "bool", this.value); };
        row.appendChild(boolSel);
    }

    // Delete Button
    var delBtn = document.createElement("button");
    delBtn.className = "rb-delete-btn";
    delBtn.innerText = "✖";
    delBtn.onclick = function() { removeCondition(stepIdx, condIdx); };
    row.appendChild(delBtn);

    return row;
}

function updateCondition(sIdx, cIdx, field, value) {
    var cond = CUSTOM_ROTATION.steps[sIdx].conditions[cIdx];
    cond[field] = value;
    
    // Reset secondary fields if type changes
    if (field === "type") {
        var def = CONDITION_TYPES.find(c => c.id === value);
        if(def.hasOp) cond.op = ">="; else delete cond.op;
        if(def.hasTarget) cond.target = def.hasTarget[0]; else delete cond.target;
        if(def.hasVal) cond.val = 0; else delete cond.val;
    }
    if(def.hasBool) cond.bool = "true"; else delete cond.bool;
    renderRotationList();
}

function toggleStepDisabled(idx) {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || !CUSTOM_ROTATION.steps[idx]) return;
    CUSTOM_ROTATION.steps[idx].disabled = !CUSTOM_ROTATION.steps[idx].disabled;
    renderRotationList();
}

function addRotationStep(skillId, insertAtIdx) {
    if (!CUSTOM_ROTATION.steps) CUSTOM_ROTATION.steps = [];
    var newStep = {
        id: Date.now() + Math.floor(Math.random()*1000), // Numeric ID needed for Moonkin Engine Array
        skill: skillId,
        conditions: [],
        disabled: false
    };
    if (insertAtIdx !== undefined && insertAtIdx !== null) {
        CUSTOM_ROTATION.steps.splice(insertAtIdx, 0, newStep);
    } else {
        CUSTOM_ROTATION.steps.push(newStep);
    }
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function removeRotationStep(idx) {
    CUSTOM_ROTATION.steps.splice(idx, 1);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function moveRotationStep(fromIdx, toIdx) {
    if (toIdx > fromIdx) toIdx--; 
    var step = CUSTOM_ROTATION.steps.splice(fromIdx, 1)[0];
    CUSTOM_ROTATION.steps.splice(toIdx, 0, step);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function addCondition(sIdx) {
    var def = CONDITION_TYPES[0]; // debuff_rem
    var newCond = { type: def.id };
    if(def.hasTarget) newCond.target = def.hasTarget[0];
    if(def.hasOp) newCond.op = ">=";
    if(def.hasVal) newCond.val = 0;
    if(def.hasBool) newCond.bool = "true";
    
    CUSTOM_ROTATION.steps[sIdx].conditions.push(newCond);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function removeCondition(sIdx, cIdx) {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || !CUSTOM_ROTATION.steps[sIdx]) return;
    
    // Bedingung aus dem Array entfernen
    CUSTOM_ROTATION.steps[sIdx].conditions.splice(cIdx, 1);
    
    // Name auf "Custom" setzen, da die Rotation verändert wurde
    CUSTOM_ROTATION.name = "Custom Rotation";
    
    // UI neu laden und speichern
    renderRotationList();
}

function populatePresetDropdown() {
    var sel = document.getElementById("rotation_preset_select");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Preset --</option>';
    
    var grpDef = document.createElement("optgroup");
    grpDef.label = "Default Presets";
    Object.keys(PRESET_ROTATIONS).forEach(k => {
        var opt = document.createElement("option"); opt.value = "def_" + k; opt.innerText = PRESET_ROTATIONS[k].name || k;
        grpDef.appendChild(opt);
    });
    sel.appendChild(grpDef);

    var customStr = localStorage.getItem("boomkin_sim_custom_rotations");
    if (customStr) {
        try {
            var custom = JSON.parse(customStr);
            var grpCus = document.createElement("optgroup");
            grpCus.label = "My Saved Presets";
            Object.keys(custom).forEach(k => {
                var opt = document.createElement("option"); opt.value = "cus_" + k; opt.innerText = custom[k].name || k;
                grpCus.appendChild(opt);
            });
            if (grpCus.children.length > 0) sel.appendChild(grpCus);
        } catch(e){}
    }
}

function loadSelectedPreset() {
    var val = document.getElementById("rotation_preset_select").value;
    if (!val) { alert("Please select a preset from the dropdown first."); return; }
    if (CUSTOM_ROTATION && CUSTOM_ROTATION.steps && CUSTOM_ROTATION.steps.length > 0) {
        if(!confirm("Overwrite your current rotation?")) return;
    }
    
    if (val.startsWith("def_")) {
        var k = val.substring(4);
        CUSTOM_ROTATION = JSON.parse(JSON.stringify(PRESET_ROTATIONS[k]));
    } else if (val.startsWith("cus_")) {
        var k = val.substring(4);
        var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
        if (custom[k]) CUSTOM_ROTATION = JSON.parse(JSON.stringify(custom[k]));
    }
    renderRotationList();
    showToast("Preset loaded!");
}

function saveCustomPreset() {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) { alert("Rotation is empty."); return; }
    var name = CUSTOM_ROTATION.name || "Custom Rota";
    var safeName = prompt("Enter a save name for your local storage:", name);
    if (!safeName) return;
    
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
    CUSTOM_ROTATION.name = safeName; // Updates the input field
    custom[safeName] = JSON.parse(JSON.stringify(CUSTOM_ROTATION));
    localStorage.setItem("boomkin_sim_custom_rotations", JSON.stringify(custom));
    
    populatePresetDropdown();
    document.getElementById("rotation_preset_select").value = "cus_" + safeName;
    renderRotationList(); // Update UI
    showToast("Preset saved locally!");
}

function deleteCustomPreset() {
    var val = document.getElementById("rotation_preset_select").value;
    if (!val || !val.startsWith("cus_")) { alert("Please select one of 'My Saved Presets' to delete."); return; }
    if (!confirm("Are you sure you want to delete this preset?")) return;
    
    var k = val.substring(4);
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
    delete custom[k];
    localStorage.setItem("boomkin_sim_custom_rotations", JSON.stringify(custom));
    
    populatePresetDropdown();
    showToast("Preset deleted!");
}

function clearRotation() {
    if (confirm("Are you sure you want to clear your custom rotation?")) {
        CUSTOM_ROTATION = { name: "Blank", desc: "", steps: [] };
        document.getElementById("rotation_preset_select").value = "";
        renderRotationList();
    }
}

function generateAutoDescription() {
    var container = document.getElementById("rb_auto_desc");
    var header = document.getElementById("rb_auto_desc_header"); // Referenz auf den neuen Header
    if (!container) return;

    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) {
        container.innerHTML = "<em>No rotation configured.</em>";
        if (header) header.style.display = "none"; // Verstecke den Header, wenn leer
        return;
    }

    var activeSteps = CUSTOM_ROTATION.steps.filter(function(s) { return !s.disabled; });

    if (activeSteps.length === 0) {
        container.innerHTML = "<em>All rotation steps are disabled.</em>";
        if (header) header.style.display = "none"; // Verstecke den Header, wenn leer
        return;
    }

    // Zeige den Header an, da wir aktive Rotations-Schritte haben
    if (header) header.style.display = "flex";

    // Der Titel "Rotation Priority:" wurde entfernt, da er jetzt im klickbaren Header steht
    var text = "<div style='margin-top: 5px;'>";

    function formatSpell(skillId) {
        var sDef = ROTATION_SKILLS.find(function(s) { return s.id === skillId; }) || { name: skillId };
        var name = sDef.name;
        var cls = "desc-spell-arcane"; 
        if (skillId === "Wrath" || skillId === "InsectSwarm") cls = "desc-spell-nature";
        if (skillId.includes("Trinket")) cls = "desc-spell-item";
        return "<span class='" + cls + "'>" + name + "</span>";
    }

    function formatCond(cond) {
        var target = cond.target ? cond.target : "";
        var val = parseFloat(cond.val) || 0;
        var op = cond.op || "==";

        switch (cond.type) {
            case "debuff_rem":
            case "buff_rem":
            case "player_debuff_rem":
                if (op === "<=" && val === 0) return target + " is not active";
                if ((op === ">" || op === ">=") && val === 0) return target + " is active";
                if (op === "<=" || op === "<") return target + " has " + val + "s or less remaining";
                if (op === ">=" || op === ">") return target + " has more than " + val + "s remaining";
                return target + " duration is " + op + " " + val + "s";
                
            case "time_elapsed":
                if (op === "<=" && val === 0) return "combat just started";
                return "combat time is " + op + " " + val + "s";
                
            case "time_remaining":
                return "the fight has " + op + " " + val + "s left";
                
            case "ecl_vs_cast":
                if (cond.bool === "false") return "there is not enough Eclipse time left to cast " + target;
                return "there is enough Eclipse time left to cast " + target;
                
            case "last_cast":
                return "the last cast was " + target;
                
            default:
                return "a specific condition is met";
        }
    }

    var groupedSteps = [];
    activeSteps.forEach(function(step) {
        var lastGroup = groupedSteps[groupedSteps.length - 1];
        if (lastGroup && lastGroup.skill === step.skill) {
            lastGroup.conditionGroups.push(step.conditions || []);
        } else {
            groupedSteps.push({
                skill: step.skill,
                conditionGroups: [step.conditions || []]
            });
        }
    });

    groupedSteps.forEach(function(group, idx) {
        var spellHtml = formatSpell(group.skill);
        var isLast = (idx === groupedSteps.length - 1);
        
        var groupTexts = [];
        var hasUnconditional = false;

        group.conditionGroups.forEach(function(conds) {
            if (!conds || conds.length === 0) {
                hasUnconditional = true;
            } else {
                var condTexts = conds.map(function(c) { 
                    return "<span class='desc-condition'>" + formatCond(c) + "</span>"; 
                });
                groupTexts.push(condTexts.join(" <strong>and</strong> "));
            }
        });
        
        var condString = "";
        if (!hasUnconditional && groupTexts.length > 0) {
            condString = "<div style='margin-left: 20px; opacity: 0.9; margin-top: 2px;'>&#8627; if " + groupTexts.join(" <strong style='color:var(--text-color);'>OR</strong> if ") + "</div>";
        }

        var stepText = "";
        if (idx === 0) {
            stepText = "First, cast " + spellHtml;
        } else if (isLast && hasUnconditional) {
            stepText = "Otherwise, default to " + spellHtml + " as your filler.";
        } else {
            var trans = ["Next, use ", "Then, cast ", "After that, prioritize ", "Followed by "][(idx - 1) % 4];
            stepText = trans + spellHtml;
        }

        text += "<div style='margin-bottom: 8px;'>" + stepText + condString + "</div>";
    });

    text += "</div>";
    container.innerHTML = text;
}

// Neue Funktion für das Auf- und Zuklappen der Beschreibung
function toggleAutoDesc() {
    var content = document.getElementById("rb_auto_desc");
    var header = document.getElementById("rb_auto_desc_header");
    var icon = document.getElementById("rb_auto_desc_icon");
    
    if (!content || !header || !icon) return;
    
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block"; // Aufklappen
        header.classList.add("is-open"); // Passt das CSS für abgerundete Ecken an
        icon.innerHTML = "&#9650;"; // Ändert das Icon auf einen Pfeil nach oben
    } else {
        content.style.display = "none"; // Zuklappen
        header.classList.remove("is-open");
        icon.innerHTML = "&#9660;"; // Ändert das Icon auf einen Pfeil nach unten
    }
}

// ============================================================================
// BUFF TOGGLE LOGIC
// ============================================================================
function toggleBuffs(btnElement, checkState) {
    var titleDiv = btnElement.closest('.gear-section-title');
    if (titleDiv && titleDiv.nextElementSibling && titleDiv.nextElementSibling.classList.contains('checkbox-grid')) {
        var checkboxes = titleDiv.nextElementSibling.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(function(cb) {
            if (!cb.disabled) {
                cb.checked = checkState;
            }
        });
        
        // Exklusivität sicherstellen, falls "All" in der Food-Sektion geklickt wurde
        if (checkState) {
            var fSp = document.getElementById('buff_food_sp');
            var fMedley = document.getElementById('buff_food_medley');
            if (fSp && fMedley && fSp.checked && fMedley.checked) {
                fMedley.checked = false; // Wir priorisieren Delight (SP), wenn "All" geklickt wird
            }
        }
        
        if (typeof calculateGearStats === 'function') {
            calculateGearStats();
        }
        saveCurrentState();
    }
}

// ============================================================================
// NEW: AOE DAMAGE COMPARISON CHART
// ============================================================================
function renderAoEChart() {
    var container = document.getElementById("aoeChartContainer");
    if (!container) return;
    
    var targetsInput = document.getElementById("aoe_targets");
    var numTargets = targetsInput ? parseInt(targetsInput.value) : 3;
    if (isNaN(numTargets) || numTargets < 1) numTargets = 1;
    
    var modeInput = document.getElementById("aoe_mode");
    var mode = modeInput ? modeInput.value : "dps";
    
    // Holt sich die aktuellsten Werte aus der Engine
    var cfg = getInputs(); 
    
    // --- Mathematische Grundlagen ---
    var eclFactor = (10 + 60 * (cfg.stats.crit / 100)) / 100;
    var eclipseModification = 1 + eclFactor;
    var cosMod = 1 + 0.1 * cfg.enemy.cos;
    
    // Hurricane (Nature)
    var hurr_base = 134;
    var hurr_coeff = 0.096;
    var hurr_sp = cfg.power.sp + cfg.power.nat;
    var hurr_raw = hurr_base + (hurr_coeff * hurr_sp);
    var hurr_tick_dmg = hurr_raw * (1 + 0.12 + 0.15) * eclipseModification;
    if (cfg.gear.t35_3p) {
        hurr_tick_dmg += (hurr_raw * eclipseModification) / 2;
    }
    
    // Moonfire (Arcane, profitiert von Curse of Shadow)
    var mf_hit_mod = 0.20 + 0.02; // Moonfury
    if (cfg.gear.idolMoon) mf_hit_mod += 0.17;
    var mf_direct_dmg = (210 + 0.14 * (cfg.power.sp + cfg.power.arc)) * (1 + mf_hit_mod) * eclipseModification * cosMod;
    
    var mf_tick_mod = 0.35 + 0.02; 
    if (cfg.gear.idolMoon) mf_tick_mod += 0.17;
    var mf_tick_dmg = (95.6 + 0.13 * (cfg.power.sp + cfg.power.arc)) * (1 + mf_tick_mod) * eclipseModification * cosMod;
    var durMF = 18.0 + (cfg.gear.t3_4p ? 3.0 : 0);
    
    // Insect Swarm (Nature)
    var is_coeff = ((18 / 15) * 0.95 * 1.25) / 9;
    var is_mod = 0.25 + 0.02;
    if (cfg.gear.idolProp) is_mod += 0.17;
    var is_tick_dmg = (53.35 + is_coeff * (cfg.power.sp + cfg.power.nat)) * (1 + is_mod) * eclipseModification;
    var durIS = 18.0 + (cfg.gear.t3_4p ? 2.0 : 0);
    
    // --- Simulation (60 Sekunden, 0.5s Schritte) ---
    var history = [];
    var totalHurr = 0, totalMF = 0, totalIS = 0;
    var activeMF = [], activeIS = [];
    var gcdMF = 0, gcdIS = 0;
    
    for (var t = 0; t <= 60; t += 0.5) {
        var dmgHurrThisStep = 0, dmgMFThisStep = 0, dmgISThisStep = 0;
        
        // Hurricane (tickt jede Sekunde auf alle Ziele)
        if (t > 0 && t % 1.0 === 0) {
            dmgHurrThisStep = hurr_tick_dmg * numTargets;
            totalHurr += dmgHurrThisStep;
        }
        
        // Moonfire Cast & Tick Logik
        if (t >= gcdMF) {
            if (activeMF.length < numTargets) {
                dmgMFThisStep += mf_direct_dmg;
                activeMF.push({ exp: t + durMF, nextTick: t + 3.0 });
                gcdMF = t + 1.5;
            } else {
                var oldestMF = -1, oldestExpMF = 999;
                for(var i=0; i<activeMF.length; i++) {
                    if (activeMF[i].exp < oldestExpMF) {
                        oldestExpMF = activeMF[i].exp;
                        oldestMF = i;
                    }
                }
                if (oldestExpMF <= t) { // Recast
                    dmgMFThisStep += mf_direct_dmg;
                    activeMF[oldestMF] = { exp: t + durMF, nextTick: t + 3.0 };
                    gcdMF = t + 1.5;
                }
            }
        }
        for(var i=0; i<activeMF.length; i++) {
            if (activeMF[i].exp >= t && activeMF[i].nextTick === t) {
                dmgMFThisStep += mf_tick_dmg;
                activeMF[i].nextTick += 3.0;
            }
        }
        totalMF += dmgMFThisStep;
        
        // Insect Swarm Cast & Tick Logik
        if (t >= gcdIS) {
            if (activeIS.length < numTargets) {
                activeIS.push({ exp: t + durIS, nextTick: t + 2.0 });
                gcdIS = t + 1.5;
            } else {
                var oldestIS = -1, oldestExpIS = 999;
                for(var i=0; i<activeIS.length; i++) {
                    if (activeIS[i].exp < oldestExpIS) {
                        oldestExpIS = activeIS[i].exp;
                        oldestIS = i;
                    }
                }
                if (oldestExpIS <= t) { // Recast
                    activeIS[oldestIS] = { exp: t + durIS, nextTick: t + 2.0 };
                    gcdIS = t + 1.5;
                }
            }
        }
        for(var i=0; i<activeIS.length; i++) {
            if (activeIS[i].exp >= t && activeIS[i].nextTick === t) {
                dmgISThisStep += is_tick_dmg;
                activeIS[i].nextTick += 2.0;
            }
        }
        totalIS += dmgISThisStep;
        
        // Status für das Diagramm erfassen ("Treppen" bauen)
        var currentDpsHurr = hurr_tick_dmg * numTargets;
        var currentDpsMF = (activeMF.length * (mf_tick_dmg / 3.0)) + ((t < gcdMF) ? (mf_direct_dmg / 1.5) : 0);
        var currentDpsIS = (activeIS.length * (is_tick_dmg / 2.0));
        
        history.push({
            t: t,
            dpsH: currentDpsHurr, dpsM: currentDpsMF, dpsI: currentDpsIS,
            totH: totalHurr, totM: totalMF, totI: totalIS
        });
    }
    
    // --- SVG Rendering ---
    var maxVal = 0;
    history.forEach(function(pt) {
        var vH = mode === "total" ? pt.totH : pt.dpsH;
        var vM = mode === "total" ? pt.totM : pt.dpsM;
        var vI = mode === "total" ? pt.totI : pt.dpsI;
        if (vH > maxVal) maxVal = vH;
        if (vM > maxVal) maxVal = vM;
        if (vI > maxVal) maxVal = vI;
    });
    if (maxVal === 0) maxVal = 1;
    maxVal = maxVal * 1.15; // 15% Puffer nach oben im Diagramm
    
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    
    var width = container.clientWidth || 600;
    var height = container.clientHeight || 220;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("preserveAspectRatio", "none");
    
    function createLine(key, color) {
        var polyline = document.createElementNS(svgNS, "polyline");
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", color);
        polyline.setAttribute("stroke-width", "2");
        
        var pointsStr = "";
        history.forEach(function(pt) {
            var val = mode === "total" ? pt["tot" + key] : pt["dps" + key];
            var x = (pt.t / 60) * width;
            var y = height - (val / maxVal) * height;
            pointsStr += x + "," + y + " ";
        });
        polyline.setAttribute("points", pointsStr.trim());
        return polyline;
    }
    
    // Raster & Labels zeichnen
    var gridLines = 4;
    for(var i=0; i<=gridLines; i++) {
        var yPos = height - (i/gridLines)*height;
        var line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("x2", width);
        line.setAttribute("y1", yPos);
        line.setAttribute("y2", yPos);
        line.setAttribute("stroke", "rgba(255,255,255,0.1)");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        
        var label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", "5");
        label.setAttribute("y", yPos > 15 ? yPos - 5 : yPos + 15);
        label.setAttribute("fill", "rgba(255,255,255,0.4)");
        label.setAttribute("font-size", "10px");
        label.setAttribute("font-family", "sans-serif");
        label.textContent = Math.floor((i/gridLines)*maxVal);
        svg.appendChild(label);
    }
    
    [0, 15, 30, 45, 60].forEach(function(tVal) {
        var xPos = (tVal / 60) * width;
        var label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", xPos === 0 ? 2 : (xPos >= width ? width - 20 : xPos - 5));
        label.setAttribute("y", height - 5);
        label.setAttribute("fill", "rgba(255,255,255,0.4)");
        label.setAttribute("font-size", "10px");
        label.setAttribute("font-family", "sans-serif");
        label.textContent = tVal + "s";
        svg.appendChild(label);
    });
    
    svg.appendChild(createLine("H", "#00bcd4")); // Cyan für Hurricane
    svg.appendChild(createLine("M", "var(--arcane-blue)"));
    svg.appendChild(createLine("I", "var(--nature-green)"));
    
    container.innerHTML = "";
    container.appendChild(svg);
}