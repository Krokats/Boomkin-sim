/**
 * Moonkin Simulation - File 5: Simulation Engine & Math
 */

// ============================================================================
// CORE SIMULATION WRAPPERS
// ============================================================================

function getInputs() {
    if (!document.getElementById("calcMethod")) return { mode: "S", stats: {}, power: {}, enemy: {}, gear: {}, talents: {}, rota: {} };
    var m = document.getElementById("calcMethod").value;
    var rawSims = getVal("simCount");
    var hitBonus = getVal("statHit");
    var lvl = getVal("enemy_level");
    var baseHit = 0.96;
    if (lvl == 61) baseHit = 0.95;
    if (lvl == 62) baseHit = 0.94;
    if (lvl == 63) baseHit = 0.83;
    var finalHitChance = Math.min(0.99, baseHit + (hitBonus / 100));

    // NEU: Haste Multiplikator aus dem DOM abgreifen
    var hasteInput = document.getElementById("statHaste");
    var hasteMultVal = hasteInput && hasteInput.getAttribute("data-mult") ? parseFloat(hasteInput.getAttribute("data-mult")) : 1.0;

    // Eclipse Override Logic
    var patchVer = "1.18.1c";
    var useOver = getVal("stat_override_eclipse");
    var valNE = useOver ? getVal("stat_proc_nature") : 60;
    var valAE = useOver ? getVal("stat_proc_arcane") : 40;

    return {
        sim_patch: patchVer,
        mode: "S", iterations: (rawSims > 0 ? rawSims : 1), maxTime: getVal("maxTime"), avcd: getVal("avcd") / 1000,
        rng_seed: document.getElementById("rng_seed") ? document.getElementById("rng_seed").value : "",
        rota: {
            spellInterrupt: getVal("rota_interrupt"),
            startBoat: getVal("start_boat"), wrathFlight: getVal("wrath_flight"),
            dotCutoff: getVal("rota_dot_cutoff"), 
            interruptThresh: getVal("rota_interrupt_thresh") 
        },
        custom_rotation: (typeof CUSTOM_ROTATION !== 'undefined') ? JSON.parse(JSON.stringify(CUSTOM_ROTATION)) : { steps: [] },
        stats: { hit: finalHitChance, hitBonus: hitBonus, crit: getVal("statCrit"), haste: getVal("statHaste"), hasteFactor: hasteMultVal, baseHitProb: baseHit },
        power: { sp: getVal("sp_gen"), nat: getVal("sp_nature"), arc: getVal("sp_arcane"), pen: getVal("sp_pen") },
        enemy: { resNat: getVal("res_nature"), resArc: getVal("res_arcane"), cos: getVal("enemy_cos"), level: lvl, extMF: getVal("enemy_ext_mf"), extIS: getVal("enemy_ext_is") },
        gear: { t3_4p: getVal("t3_4p"), t3_6p: getVal("t3_6p"), t3_8p: getVal("t3_8p"), t35_5p: getVal("t35_5p"), stag_5p: getVal("stag_5p"),
            idolEoF: getVal("idolEoF"), idolMoon: getVal("idolMoon"), idolProp: getVal("idolProp"), idolMoonfang: getVal("idolMoonfang"), 
            idolAcidity: getVal("idolAcidity"),idolEquilibrium: getVal("idolEquilibrium"),idolEquilibriumV2: getVal("idolEquilibriumV2"),idolEquilibriumV3: getVal("idolEquilibriumV3"),
            binding: getVal("item_binding"), scythe: getVal("item_scythe"), nobility: getVal("item_nobility"), thane: getVal("item_thane"), 
            sulfuras: getVal("item_sulfuras"), sigil: getVal("item_sigil"), chromie: getVal("item_chromie"), kelp: getVal("item_kelp"), sphere: getVal("item_sphere"),
            reos: getVal("item_reos"), toep: getVal("item_toep"), roop: getVal("item_roop"), zhc: getVal("item_zhc") },
        talents: { nEProc: valNE, aEProc: valAE, onCrit: false, neDuration: 15.0, aeDuration: 15.0, neICD: 30.0, aeICD: 30.0, boatReduc: getVal("t35_5p") ? 0.75 : 0.5, boatChance: 0.30, ooc: 1, boon: 1 }
    };
}

// ============================================================================
// CORE SIMULATION WRAPPERS (ASYNC BATCHING)
// ============================================================================

async function runSimulation() {
    var config = getInputs();

    // 1. UI Setup
    showProgress("Simulating...");
    var wRes = document.getElementById("weightResults");
    if (wRes) wRes.classList.add("hidden");

    // 2. Setup Async Loop
    var allResults = [];
    var i = 0;
    var batchSize = Math.max(1, Math.floor(config.iterations / 20)); // Dynamische Batch-Größe

    // Seed-Vorbereitung (String Hash zu Int für Determinismus)
    var baseSeed = 0;
    if (config.rng_seed && config.rng_seed.toString().trim().length > 0) {
        var str = config.rng_seed.toString().trim();
        for (var k = 0; k < str.length; k++) {
            baseSeed = ((baseSeed << 5) - baseSeed) + str.charCodeAt(k);
            baseSeed |= 0;
        }
    } else {
        baseSeed = Math.floor(Math.random() * 0xFFFFFFFF);
    }

    function processBatch() {
        try {
            var target = Math.min(config.iterations, i + batchSize);

            // Batch abarbeiten
            for (; i < target; i++) {
                var currentConfig = Object.assign({}, config);
                // Seed pro Iteration hochzählen für Varianz bei fixem Start-Seed
                currentConfig.seed = baseSeed + i;
                
                // Einen einzelnen Durchlauf berechnen
                var res = runCoreSimulation(currentConfig);
                allResults.push(res);
            }

            // Update UI Progress
            if (typeof updateProgress === "function") {
                updateProgress((i / config.iterations) * 100);
            }

            if (i < config.iterations) {
                // Browser rendern lassen, dann weitermachen
                setTimeout(processBatch, 0);
            } else {
                // 3. Finalize
                var aggregated = aggregateResults(allResults, config);

                SIM_LIST[ACTIVE_SIM_INDEX].results = aggregated;
                SIM_DATA = aggregated;

                // UI Updates
                if (document.getElementById("viewSeed")) setText("viewSeed", "Seed Run (" + aggregated.seed.dps.toFixed(1) + ")");
                setText("viewMedian", "Median (" + aggregated.median.dps.toFixed(1) + ")");
                setText("viewP5", "5% DPS (" + aggregated.p5.dps.toFixed(1) + ")");
                setText("viewP95", "95% DPS (" + aggregated.p95.dps.toFixed(1) + ")");
                
                switchView(CURRENT_VIEW);
                var btnW = document.getElementById("btnWeights");
                if (btnW) btnW.disabled = false;

                if (typeof updateStepCounters === "function") updateStepCounters();

                showToast("Simulation Complete!");
                hideProgress();
            }

        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
            hideProgress();
        }
    }

    // Start mit kleiner Verzögerung, damit UI rendern kann
    setTimeout(processBatch, 50);
}

function runAllSims() {
    showProgress("Running All...");
    var idx = 0;
    
    function step() {
        if (idx >= SIM_LIST.length) {
            updateProgress(100);
            setTimeout(hideProgress, 500);
            showOverview();
            return;
        }
        
        var pct = (idx / SIM_LIST.length) * 100;
        updateProgress(pct);

        ACTIVE_SIM_INDEX = idx;
        applyConfigToUI(SIM_LIST[idx].config);

        // UI Update abwarten, dann rechnen
        setTimeout(function () {
            var config = getInputs();
            
            // 1. Iterationsanzahl bestimmen
            // (getInputs setzt iterations bereits auf 1, wenn Mode != S ist)
            var count = config.iterations;

            // 2. Seed vorbereiten (String Hash zu Int)
            var baseSeed = 0;
            if (config.rng_seed && config.rng_seed.toString().trim().length > 0) {
                var str = config.rng_seed.toString().trim();
                for (var k = 0; k < str.length; k++) {
                    baseSeed = ((baseSeed << 5) - baseSeed) + str.charCodeAt(k);
                    baseSeed |= 0;
                }
            } else {
                baseSeed = Math.floor(Math.random() * 0xFFFFFFFF);
            }

            // 3. Batch Loop durchführen (Synchron für "Run All", um Overhead zu meiden)
            var batchResults = [];
            for (var j = 0; j < count; j++) {
                var runCfg = Object.assign({}, config);
                // Seed pro Iteration hochzählen
                runCfg.seed = baseSeed + j;
                
                var res = runCoreSimulation(runCfg);
                batchResults.push(res);
            }
            
            // 4. Ergebnisse aggregieren (Avg, Min, Max bilden)
            SIM_LIST[idx].results = aggregateResults(batchResults, config);
            
            idx++;
            step();
        }, 50);
    }
    step();
}

