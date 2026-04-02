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

