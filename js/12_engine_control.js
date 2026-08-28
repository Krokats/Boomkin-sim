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