// ============================================================================
// STAT WEIGHTS (PAIRED SEEDING, DIFFERENTIAL ERROR & HIT CAP)
// ============================================================================
function calculateWeights() {
    showProgress("Calculating Weights...");
    
    // Basis-Konfiguration
    var baseConfig = getInputs();
    baseConfig.mode = "S"; 
    var iterations = 5000; 
    baseConfig.iterations = iterations;

    // Check Hit Cap (16% Hit = 99% Chance vs Lvl 63)
    // baseConfig.stats.hit ist bereits gecappt auf 0.99 in getInputs()
    // Wir prüfen also, ob wir das Hardcap bereits erreicht haben.
    var isHitCapped = (baseConfig.stats.hit >= 0.99);

    var baseSeed = 1337;//baseConfig.rng_seed ? parseInt(baseConfig.rng_seed) : 1337; keep the Stat Weigh Process constant
    //if (isNaN(baseSeed)) baseSeed = 1337;

    //var FightTime = 500; 
    //baseConfig.dur = FightTime;


    // Szenarien
    var scenarios = [
        { id: "base", label: "Base", mod: function(c) {}, norm: 1 },
        { id: "sp",   label: "+50 SP", mod: function(c) { c.power.sp += 50; } , norm: 50},
        { id: "crit", label: "+1% Crit", mod: function(c) { c.stats.crit += 1; }, norm: 1 },
        { id: "hit",  label: "+1% Hit", mod: function(c) { 
            c.stats.hitBonus += 1; 
            // Neu berechnen für dieses Szenario, da das Cap in getInputs schon passierte
            c.stats.hit = Math.min(0.99, c.stats.baseHitProb + (c.stats.hitBonus/100)); 
        }, skip: isHitCapped, norm: 1 }, // Skip flag wenn am Cap
        { id: "haste",label: "+1% Haste", mod: function(c) { c.stats.haste += 1; c.stats.hasteFactor *= 1.01; }, norm: 1 }
    ];

    // Dynamische Haste-Szenarien hinzufügen
    var hasteSteps = parseInt(document.getElementById("weight_haste_steps") ? document.getElementById("weight_haste_steps").value : 5);
    if (isNaN(hasteSteps) || hasteSteps < 1) hasteSteps = 1;

    for (var s = 1; s <= hasteSteps; s++) {
        (function(step) {
            scenarios.push({
                id: "haste_step_" + step,
                label: "+" + step + "% Haste",
                mod: function(c) { c.stats.haste += step; c.stats.hasteFactor *= Math.pow(1.01, step); },
                norm: 1 // norm=1, da wir den absoluten DPS-Gewinn für die gesamten +X% wollen
            });
        })(s);
    }

    // Wir speichern ALLE Einzelergebnisse des Base-Runs, 
    // um die Differenz pro Seed berechnen zu können (Paired Difference Test).
    // Das reduziert den statistischen Fehler massiv.
    var baseRunData = []; 
    var calculatedDeltas = {}; // Speichert { mean, se } für jedes Szenario

    var currentScenIdx = 0;
    var batchSize = 100;

    function runNextScenario() {
        if (currentScenIdx >= scenarios.length) {
            finalizeWeights();
            hideProgress();
            return;
        }

        var scen = scenarios[currentScenIdx];

        // NEU: Update Progress Text
        var pText = document.getElementById("progressText");
        if (pText) pText.innerText = "Calculating: " + scen.label + "...";
        
        // HIT CAP LOGIC: Wenn wir am Cap sind, Hit überspringen
        if (scen.skip) {
            calculatedDeltas[scen.id] = { mean: 0, se: 0 };
            currentScenIdx++;
            setTimeout(runNextScenario, 0);
            return;
        }

        var runCfg = JSON.parse(JSON.stringify(baseConfig));
        scen.mod(runCfg);

        // Temporärer Speicher für dieses Szenario
        var currentRunResults = []; 
        var i = 0;

        function processScenarioBatch() {
            try {
                var target = Math.min(iterations, i + batchSize);

                for (; i < target; i++) {
                    var stepConfig = Object.assign({}, runCfg);
                    stepConfig.seed = baseSeed + i; 

                    var res = runCoreSimulation(stepConfig);
                    var dps = res.totalDmg / stepConfig.maxTime;
                    
                    if (scen.id === "base") {
                        baseRunData.push(dps);
                    } else {
                        currentRunResults.push(dps);
                    }
                }

                // Progress update
                var totalProgress = ((currentScenIdx * iterations) + i) / (scenarios.length * iterations);
                updateProgress(totalProgress * 100);

                if (i < iterations) {
                    setTimeout(processScenarioBatch, 0); 
                } else {
                    // Batch fertig. Jetzt Differenzen berechnen.
                    if (scen.id !== "base") {
                        calculateDeltaStats(scen.id, currentRunResults);
                    }
                    
                    currentScenIdx++;
                    setTimeout(runNextScenario, 0);
                }

            } catch (e) {
                console.error(e);
                alert("Error during weights: " + e.message);
                hideProgress();
            }
        }

        setTimeout(processScenarioBatch, 0);
    }

    // Berechnet Mean und Standard Error der Differenz (Paired)
    function calculateDeltaStats(id, scenResults) {
        var n = scenResults.length;
        var sumDiff = 0;
        var diffs = [];

        // 1. Differenzen bilden (Run A vs Run B mit gleichem Seed)
        for(var k=0; k<n; k++) {
            var diff = scenResults[k] - baseRunData[k];
            diffs.push(diff);
            sumDiff += diff;
        }

        var meanDiff = sumDiff / n;

        // 2. Standardabweichung der Differenzen
        var sumSqDiff = 0;
        for(var k=0; k<n; k++) {
            var d = diffs[k] - meanDiff;
            sumSqDiff += (d * d);
        }
        
        var variance = (n > 1) ? sumSqDiff / (n - 1) : 0;
        var stdDev = Math.sqrt(variance);
        var stdErr = stdDev / Math.sqrt(n);

        calculatedDeltas[id] = { mean: meanDiff, se: stdErr };
    }

function finalizeWeights() {
    var dpsPer50SP = calculatedDeltas["sp"].mean;
    // Referenzwert: DPS pro 1 SP
    var valRef = dpsPer50SP / 50; 
    if(valRef <= 0.0001) valRef = 0.0001;

    // Helper Funktion für das HTML-Rendering
    var renderInnerHtml = function(key, isCapped) {
        if (isCapped) {
            return '<span class="med-number" style="color:#666;">0.00</span>' + 
                   '<div style="font-size:0.85rem; color:#555; margin-top:4px;">(Capped)</div>';
        }

        var data = calculatedDeltas[key];
        
        var scenObj = scenarios.find(s => s.id === key);
        var norm = (scenObj && scenObj.norm) ? scenObj.norm : 1;

        var w = (data.mean / norm) / valRef;
        var e = (data.se / norm) / valRef;
        
        var colorClass = "";
        if(key === "crit") colorClass = "text-stat-orange";
        else if(key === "hit") colorClass = "text-stat-blue";
        else if(key === "haste") colorClass = "text-stat-green";
        else colorClass = "text-stat-orange";

        return '<span class="med-number ' + colorClass + '">' + w.toFixed(2) + '</span>' + 
               '<div style="font-size:0.85rem; color:#888; margin-top:4px;">&plusmn;' + e.toFixed(2) + '</div>';
    };

    // --- MARGINAL & CUMULATIVE HASTE SCALING BERECHNEN (ALS DIAGRAMM) ---
    var hasteStepsHtml = "";
    var prevTotalEP = 0;
    var hasteStepsCount = parseInt(document.getElementById("weight_haste_steps") ? document.getElementById("weight_haste_steps").value : 5);
    var baseHasteEP = (calculatedDeltas["haste"].mean / 1) / valRef; 
    
    var stepEPs = [];
    var maxMarginal = 0;
    var maxCumulative = 0; // NEU: Max-Wert für das kumulative Diagramm

    for(var s = 1; s <= hasteStepsCount; s++) {
        var stepData = calculatedDeltas["haste_step_" + s];
        if(!stepData) continue;
        
        var totalEP = stepData.mean / valRef;
        var marginalEP = totalEP - prevTotalEP;
        prevTotalEP = totalEP;
        
        // Speichere beide Werte
        stepEPs.push({ step: s, marginal: marginalEP, cumulative: totalEP });
        if(marginalEP > maxMarginal) maxMarginal = marginalEP;
        if(totalEP > maxCumulative) maxCumulative = totalEP;
    }

    // Hilfsfunktion zum Generieren der Charts
    function buildChart(isMarginal) {
        var chartHtml = '<div style="height: 140px; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 6px; margin-top: 10px;">';
        var maxVal = isMarginal ? maxMarginal : maxCumulative;

        stepEPs.forEach(function(item) {
            var val = isMarginal ? item.marginal : item.cumulative;
            var isBreakpoint = (baseHasteEP > 0 && item.marginal > baseHasteEP * 1.2); // Breakpoints immer anhand des marginalen Sprungs markieren
            
            var heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            if(heightPct < 2 && val > 0) heightPct = 2; 
            
            var bgColor = isBreakpoint ? 'var(--druid-orange)' : 'var(--text-muted)';
            var opacity = isBreakpoint ? '1' : '0.6';
            var textColor = isBreakpoint ? 'var(--druid-orange)' : '#e0e0e0';

            chartHtml += '<div style="width: 45px; flex-shrink: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">' + 
                         '<span style="font-size: 0.70rem; font-weight: bold; color: ' + textColor + ';">' + val.toFixed(1) + '</span>' + 
                         '<div style="flex-grow: 1; display: flex; align-items: flex-end; width: 100%; justify-content: center; margin: 4px 0;">' + 
                             '<div style="width: 80%; max-width: 35px; background: ' + bgColor + '; opacity: ' + opacity + '; height: ' + heightPct + '%; border-radius: 3px 3px 0 0; transition: height 0.5s ease-out;"></div>' + 
                         '</div>' + 
                         '<span style="font-size: 0.70rem; color: #888;">+' + item.step + '%</span>' +
                         '</div>';
        });
        chartHtml += '</div>';
        return chartHtml;
    }

    // Beide Diagramme generieren (Marginal standardmäßig sichtbar, Cumulative versteckt)
    var marginalChart = '<div id="chart_marginal">' + buildChart(true) + '<div style="text-align: center; font-size: 0.7rem; color: #666; margin-top: 10px; border-top: 1px solid #333; padding-top: 5px;">Bars represent the marginal EP value for each +1% Haste step. Breakpoints are highlighted in orange.</div></div>';
    var cumulativeChart = '<div id="chart_cumulative" style="display:none;">' + buildChart(false) + '<div style="text-align: center; font-size: 0.7rem; color: #666; margin-top: 10px; border-top: 1px solid #333; padding-top: 5px;">Bars represent the cumulative EP value up to that Haste step. Breakpoints are highlighted in orange.</div></div>';

    // Toggle Button (Inline JS, um globale UI-Skripte nicht aufzublähen)
    var toggleBtn = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">' +
                    '<span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">View Mode:</span>' +
                    '<button class="btn-mini" onclick="var m=document.getElementById(\'chart_marginal\'); var c=document.getElementById(\'chart_cumulative\'); if(m.style.display===\'none\'){m.style.display=\'block\'; c.style.display=\'none\'; this.innerText=\'Show Cumulative EP\';} else {m.style.display=\'none\'; c.style.display=\'block\'; this.innerText=\'Show Marginal EP\';}">Show Cumulative EP</button>' +
                    '</div>';

    hasteStepsHtml = toggleBtn + marginalChart + cumulativeChart;

    // KERN-FIX: Speichere die Ergebnisse als Strings im Objekt der aktuellen Simulation
    if (SIM_LIST[ACTIVE_SIM_INDEX].results) {
        SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights = {
            crit: renderInnerHtml("crit", false),
            hit: renderInnerHtml("hit", isHitCapped),
            haste: renderInnerHtml("haste", false),
            hasteStepsHtml: hasteStepsHtml // HTML für das Diagramm speichern
        };
    }

    var resBox = document.getElementById("weightResults");
    if (resBox) resBox.classList.remove("hidden");

    // UI-Elemente mit den gerade berechneten Daten befüllen
    var elCrit = document.getElementById("val_crit");
    if(elCrit) {
        elCrit.className = ""; 
        elCrit.style.display = "block"; 
        elCrit.innerHTML = SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights.crit;
    }

    var elHit = document.getElementById("val_hit");
    if(elHit) {
        elHit.className = "";
        elHit.style.display = "block";
        elHit.innerHTML = SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights.hit;
    }

    var elHaste = document.getElementById("val_haste");
    if(elHaste) {
        elHaste.className = "";
        elHaste.style.display = "block";
        elHaste.innerHTML = SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights.haste;
    }

    // NEU: Haste Steps Container befüllen
    var elHasteSteps = document.getElementById("haste_steps_container");
    if(elHasteSteps && SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights.hasteStepsHtml) {
        elHasteSteps.innerHTML = SIM_LIST[ACTIVE_SIM_INDEX].results.statWeights.hasteStepsHtml;
    }
}

    runNextScenario();
}

