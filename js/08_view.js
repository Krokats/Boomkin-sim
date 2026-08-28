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
        var dropletPct = data.stats.uptimeDroplet ? (data.stats.uptimeDroplet / maxT) * 100 : 0;
        var scythePct = data.stats.uptimeScythe ? (data.stats.uptimeScythe / maxT) * 100 : 0;
        var sulfurasPct = data.stats.uptimeSulfuras ? (data.stats.uptimeSulfuras / maxT) * 100 : 0;
        var spherePct = data.stats.uptimeSphere ? (data.stats.uptimeSphere / maxT) * 100 : 0;
        var chromiePct = data.stats.uptimeChromie ? (data.stats.uptimeChromie / maxT) * 100 : 0;
        var nobilityPct = data.stats.uptimeNobility ? (data.stats.uptimeNobility / maxT) * 100 : 0;
        var bindingPct = data.stats.uptimeBinding ? (data.stats.uptimeBinding / maxT) * 100 : 0;
        var acidityPct = data.stats.uptimeAcidity ? (data.stats.uptimeAcidity / maxT) * 100 : 0;

        var hasProcs = (data.stats.dmgT36p > 0 || data.stats.dmgIdol > 0 || data.stats.dmgT34p > 0 || data.stats.dmgScythe > 0 || data.stats.dmgSigil > 0 || dropletPct > 0 || scythePct > 0 || sulfurasPct > 0 || spherePct > 0 || chromiePct > 0 || nobilityPct > 0 || bindingPct > 0 || acidityPct > 0);
        if (hasProcs) {
            addStatRow("Procs & Bonuses", "", "", true);
            if (data.stats.dmgT36p > 0) addRow("Proc: T3 6p", data.stats.dmgT36p, data.stats.totalDmg);
            if (data.stats.dmgIdol > 0) addRow("Bonus: Idols", data.stats.dmgIdol, data.stats.totalDmg);
            if (data.stats.dmgT34p > 0) addRow("Bonus: T3 4p", data.stats.dmgT34p, data.stats.totalDmg);
            if (data.stats.dmgScythe > 0) addRow("Proc: Scythe", data.stats.dmgScythe, data.stats.totalDmg);
            if (data.stats.dmgSigil > 0) addRow("Proc: Sigil of Accord", data.stats.dmgSigil, data.stats.totalDmg);
            if (data.stats.dmgMarkali > 0) addRow("Proc: Mar'kali", data.stats.dmgMarkali, data.stats.totalDmg);
            
            if (dropletPct > 0) addStatRow("Buff: Nordrassil's Reprieve", dropletPct.toFixed(1) + "%", "Uptime");
            if (scythePct > 0) addStatRow("Buff: Scythe of Elune", scythePct.toFixed(1) + "%", "Uptime");
            if (sulfurasPct > 0) addStatRow("Buff: Band of Sulfuras", sulfurasPct.toFixed(1) + "%", "Uptime");
            if (spherePct > 0) addStatRow("Buff: Endless Gulch", spherePct.toFixed(1) + "%", "Uptime");
            if (chromiePct > 0) addStatRow("Debuff: Pocket Watch", chromiePct.toFixed(1) + "%", "Uptime");
            if (nobilityPct > 0) addStatRow("Buff: Highborne Insight", nobilityPct.toFixed(1) + "%", "Uptime");
            if (bindingPct > 0) addStatRow("Buff: Contained Magic", bindingPct.toFixed(1) + "%", "Uptime");
            if (acidityPct > 0) addStatRow("Debuff: Acidity", acidityPct.toFixed(1) + "%", "Uptime");
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
