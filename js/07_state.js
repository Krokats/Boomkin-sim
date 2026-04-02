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
    
    // Heart of Decay (Trinket) Zusatz für Hurricane
    var decay_raw = 0;
    var decay_ecl = 0;
    if (cfg.gear.decay) {
        // Schaden = 180 + 4,1% * (SP + NP)
        decay_raw = 180 + (0.041 * hurr_sp);
        decay_ecl = decay_raw * eclipseModification;
        
        // 5 sec. ICD, d.h. max. 2 Procs pro Hurricane (10 sec. Dauer) mit 5% Proc-Chance pro Tick. Daher rechnen wir 0.05 * 2 = 0.10 (10% durchschnittlicher Proc-Schaden pro Hurricane) auf den Gesamtschaden auf.
        // 5% Proc-Chance als durchschnittlichen Extra-Schaden pro Tick aufrechnen, 
        hurr_scaledNoEcl += (decay_raw * 0.10);
        hurr_scaledEcl += (decay_ecl * 0.10);
        
        // Extra Zeile für den Proc-Wert selbst anzeigen
        tbody.innerHTML += '<tr><td>Heart of Decay (Proc)</td><td>180</td><td class="val-calc">' + Math.floor(decay_raw) + '</td><td>+' + (eclFactor * 100).toFixed(0) + '%</td><td class="val-calc">' + Math.floor(decay_ecl) + '</td><td>0.00s</td></tr>';
    }

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