// ============================================================================
// MATH CORE (SINGLE RUN)
// ============================================================================

function runCoreSimulation(cfg) {
    // 1. RNG Setup
    var rngHandler = new RNGHandler(cfg.seed);

    // 2. Statische Werte vorbereiten
    var effResNat = Math.max(0, (cfg.enemy.level - 60) * 5 + cfg.enemy.resNat - cfg.power.pen);
    var effResArc = Math.max(0, (cfg.enemy.level - 60) * 5 + cfg.enemy.resArc - cfg.power.pen);
    var avgMitNat = Math.min(0.75, (effResNat / (cfg.enemy.level * 5)) * 0.75);
    var avgMitArc = Math.min(0.75, (effResArc / (cfg.enemy.level * 5)) * 0.75);
    
    // Idol of Acidity Mitigation (Pre-Calculated)
    var effResNatAcidity = Math.max(0, (cfg.enemy.level - 60) * 5 + cfg.enemy.resNat - cfg.power.pen - 25);
    var avgMitNatAcidity = Math.min(0.75, (effResNatAcidity / (cfg.enemy.level * 5)) * 0.75);

    var eclipseMod = 10 + 60 * (cfg.stats.crit / 100);
    var eclFactor = eclipseMod / 100;
    var cosMod = 1 + 0.1 * cfg.enemy.cos;

    // Spells
    var w_min = 292, w_max = 328; // Wrath: 292-328 (Avg 310)
    var sf_min = 496, sf_max = 584; // Starfire: 496-584 (Avg 540)
    var w_coeff = 0.62; //(2.0 / 3.5) * 1.05;
    var sf_coeff = 1.0;
    var mf_d_base = 210; var mf_d_coeff = 0.14;
    var mf_t_base = 95.6; var mf_t_coeff = 0.13;
    var is_base = 53.35; var is_coeff = ((18 / 15) * 0.95 * 1.25) / 9;
    var durMF = 18.0 + (cfg.gear.t3_4p ? 3.0 : 0); 
    var durIS = 18.0 + (cfg.gear.t3_4p ? 2.0 : 0); 

    var Spells = {
        Wrath: { name: "Wrath", id: "Wrath", type: "Nature", baseCast: 1.5, min: w_min, max: w_max, base: 310, coeff: w_coeff, flight: cfg.rota.wrathFlight, isDot: false, cost: 149, dur: 0, tick: 0 },
        Starfire: { name: "Starfire", id: "Starfire", type: "Arcane", baseCast: 3.0, min: sf_min, max: sf_max, base: 540, coeff: sf_coeff, flight: 0.0, isDot: false, cost: 241, dur: 0, tick: 0 },
        Moonfire: { name: "Moonfire", id: "Moonfire", type: "Arcane", baseCast: 0, base: mf_d_base, coeff: mf_d_coeff, tickBase: mf_t_base, tickCoeff: mf_t_coeff, dur: durMF, tick: 3.0, flight: 0.0, isDot: true, cost: 266 },
        InsectSwarm: { name: "Insect Swarm", id: "InsectSwarm", type: "Nature", baseCast: 0, base: 0, coeff: 0, tickBase: is_base, tickCoeff: is_coeff, dur: durIS, tick: 2.0, flight: 0.0, isDot: true, cost: 128 }
    };

    // 3. Kampf-Status & Stats (Nur für diesen EINEN Run)
    var State = { 
        t: 0.0, gcdEnd: 0.0, castEnd: 0.0, castStart: 0.0, casting: false, spellId: null, currentSpellId: null, lastCastId: "",
        neEnd: 0.0, aeEnd: 0.0, neCD: 0.0, aeCD: 0.0, 
        ng: false, boat: cfg.rota.startBoat, t38End: 0.0, t3End: 0.0, 
        fishingLastCast: "", activeMF: null, activeIS: null, 
        pendingImpacts: [], dotCounter: 0, 
        bindingEnd: 0.0, bindingCD: 0.0, reosEnd: 0.0, reosCD: 0.0, 
        toepEnd: 0.0, toepCD: 0.0, roopEnd: 0.0, roopCD: 0.0, 
        zhcEnd: 0.0, zhcCD: 0.0, zhcVal: 0, 
        scytheEnd: 0.0, scytheCD: 0.0,
        nobilityEnd: 0.0, thaneActive: false, sulfurasEnd: 0.0, chromieEnd: 0.0,
        makaruStacks: 0, enlightenedEnd: 0.0, sphereCD: 0.0, // NEU: Sphere of the Endless Gulch
        ooc: false, boon: 0, acidityEnd: 0.0, stagCritBonus: 0
    };

    var RunStats = { 
        totalDmg: 0, totalMana: 0, stepCounts: {},
        dmgIS: 0, dmgMFDirect: 0, dmgMFTick: 0, dmgWrath: 0, dmgStarfire: 0, 
        dmgT36p: 0, dmgIdol: 0, dmgT34p: 0, dmgScythe: 0, dmgSigil: 0,
        casts: 0, misses: 0, hits: 0, dmgCrit: 0,
        uptimeAE: 0, uptimeNE: 0, 
        spellStats: {
                "Starfire": { count: 0, timeSum: 0, hits: 0, crits: 0 },
                "Wrath": { count: 0, timeSum: 0, hits: 0, crits: 0 },
                "Moonfire": { count: 0, timeSum: 0, hits: 0, crits: 0 }, // Initial hit
                "InsectSwarm": { count: 0, timeSum: 0, hits: 0, crits: 0 }
        }
    };
    
    var RunLog = [];

    // 4. Internes RNG Objekt (Stochastisch)
    var RNG = {
        check: function (chance, id) {
            return rngHandler.check(chance);
        },
        checkHit: function (chance) {
            return rngHandler.checkFloat(chance);
        }
    };

    // 5. Helper Functions (Scope innerhalb runCoreSimulation)
    var isNE = function () { return State.t < State.neEnd; };
    var isAE = function () { return State.t < State.aeEnd; };
    
    var getCurrentSP = function (school) {
        var val = cfg.power.sp;
        if (school === "Nature") val += cfg.power.nat;
        if (school === "Arcane") val += cfg.power.arc;
        if (State.t < State.bindingEnd) val += 100;
        if (State.t < State.reosEnd) val += 130;
        if (State.t < State.toepEnd) val += 175;
        if (State.t < State.roopEnd) val += 55; 
        if (State.t < State.zhcEnd && State.zhcVal > 0) val += State.zhcVal;
        return val;
    };

    var log = function (time, evt, spell, res, dmg, castTime, info, mana) { 
        var eclStr = ""; if (isNE()) eclStr = "NAT"; if (isAE()) eclStr = "ARC"; 
        var dispSP = getCurrentSP("Arcane");

        // NEU: Aktuellen Haste-Wert zum Zeitpunkt des Events berechnen
        var currentHaste = cfg.stats.hasteFactor || 1.0;
        if (cfg.gear.t3_8p && time < State.t38End) currentHaste *= 1.10; 
        if (cfg.gear.scythe && time < State.scytheEnd) currentHaste *= 1.10;
        if (cfg.gear.sulfuras && time < State.sulfurasEnd) currentHaste *= 1.05;
        if (cfg.gear.chromie && time < State.chromieEnd) currentHaste *= 0.90;
        if (cfg.gear.sphere && time < State.enlightenedEnd) currentHaste *= 1.20;
        var hasteStr = ((currentHaste - 1) * 100).toFixed(1) + "%";
        
        RunLog.push({ 
            t: time.toFixed(2), evt: evt, spell: spell, res: res, 
            dmgNorm: dmg ? dmg.norm : 0, dmgEcl: dmg ? dmg.ecl : 0, dmgCrit: dmg ? dmg.crit : 0, 
            castTime: castTime ? castTime + "s" : "-", 
            ecl: eclStr, 
            boat: State.boat, ng: (State.ng ? "YES" : "-"), 
            ooc: (State.ooc ? "YES" : "-"), boon: (State.boon > 0 ? State.boon : "-"), 
            sp: dispSP, haste: hasteStr, mana: (mana !== undefined ? mana : "-"), 
            info: info || "", 
            mfRem: cfg.enemy.extMF ? "EXT" : ((State.activeMF && State.activeMF.exp > time) ? (State.activeMF.exp - time).toFixed(1) : "-"),
            isRem: cfg.enemy.extIS ? "EXT" : ((State.activeIS && State.activeIS.exp > time) ? (State.activeIS.exp - time).toFixed(1) : "-"),
            t36: (State.t3End > time) ? (State.t3End - time).toFixed(1) : "-",
            t38: (State.t38End > time) ? (State.t38End - time).toFixed(1) : "-",
            bBind: (State.bindingEnd > time) ? (State.bindingEnd - time).toFixed(1) : "-",
            bReos: (State.reosEnd > time) ? (State.reosEnd - time).toFixed(1) : "-",
            bToep: (State.toepEnd > time) ? (State.toepEnd - time).toFixed(1) : "-",
            bRoop: (State.roopEnd > time) ? (State.roopEnd - time).toFixed(1) : "-",
            bZhc: (State.zhcEnd > time) ? (State.zhcVal) : "-",
            isAE: isAE(), isNE: isNE(),
            stag: State.stagCritBonus 
        }); 
    };

    var addEvt = function (time, type, data) { 
        if (isNaN(time)) time = State.t; 
        State.pendingImpacts.push({ t: time, type: type, data: data }); 
        State.pendingImpacts.sort(function (a, b) { return a.t - b.t; }); 
    };

    var cancelCurrentCast = function () { 
        var idx = State.pendingImpacts.findIndex(function (e) { return e.type === "CAST_FINISH"; }); 
        if (idx > -1) { 
            State.pendingImpacts.splice(idx, 1); 
            State.casting = false; 
            State.currentSpellId = null; 
            State.castEnd = State.t + cfg.avcd;
            State.gcdEnd = State.t + cfg.avcd;
            log(State.t, "INTERRUPT", "Cancel", "-", null, null, "Wrong Eclipse");
        } 
    };

    var getResist = function (school) { 
        var currentAvgMitNat = (State.t < State.acidityEnd) ? avgMitNatAcidity : avgMitNat;
        var avgMit = (school === "Nature") ? currentAvgMitNat : avgMitArc; 
        
        // Resist Logic
        var range = avgMit / 0.25; 
        var bucket = Math.floor(range); 
        var remainder = range - bucket; 
        if (rngHandler.checkFloat(remainder)) bucket++; 
        if (bucket > 3) bucket = 3; 
        
        var resistPct = bucket * 0.25; 
        var dmgFactor = 1.0 - resistPct; 
        var txt = (resistPct > 0) ? "Part " + (resistPct * 100).toFixed(0) + "%" : ""; 
        return { val: dmgFactor, txt: txt }; 
    };

    var triggerTrinket = function(trinketKey, stepId) {
        var used = false;
        if (trinketKey === "reos" && State.t >= State.reosCD) { State.reosEnd = State.t + 20.0; State.reosCD = State.t + 120.0; log(State.t, "USE", "Essence of Sapphiron", "", null, null, "+130 SP"); used = true; }
        else if (trinketKey === "toep" && State.t >= State.toepCD) { State.toepEnd = State.t + 15.0; State.toepCD = State.t + 90.0; log(State.t, "USE", "Talisman (ToEP)", "", null, null, "+175 SP"); used = true; }
        else if (trinketKey === "roop" && State.t >= State.roopCD) { State.roopEnd = State.t + 60.0; State.roopCD = State.t + 300.0; log(State.t, "USE", "Remains of Overwhelming Power", "", null, null, "+55 SP"); used = true; }
        else if (trinketKey === "zhc" && State.t >= State.zhcCD) { State.zhcEnd = State.t + 20.0; State.zhcCD = State.t + 120.0; State.zhcVal = 204; log(State.t, "USE", "Zandalarian Hero Charm", "", null, null, "+204 SP"); used = true; }
        else if (trinketKey === "scythe" && State.t >= State.scytheCD) { State.scytheEnd = State.t + 8.0; State.scytheCD = State.t + 600.0; log(State.t, "USE", "Scythe of Elune", "", null, null, "+10% Haste"); used = true; }
        
        if (used && stepId) RunStats.stepCounts[stepId] = (RunStats.stepCounts[stepId] || 0) + 1;
        return used;
    };

    var evaluateOp = function(left, op, right) {
        if(op === '>') return left > right;
        if(op === '<') return left < right;
        if(op === '>=') return left >= right;
        if(op === '<=') return left <= right;
        if(op === '==') return left == right;
        return false;
    };

    var checkCondition = function(step) {
        if (!step.conditions || step.conditions.length === 0) return true;
        for (var i = 0; i < step.conditions.length; i++) {
            var c = step.conditions[i];
            var left = 0;
            var right = parseFloat(c.val) || 0;
            var isValid = false;

            switch(c.type) {
                case 'debuff_rem':
                    if (c.target === 'Moonfire') left = cfg.enemy.extMF ? 999 : (State.activeMF && State.activeMF.exp > State.t ? State.activeMF.exp - State.t : 0);
                    if (c.target === 'Insect Swarm') left = cfg.enemy.extIS ? 999 : (State.activeIS && State.activeIS.exp > State.t ? State.activeIS.exp - State.t : 0);
                    isValid = evaluateOp(left, c.op, right);
                    break;
                case 'buff_rem':
                    if (c.target === 'Nature Eclipse') left = Math.max(0, State.neEnd - State.t);
                    if (c.target === 'Arcane Eclipse') left = Math.max(0, State.aeEnd - State.t);
                    if (c.target === 'Nature\'s Grace') left = State.ng ? 999 : 0;
                    isValid = evaluateOp(left, c.op, right);
                    break;
                case 'player_debuff_rem':
                    if (c.target === 'Arcane Solstice') left = Math.max(0, State.neCD - State.t);
                    if (c.target === 'Natural Solstice') left = Math.max(0, State.aeCD - State.t);
                    isValid = evaluateOp(left, c.op, right);
                    break;
                case 'time_elapsed':
                    left = State.t;
                    isValid = evaluateOp(left, c.op, right);
                    break;
                case 'time_remaining':
                    left = cfg.maxTime - State.t;
                    if (left < 5) {
                        var test;
                        test = 1;
                    }
                        
                    isValid = evaluateOp(left, c.op, right);
                    break;
                case 'ecl_vs_cast':
                    if (!Spells[c.target]) { isValid = false; break; }
                    var castT = getCastTime(c.target, Spells[c.target].baseCast);
                    var eclRem = (c.target === 'Starfire') ? Math.max(0, State.aeEnd - State.t) : Math.max(0, State.neEnd - State.t);
                    var isGreater = eclRem > castT;
                    // Prüft, ob das Ergebnis mit der Erwartung (True/False) aus der UI übereinstimmt
                    isValid = (c.bool === "false") ? !isGreater : isGreater;
                    break;
                case 'last_cast':
                    isValid = (State.lastCastId === c.target);
                    break;
                default:
                    isValid = true;
            }
            if (!isValid) return false;
        }
        return true;
    };

    var getCastTime = function (spellId, baseCast) { 
        var base = baseCast; 
        if (State.ng && (spellId === "Wrath" || spellId === "Starfire")) base -= 0.5; 
        if (spellId === "Starfire") { 
            if (cfg.gear.idolEoF) base -= 0.2;
        } 
        if (base < 0) base = 0;
        var hasteFactor = cfg.stats.hasteFactor; // Nutzt jetzt den echten multiplikativen Wert aus dem UI/Gear
        if (cfg.gear.t3_8p && State.t < State.t38End) hasteFactor *= 1.10;
        // NEU: Scythe of Elune Haste Buff
        if (cfg.gear.scythe && State.t < State.scytheEnd) hasteFactor *= 1.10;
        if (cfg.gear.sulfuras && State.t < State.sulfurasEnd) hasteFactor *= 1.05;
        if (cfg.gear.chromie && State.t < State.chromieEnd) hasteFactor *= 0.90; // Chromie reduziert Haste um 10%
        if (cfg.gear.sphere && State.t < State.enlightenedEnd) hasteFactor *= 1.20; // Sphere of the Endless Gulch (+20% Haste)
        return Math.max(0, base / hasteFactor);
    };

    // Calculate Damage
    var calculateDamageFull = function (spell, isTick, forceSnap, isCrit, resistData) { 
        var useEcl = (forceSnap !== undefined) ? forceSnap : ((spell.type === "Nature" && isNE()) || (spell.type === "Arcane" && isAE())); 
        var currentSP = getCurrentSP(spell.type); 
        
        // Base Damage calculation with variability
        var baseDmg = spell.base;
        if (!isTick && spell.min !== undefined && spell.max !== undefined) {
            // Stochastic mode: Roll between min and max
            baseDmg = spell.min + (rngHandler.rand() * (spell.max - spell.min));
        }

        var baseRaw = (isTick) ? (spell.tickBase + spell.tickCoeff * currentSP) : (baseDmg + spell.coeff * currentSP);
        
        // --- MOONFURY 1.18.1c ---
        var baseMoonfury = 0.12;
        var diff = 0.02; // difference to 0.10 for calculations

        var baseClassMod = baseMoonfury; 
        // Add diff to existing hardcoded overrides to maintain relation
        if (spell.id === "InsectSwarm") baseClassMod = 0.25 + diff; 
        if (spell.id === "Moonfire" && !isTick) baseClassMod = 0.20 + diff; 
        if (spell.id === "Moonfire" && isTick) baseClassMod = 0.35 + diff;
        
        var currentEclMod = useEcl ? eclFactor : 0; 
        var idolMod = 0; 
        if (spell.id === "Moonfire" && cfg.gear.idolMoon) idolMod = 0.17; 
        //if (spell.id === "InsectSwarm" && cfg.gear.idolProp) idolMod = 0.17; 
        
        var t3Mod = 0; 
        var hasT3 = false; 
        if (cfg.gear.t3_6p && State.t < State.t3End) { t3Mod = 0.03; hasT3 = true; } 
        
        var classMult = 1.0 + baseClassMod + currentEclMod + idolMod + t3Mod; 
        var debuffMult = 1.0; 
        if (spell.type === "Arcane") debuffMult = 1.0 * cosMod; 
        
        if (resistData) debuffMult *= resistData.val; 
        
        var finalDmg = baseRaw * classMult * debuffMult; 
        var critBonus = isCrit ? finalDmg : 0; 
        var total = finalDmg + critBonus; 
        
        // Log Split (Normal vs Ecl vs Crit)
        var classMultNoEcl = 1.0 + baseClassMod + idolMod + t3Mod; 
        var ratio = classMultNoEcl / classMult; 
        var logNorm = total * ratio; 
        var logCrit = 0; 
        var logEcl = 0;

        if (isCrit) { 
            logCrit = total / 2; 
            var basePart = logCrit; 
            logNorm = basePart * ratio; 
            logEcl = basePart - logNorm; 
        } else { 
            logCrit = 0; 
            logNorm = total * ratio; 
            logEcl = total - logNorm; 
        }
        
        var t3Part = 0; 
        if (hasT3) { 
            var modWithout = classMult - 0.03; 
            var ratioT3 = modWithout / classMult; 
            t3Part = total - (total * ratioT3); 
        } 
        
        return { total: total, norm: logNorm, ecl: logEcl, crit: logCrit, t3Part: t3Part }; 
    };

    var performCast = function (spell) { 
        var ct = getCastTime(spell.id, spell.baseCast); 
        State.casting = true; 
        State.castStart = State.t;
        State.castEnd = State.t + ct + cfg.avcd; 
        State.gcdEnd = State.t + 1.5 + cfg.avcd; 
        if (spell.id === "Wrath") State.gcdEnd = State.t + 1 + cfg.avcd; 
        var cost = spell.cost; 
        var note = ""; 
        if (State.ooc) { cost = 0; State.ooc = false; note = "OoC"; } 
        RunStats.totalMana += cost;

        // 1.18.1c BoaT: Wrath returns Mana if IS is up (Self or External)
        var isISActive = (State.activeIS && State.activeIS.exp > State.t) || cfg.enemy.extIS;
        if (spell.id === "Wrath" && isISActive) {
            var boatManaFactor = 0.30; // 30% Base (3/3 Talents)
            if (cfg.gear.t35_5p) boatManaFactor *= 1.5; // T3.5 Bonus -> 45%
            var returnAmt = cost * boatManaFactor; 
            RunStats.totalMana -= returnAmt;
            note += (note ? " / " : "") + "BoaT: +" + Math.floor(returnAmt) + " Mana";
        }

        State.currentSpellId = spell.id; 
        State.lastCastId = spell.id; 
        RunStats.casts++; 
        if(spell.stepId) RunStats.stepCounts[spell.stepId] = (RunStats.stepCounts[spell.stepId] || 0) + 1;
        log(State.t, "CAST_START", spell.name, "-", null, ct.toFixed(2), note, cost); 
        if (State.ng && (spell.id === "Wrath" || spell.id === "Starfire")) State.ng = false; 
        if (spell.id === "Wrath" || spell.id === "Starfire") State.fishingLastCast = spell.id;
        
        // FIX: Variable definieren
        var eclActive = ((spell.type === "Nature" && isNE()) || (spell.type === "Arcane" && isAE()));

        // FIX: 'ct' statt 'castTime' nutzen
        addEvt(State.t + ct, "CAST_FINISH", { spell: spell, snap: eclActive, castTime: ct }); 
    };

    var handleCastFinish = function (data) {
        var spell = data.spell;
        State.casting = false; 
        State.currentSpellId = null;

        if (RunStats.spellStats[spell.id]) {
            RunStats.spellStats[spell.id].count++;
            if (data.castTime) RunStats.spellStats[spell.id].timeSum += data.castTime;
        }

        // ZHC Logic
        if (State.t < State.zhcEnd && State.zhcVal > 0) {
            State.zhcVal -= 17;
            if (State.zhcVal < 0) State.zhcVal = 0;
        }

        if (!RNG.checkHit(cfg.stats.hit)) { 
            if (State.thaneActive) State.thaneActive = false;
            RunStats.misses++; 
            log(State.t, "MISS", spell.name, "Miss", null, null, "-"); 
            return; 
        }
        
        RunStats.hits++; 
        
        // CRIT CHECK
        var finalCritChance = cfg.stats.crit;
        // 1.18.1c BoaT: Starfire Crit if MF is up (Self or External)
        var isMFActive = (State.activeMF && State.activeMF.exp > State.t) || cfg.enemy.extMF;
        if (spell.id === "Starfire" && isMFActive) {
            var boatCritBonus = 9.0;
            if (cfg.gear.t35_5p) boatCritBonus *= 1.5; // T3.5 Bonus -> 13.5%
            finalCritChance += boatCritBonus;
        }

        if (cfg.gear.nobility && State.t < State.nobilityEnd) {
            finalCritChance += 2.5; // 150 Int = 2.5% Crit
        }

        if (cfg.gear.kelp && (spell.id === "Wrath" || spell.id === "Starfire")) {
            finalCritChance += 2.0;
        }

        if (cfg.gear.stag_5p) {
            finalCritChance += State.stagCritBonus;
        }

        var isCrit = RNG.check(finalCritChance, "crit");

        // Stag Bonus Update: Reset bei Crit, Stack bei Non-Crit (nur direkter Schaden)
        if (cfg.gear.stag_5p) {
            if (isCrit) {
                State.stagCritBonus = 0;
            } else if (spell.base > 0) { // spell.base > 0 bedeutet: es ist direkter Schaden
                State.stagCritBonus += 2.0;
            }
        }

        var eclActive = ((spell.type === "Nature" && isNE()) || (spell.type === "Arcane" && isAE())); 
        
        if (spell.isDot) { 
            State.dotCounter++; 
            var dot = { id: State.dotCounter, spell: spell, next: State.t + spell.tick, exp: State.t + spell.dur, snap: eclActive, tickCount: 0 }; 
            
            if (spell.id === "Moonfire") {
                State.activeMF = dot; 
            } else {
                State.activeIS = dot; 
                
                // NEU: Idol of Propagation Proc
                if (spell.id === "InsectSwarm" && cfg.gear.idolProp) {
                    // Refresh logic: Alte Ticks entfernen, falls IS erneuert wird
                    State.pendingImpacts = State.pendingImpacts.filter(function(e) { return e.type !== "PROPAGATION_TICK"; });
                    log(State.t, "PROC", "Idol of Prop.", "Fungus", null, null, "120 Nat Dmg over 12s");
                    
                    // 12 Ticks á 10 Schaden (1 pro Sekunde)
                    for (var p = 1; p <= 12; p++) {
                        addEvt(State.t + p, "PROPAGATION_TICK", { dmg: 10 });
                    }
                }
            }
            
            addEvt(dot.next, "DOT_TICK", { spellId: spell.id, dotId: dot.id }); 
            if (spell.base > 0) handleImpact(spell, isCrit, eclActive); 
        } else {
            addEvt(State.t + spell.flight, "IMPACT", { spell: spell, crit: isCrit, snap: eclActive }); 
        }
    };

    var handleImpact = function (spell, crit, snap) { 
        var resData; 
        if (cfg.mode === "D_AVG") resData = { val: 1.0, txt: "" }; 
        else resData = getResist(spell.type); 
        
        var d = calculateDamageFull(spell, false, snap, crit, resData); 

        if (State.thaneActive) {
            State.thaneActive = false;
            d.total += 48;
            d.norm += 48; // Dem flachen Schaden zugerechnet
        }
        
        if (RunStats.spellStats[spell.id]) {
            RunStats.spellStats[spell.id].hits++;
            if (crit) RunStats.spellStats[spell.id].crits++;
        }

        RunStats.totalDmg += d.total;

        RunStats.dmgT36p += d.t3Part; 
        if (d.crit > 0) RunStats.dmgCrit += d.crit;
        if (spell.id === "Wrath") RunStats.dmgWrath += d.total; 
        if (spell.id === "Starfire") RunStats.dmgStarfire += d.total; 
        if (spell.id === "Moonfire") RunStats.dmgMFDirect += d.total; 
        
        if (cfg.talents.ooc && RNG.check(5, "ooc")) { State.ooc = true; log(State.t, "PROC", "Omen of Clarity", "", null, null, "Clearcast"); } 
        if (spell.id === "Moonfire" && cfg.talents.boon && RNG.check(30, "boon")) { if (State.boon < 3) State.boon++; } 
        if (spell.id === "Moonfire" && cfg.gear.idolMoonfang) { RunStats.totalMana -= 50; log(State.t, "PROC", "Moonfang", "", null, null, "Restore 50", "-50"); } 
        
        if (cfg.gear.binding && State.t >= State.bindingCD && RNG.check(5, "binding")) { 
            State.bindingEnd = State.t + 5.0; 
            State.bindingCD = State.t + 15.0; 
            log(State.t, "PROC", "Binding", "", null, null, "+100 SP"); 
        } 
        
        if (cfg.gear.scythe && RNG.check(5, "scythe")) { 
            var baseScythe = 375 + rngHandler.rand() * (500 - 375); 
            if (cfg.mode !== "S") baseScythe = 437.5; 
            var scytheDmg = baseScythe * cosMod; 
            RunStats.totalDmg += scytheDmg; 
            RunStats.dmgScythe += scytheDmg; 
            log(State.t, "PROC DMG", "Scythe of Elune", "Hit", { norm: scytheDmg, ecl: 0, crit: 0, total: scytheDmg }, null, "Arcane Dmg"); 
        }

        if (cfg.gear.nobility && RNG.check(10, "procNobility")) {
            State.nobilityEnd = State.t + 6.0;
            log(State.t, "PROC", "Highborne Insight", "", null, null, "+150 Int");
        }
        if (cfg.gear.sulfuras && RNG.check(8, "procSulfuras")) {
            State.sulfurasEnd = State.t + 6.0;
            log(State.t, "PROC", "Band of Sulfuras", "", null, null, "+5% Haste");
        }
        if (cfg.gear.sigil && RNG.check(8, "procSigil")) {
            var sigilDmg = 400 * cosMod;
            RunStats.totalDmg += sigilDmg;
            RunStats.dmgSigil += sigilDmg;
            log(State.t, "PROC DMG", "Sigil of Accord", "Hit", { norm: sigilDmg, ecl: 0, crit: 0, total: sigilDmg }, null, "Arcane Dmg");
        }
        if (cfg.gear.chromie && RNG.check(10, "procChromie")) {
            State.chromieEnd = State.t + 15.0;
            log(State.t, "PROC", "Pocket Watch", "", null, null, "-10% Haste");
        }
        
        // Sphere of the Endless Gulch
        if (cfg.gear.sphere && State.t >= State.sphereCD &&  State.t >= State.enlightenedEnd && RNG.check(20, "procSphere")) {
            State.sphereCD = State.t + 3.0; // Interner Cooldown von 3 Sekunden
            State.makaruStacks++;
            if (State.makaruStacks >= 20) {
                State.makaruStacks = 0;
                State.enlightenedEnd = State.t + 12.0;
                log(State.t, "PROC", "Endless Gulch", "", null, null, "20 Stacks -> +20% Haste (12s)");
            } else {
                log(State.t, "PROC", "Endless Gulch", "", null, null, "Stack " + State.makaruStacks);
            }
        }

        // Idol of Acidity Proc
        if (spell.id === "Wrath" && cfg.gear.idolAcidity && RNG.check(8, "procAcidity")) {
            State.acidityEnd = State.t + 6.0;
            
            // Schaden berechnen (Snapshotting der aktuellen Nature SP inklusive temporärer Buffs)
            var currentNatSP = getCurrentSP("Nature");
            var totalAcidityDmg = 300 + (0.055 * currentNatSP);
            var tickAcidityDmg = totalAcidityDmg / 3;
            
            // Bisherige ausstehende Ticks entfernen, damit der DoT nicht stackt (Refresh-Logik)
            State.pendingImpacts = State.pendingImpacts.filter(function(e) { return e.type !== "ACIDITY_TICK"; });
            
            log(State.t, "PROC", "Idol of Acidity", "Refresh", null, null, "-25 Nat Res & " + Math.floor(totalAcidityDmg) + " Dmg over 6s");
            addEvt(State.t + 2.0, "ACIDITY_TICK", { dmg: tickAcidityDmg });
            addEvt(State.t + 4.0, "ACIDITY_TICK", { dmg: tickAcidityDmg });
            addEvt(State.t + 6.0, "ACIDITY_TICK", { dmg: tickAcidityDmg });
        }

        // Idol of Equilibrium Proc - Wrath -> Insect Swarm
        if (spell.id === "Wrath" && cfg.gear.idolEquilibrium && State.activeIS && State.activeIS.exp > State.t && RNG.check(8, "procEquilWrath")) {
            var dot = State.activeIS;
            var dIS = calculateDamageFull(dot.spell, true, dot.snap, false, null);
            RunStats.totalDmg += dIS.total;
            RunStats.dmgT36p += dIS.t3Part;
            RunStats.dmgIS += dIS.total;
            RunStats.dmgIdol += dIS.total;
            if (cfg.gear.t3_6p && RNG.check(8, "procT36p")) { 
                State.t3End = State.t + 6.0; 
                log(State.t, "PROC", "Dreamwalker (6p)", "", null, null, "8% on Tick (Equil)"); 
            }
            log(State.t, "PROC DMG", "Idol of Equil.", "Tick (IS)", dIS, null, "Extra IS Tick");
        }

        // Idol of Equilibrium Proc - Starfire -> Moonfire
        if (spell.id === "Starfire" && cfg.gear.idolEquilibrium && State.activeMF && State.activeMF.exp > State.t && RNG.check(15, "procEquilSF")) {
            var dot = State.activeMF;
            var dMF = calculateDamageFull(dot.spell, true, dot.snap, false, null);
            RunStats.totalDmg += dMF.total;
            RunStats.dmgT36p += dMF.t3Part;
            RunStats.dmgMFTick += dMF.total;
            RunStats.dmgIdol += dMF.total;
            if (cfg.gear.t3_6p && RNG.check(8, "procT36p")) { 
                State.t3End = State.t + 6.0; 
                log(State.t, "PROC", "Dreamwalker (6p)", "", null, null, "8% on Tick (Equil)"); 
            }
            log(State.t, "PROC DMG", "Idol of Equil.", "Tick (MF)", dMF, null, "Extra MF Tick");
        }

        // Idol of Equilibrium (v2 Krokat) Proc - Wrath -> Insect Swarm
        if (spell.id === "Wrath" && cfg.gear.idolEquilibriumV2 && State.activeIS && State.activeIS.exp > State.t && RNG.check(25, "procEquilV2Wrath")) {
            State.activeIS.exp = State.t + State.activeIS.spell.dur;
            log(State.t, "PROC", "Idol of Equil. v2", "Refresh (IS)", null, null, "IS Duration Refreshed");
        }

        // Idol of Equilibrium (v2 Krokat) Proc - Starfire -> Moonfire
        if (spell.id === "Starfire" && cfg.gear.idolEquilibriumV2 && State.activeMF && State.activeMF.exp > State.t && RNG.check(50, "procEquilV2SF")) {
            State.activeMF.exp = State.t + State.activeMF.spell.dur;
            log(State.t, "PROC", "Idol of Equil. v2", "Refresh (MF)", null, null, "MF Duration Refreshed");
        }

        // Idol of Equilibrium (v2 Krokat) Proc - Wrath -> Insect Swarm
        if (spell.id === "Wrath" && cfg.gear.idolEquilibriumV3 && State.activeIS && State.activeIS.exp > State.t ) {
            State.activeIS.exp = State.t + State.activeIS.spell.dur;
            log(State.t, "PROC", "Idol of Equil. v3", "Refresh (IS)", null, null, "IS Duration Refreshed");
        }

        // Idol of Equilibrium (v2 Krokat) Proc - Starfire -> Moonfire
        if (spell.id === "Starfire" && cfg.gear.idolEquilibriumV3 && State.activeMF && State.activeMF.exp > State.t) {
            State.activeMF.exp = State.t + State.activeMF.spell.dur;
            log(State.t, "PROC", "Idol of Equil. v3", "Refresh (MF)", null, null, "MF Duration Refreshed");
        }
        
        if (crit) {
            State.ng = true; 
            if (cfg.gear.thane) State.thaneActive = true;
            log(State.t, "PROC", "Nature's Grace", "", null, null, "Crit -> NG"); 
        }
        
        var triggeredEclipse = false; 
        var canProc = true; 
        if (cfg.talents.onCrit && !crit) canProc = false; 
        
        if (canProc) { 
            // Helper für Interrupt-Entscheidung
            var canInterrupt = true;
            if (State.casting) {
                var totalDur = State.castEnd - State.castStart;
                var elapsed = State.t - State.castStart;
                var pct = 0;
                if (totalDur > 0) pct = (elapsed / totalDur) * 100;
                // Wenn Fortschritt größer als Schwelle -> Nicht abbrechen
                if (pct > cfg.rota.interruptThresh) canInterrupt = false;
            }

            if (spell.id === "Starfire" && !isAE() && State.t >= State.neCD && RNG.check(cfg.talents.nEProc, "procNE")) { 
                State.neEnd = State.t + cfg.talents.neDuration; 
                State.neCD = State.t + cfg.talents.neICD; 
                triggeredEclipse = true; 
                log(State.t, "PROC", "Nature Eclipse", "Proc", null, null, "SF -> NE"); 
                // Check mit canInterrupt
                if (cfg.rota.spellInterrupt && canInterrupt && State.casting && (State.currentSpellId === "Starfire" || State.currentSpellId === "Moonfire")) cancelCurrentCast(); 
            } 
            if (spell.id === "Wrath" && !isNE() && State.t >= State.aeCD && RNG.check(cfg.talents.aEProc, "procAE")) { 
                State.aeEnd = State.t + cfg.talents.aeDuration; 
                State.aeCD = State.t + cfg.talents.aeICD; 
                triggeredEclipse = true; 
                log(State.t, "PROC", "Arcane Eclipse", "Proc", null, null, "Wrath -> AE"); 
                // Check mit canInterrupt
                if (cfg.rota.spellInterrupt && canInterrupt && State.casting && (State.currentSpellId === "Wrath" || State.currentSpellId === "InsectSwarm")) cancelCurrentCast(); 
            } 
        }
        
        if (triggeredEclipse) { 
            if (cfg.gear.t3_8p) State.t38End = State.t + 8.0; 
        } 
        
        var hitTxt = (cfg.mode === "D_AVG") ? "Hit" : (crit ? "CRIT" : "Hit"); 
        log(State.t, "IMPACT", spell.name, hitTxt, d, null, resData.txt); 
    };

    var handleTick = function (payload) { 
        var dot = (payload.spellId === "Moonfire") ? State.activeMF : State.activeIS; 
        if (!dot || payload.dotId !== dot.id || State.t > dot.exp + 0.01) return; 
        
        dot.tickCount++; 
        var d = calculateDamageFull(dot.spell, true, dot.snap, false, null); 
        RunStats.totalDmg += d.total; 
        RunStats.dmgT36p += d.t3Part; 
        
        if (cfg.gear.t3_4p && ((payload.spellId === "Moonfire" && dot.tickCount > 6) || (payload.spellId === "InsectSwarm" && dot.tickCount > 9))) { 
            RunStats.dmgT34p += d.total; 
        } 
        
        if (payload.spellId === "InsectSwarm") RunStats.dmgIS += d.total; 
        if (payload.spellId === "Moonfire") RunStats.dmgMFTick += d.total; 
        
        if (cfg.gear.t3_6p && RNG.check(8, "procT36p")) {
            State.t3End = State.t + 6.0; 
            log(State.t, "PROC", "Dreamwalker (6p)", "", null, null, "8% on Tick"); 
        } 
        
        log(State.t, "TICK", dot.spell.name, "Tick", d, null, (dot.snap ? "Snap:ECL" : "Norm")); 
        
        if (State.t + dot.spell.tick <= dot.exp + 0.01) addEvt(State.t + dot.spell.tick, "DOT_TICK", { spellId: dot.spell.id, dotId: dot.id }); 
        else { 
            if (payload.spellId === "Moonfire") State.activeMF = null; 
            else State.activeIS = null; 
        } 
    };

    // 6. Main Loop
    // ===========================================
    var decideSpell = function () {
        if (!cfg.custom_rotation || !cfg.custom_rotation.steps) return null;

        var timeRemaining = cfg.maxTime - State.t;
        var allowDots = timeRemaining > cfg.rota.dotCutoff;

        for (var i = 0; i < cfg.custom_rotation.steps.length; i++) {
            var step = cfg.custom_rotation.steps[i];
            if (step.disabled) continue;

            if (!checkCondition(step)) continue;

            // Off-GCD / Items Evaluierung
            if (step.skill === "Trinket1" || step.skill === "Trinket2") {
                var availTrinkets = [];
                if (cfg.gear.reos) availTrinkets.push("reos");
                if (cfg.gear.toep) availTrinkets.push("toep");
                if (cfg.gear.roop) availTrinkets.push("roop");
                if (cfg.gear.zhc) availTrinkets.push("zhc");
                if (cfg.gear.scythe) availTrinkets.push("scythe"); 

                var idx = step.skill === "Trinket1" ? 0 : 1;
                if (availTrinkets[idx]) {
                    triggerTrinket(availTrinkets[idx], step.id);
                }
                // Trinkets triggern sofort und verbrauchen keinen GCD. Wir suchen weiter.
                continue; 
            }

            // GCD / Spell Evaluierung
            if (Spells[step.skill]) {
                var spell = Spells[step.skill];
                if (spell.isDot && !allowDots) continue; // Cutoff ignorieren? Dann suche den nächsten Schritt
                
                spell.stepId = step.id; // Speichert die ID für den Counter
                return spell; // Wir haben unseren Spell gefunden -> Abbruch der Prio-Liste
            }
        }
        return null; // Fallback, falls die Prio-Liste leerläuft
    };

    // The Time Loop
    var loopGuard = 0;
    while (State.t < cfg.maxTime && loopGuard < 50000) {
        loopGuard++;
        while (State.pendingImpacts.length > 0 && State.pendingImpacts[0].t <= State.t + 0.001) {
            var evt = State.pendingImpacts.shift();
            //if (evt.type === "CAST_FINISH") handleCastFinish(evt.data.spell);
            if (evt.type === "CAST_FINISH") handleCastFinish(evt.data);
            else if (evt.type === "IMPACT") handleImpact(evt.data.spell, evt.data.crit, evt.data.snap);
            else if (evt.type === "DOT_TICK") handleTick(evt.data);
            else if (evt.type === "ACIDITY_TICK") {
                var tickDmg = evt.data.dmg;
                RunStats.totalDmg += tickDmg;
                RunStats.dmgIdol += tickDmg;
                log(State.t, "TICK", "Idol of Acidity", "Tick", {norm: tickDmg, ecl: 0, crit: 0, total: tickDmg}, null, "Nature Dmg");
            }
            else if (evt.type === "PROPAGATION_TICK") {
                var pDmg = evt.data.dmg;
                RunStats.totalDmg += pDmg;
                RunStats.dmgIdol += pDmg;
                log(State.t, "TICK", "Idol of Prop.", "Tick", {norm: pDmg, ecl: 0, crit: 0, total: pDmg}, null, "Nature Dmg");
            }
        }
        var gcdReady = State.t >= (State.gcdEnd - 0.001) && State.t >= (State.castEnd - 0.001);
        if (!State.casting && gcdReady && State.t < cfg.maxTime) {
            var spell = decideSpell();
            if (spell) performCast(spell);
            else { State.t += 0.1; }
        } else {
            var nextEvt = (State.pendingImpacts.length > 0) ? State.pendingImpacts[0].t : 99999;
            var playerReady = (State.gcdEnd > State.castEnd) ? State.gcdEnd : State.castEnd;
            var nextAct = State.casting ? 99999 : (State.t < playerReady ? playerReady : State.t);
            var jump = Math.min(nextEvt, nextAct);
            if (jump > cfg.maxTime) jump = cfg.maxTime; if (jump >= 99990) break;
            var dt = jump - State.t;
            if (dt > 0) { if (isNE()) RunStats.uptimeNE += Math.min(dt, State.neEnd - State.t); if (isAE()) RunStats.uptimeAE += Math.min(dt, State.aeEnd - State.t); }
            if (jump <= State.t + 0.0001) {
                if (nextEvt <= State.t + 0.001) { jump = State.t; } else {
                    var future = State.pendingImpacts.find(function (e) { return e.t > State.t + 0.001; });
                    var safeJump = Math.min(future ? future.t : 99999, (playerReady > State.t + 0.001) ? playerReady : 99999);
                    jump = (safeJump >= 99990) ? State.t + 0.1 : safeJump;
                }
            }
            State.t = jump;
        }
    }

    // 7. Return Result
    return {
        stats: RunStats,
        totalDmg: RunStats.totalDmg,
        log: RunLog
    };
}


