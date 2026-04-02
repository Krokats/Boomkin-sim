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
        gear: { t3_4p: getVal("t3_4p"), t3_6p: getVal("t3_6p"), t3_8p: getVal("t3_8p"), t35_3p: getVal("t35_3p"), t35_5p: getVal("t35_5p"), stag_5p: getVal("stag_5p"),
            idolEoF: getVal("idolEoF"), idolMoon: getVal("idolMoon"), idolProp: getVal("idolProp"), idolMoonfang: getVal("idolMoonfang"), 
            idolAcidity: getVal("idolAcidity"),idolEquilibrium: getVal("idolEquilibrium"),idolEquilibriumV2: getVal("idolEquilibriumV2"),idolEquilibriumV3: getVal("idolEquilibriumV3"),
            binding: getVal("item_binding"), scythe: getVal("item_scythe"), nobility: getVal("item_nobility"), thane: getVal("item_thane"), 
            sulfuras: getVal("item_sulfuras"), sigil: getVal("item_sigil"), chromie: getVal("item_chromie"), kelp: getVal("item_kelp"), sphere: getVal("item_sphere"),
            reos: getVal("item_reos"), toep: getVal("item_toep"), roop: getVal("item_roop"), zhc: getVal("item_zhc"), decay: getVal("item_decay") },
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