// ============================================================================
// HELPER: RESULT AGGREGATION & RNG
// ============================================================================

function aggregateResults(results, cfg) {
    if (!results || results.length === 0) return null;
    
    var n = results.length;
    var totalDmg = 0;
    
    var dpsDistribution = [];
    
    // Pass 1: Alle Werte sammeln für Verteilung und Durchschnitt (für den Variationskoeffizienten)
    for (var i = 0; i < n; i++) {
        var r = results[i];
        var d = r.totalDmg; 
        var currentDPS = d / cfg.maxTime;
        
        dpsDistribution.push(currentDPS);
        totalDmg += d;
    }

    var avgDpsVal = (totalDmg / n) / cfg.maxTime;

    // Pass 2: Standard Error und Varianz (CV) berechnen
    var sumSqDiff = 0;
    for (var j = 0; j < n; j++) {
        var dps = dpsDistribution[j];
        var diff = dps - avgDpsVal;
        sumSqDiff += (diff * diff);
    }
    var variance = (n > 1) ? sumSqDiff / (n - 1) : 0;
    var stdDev = Math.sqrt(variance);
    var stdErr = stdDev / Math.sqrt(n);
    var cv = (avgDpsVal > 0) ? (stdDev / avgDpsVal) * 100 : 0;

    // Pass 3: Sortieren für 5% / 50% (Median) / 95%
    var sortedResults = results.slice().sort(function(a, b) {
        return a.totalDmg - b.totalDmg;
    });

    // Indizes sicher berechnen
    var idxP5 = Math.floor(n * 0.05);
    var idxMedian = Math.floor(n * 0.50);
    var idxP95 = Math.floor(n * 0.95);

    // Bounds-Check für Sicherheit
    if (idxP5 >= n) idxP5 = n - 1;
    if (idxMedian >= n) idxMedian = n - 1;
    if (idxP95 >= n) idxP95 = n - 1;

    var p5Run = sortedResults[idxP5];
    var medianRun = sortedResults[idxMedian];
    var p95Run = sortedResults[idxP95];

    return {
        median: { stats: medianRun.stats, dps: medianRun.totalDmg / cfg.maxTime, dpsSE: stdErr, log: medianRun.log },
        p5: { stats: p5Run.stats, dps: p5Run.totalDmg / cfg.maxTime, log: p5Run.log },
        p95: { stats: p95Run.stats, dps: p95Run.totalDmg / cfg.maxTime, log: p95Run.log },
        seed: { stats: results[0].stats, dps: results[0].totalDmg / cfg.maxTime, log: results[0].log },
        dpsDistribution: dpsDistribution,
        varianceCV: cv
    };
}

// Seeded PRNG (Mulberry32)
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

function RNGHandler(seed) {
    if (seed !== undefined && seed !== null) {
        this.rand = mulberry32(seed);
    } else {
        this.rand = Math.random;
    }
}

RNGHandler.prototype.check = function(chance) {
    if (chance <= 0) return false;
    if (chance >= 100) return true;
    return (this.rand() * 100) < chance;
};

// Returns true based on 0-1 probability
RNGHandler.prototype.checkFloat = function(prob) {
    if (prob <= 0) return false;
    if (prob >= 1.0) return true;
    return this.rand() < prob;
};

// ============================================================================
// UI HOOK FOR ROTATION COUNTERS
// ============================================================================
function updateStepCounters() {
    if (!SIM_DATA || !SIM_DATA.median || !SIM_DATA.median.stats.stepCounts) return;
    
    var counts = SIM_DATA.median.stats.stepCounts;
    
    for (var stepId in counts) {
        var badge = document.getElementById("badge_step_" + stepId);
        if (badge) {
            var val = Math.round(counts[stepId]);
            badge.innerText = val + "x";
            
            // WICHTIG FÜR FERAL UI: Sichtbarkeit umschalten
            if (val > 0) {
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        }
    }
}
