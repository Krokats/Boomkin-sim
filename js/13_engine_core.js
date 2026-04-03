// ============================================================================
// MATH CORE (SINGLE RUN)
// ============================================================================

function runCoreSimulation(cfg) {
    // 1. RNG Setup
    var rngHandler = new RNGHandler(cfg.seed);

    // 2. Statische Werte vorbereiten
    var fortuneMult = 1.0 + ((cfg.stats.fortune || 0) / 100);

    // NEU: Level-Resistenz und durchdringbare Resistenz trennen
    var levelRes = Math.max(0, (cfg.enemy.level - 60) * 5);
    var baseResNat = Math.max(0, cfg.enemy.resNat - cfg.power.pen);
    var baseResArc = Math.max(0, cfg.enemy.resArc - cfg.power.pen);
    
    var effResNat = levelRes + baseResNat;
    var effResArc = levelRes + baseResArc;

    // NEU: Hilfsfunktion für die korrekte Mitigation (Softcap bei 2/3 des Hardcaps, max 69%)
    var calcMitigation = function(res, lvl) {
        var cap = lvl * 5;
        var softCap = cap * (2/3);
        if (res <= 0) return 0;
        if (res <= softCap) return (res / softCap) * 0.50;
        return Math.min(0.69, 0.50 + ((res - softCap) / (cap - softCap)) * 0.19);
    };

    var avgMitNat = calcMitigation(effResNat, cfg.enemy.level);
    var avgMitArc = calcMitigation(effResArc, cfg.enemy.level);
    
    // Idol of Acidity Mitigation (Pre-Calculated)
    var baseResNatAcidity = Math.max(0, cfg.enemy.resNat - cfg.power.pen - 25);
    var effResNatAcidity = levelRes + baseResNatAcidity;
    var avgMitNatAcidity = calcMitigation(effResNatAcidity, cfg.enemy.level);

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

    // NEU: Max Mana für diese Iteration berechnen
    var maxMana = 964 + (15 * (cfg.stats.int || 150));

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
        makaruStacks: 0, enlightenedEnd: 0.0, sphereCD: 0.0, decayCD: 0.0, dropletCD:0.0, markaliCD: 0.0,
        ooc: false, boon: 0, acidityEnd: 0.0, stagCritBonus: 0
    };

    var RunStats = { 
        totalDmg: 0, totalMana: 0, stepCounts: {},
        dmgIS: 0, dmgMFDirect: 0, dmgMFTick: 0, dmgWrath: 0, dmgStarfire: 0, 
        dmgT36p: 0, dmgIdol: 0, dmgT34p: 0, dmgScythe: 0, dmgSigil: 0, dmgDecay: 0, dmgMarkali: 0,
        casts: 0, misses: 0, hits: 0, dmgCrit: 0,
        uptimeAE: 0, uptimeNE: 0, uptimeDroplet: 0,
        uptimeScythe: 0, uptimeSulfuras: 0, uptimeSphere: 0, 
        uptimeChromie: 0, uptimeNobility: 0, uptimeBinding: 0, uptimeAcidity: 0,
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
        if (State.t < State.dropletEnd) val += 80;
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
        
        if (avgMit <= 0) return { val: 1.0, txt: "" };

        // Resist Logic: Standard-Classic-Dreiecksverteilung
        var probabilities = [0, 0, 0, 0];
        var roll = rngHandler.rand(); 
        var cumulative = 0;
        var selectedBucket = 0;

        // Wahrscheinlichkeiten für 0%, 25%, 50% und 75% Resist berechnen
        for (var i = 0; i <= 3; i++) {
            var bucketVal = i * 0.25;
            // Formel: P(x) = 50% - 250% * |x - avgMit|
            var prob = 0.5 - 2.5 * Math.abs(bucketVal - avgMit);
            if (prob > 0) {
                probabilities[i] = prob;
            }
        }

        // Normalisieren, um kleine Rundungsfehler abzufangen
        var sum = probabilities[0] + probabilities[1] + probabilities[2] + probabilities[3];
        
        for (var j = 0; j <= 3; j++) {
            if (probabilities[j] > 0) {
                cumulative += (probabilities[j] / sum);
                if (roll <= cumulative) {
                    selectedBucket = j;
                    break;
                }
            }
        }
        
        var resistPct = selectedBucket * 0.25; 
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

        var currentHitChance = cfg.stats.hit;
        if (State.t < State.dropletEnd) {
            currentHitChance = Math.min(0.99, currentHitChance + 0.03); // +3% Hit max 99%
        }

        if (!RNG.checkHit(cfg.stats.hit)) { 
            if (State.thaneActive) State.thaneActive = false;
            RunStats.misses++; 
            log(State.t, "MISS", spell.name, "Miss", null, null, "-"); 
            
            // Droplet Proc on Full Resist
            if (cfg.gear.droplet && State.t >= State.dropletCD) {
                State.dropletEnd = State.t + 10.0;
                State.dropletCD = State.t + 10.0;
                log(State.t, "PROC", "Nordrassil's Reprieve", "", null, null, "+80 SP, +3% Hit (Full Resist)");
            }
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

        // Droplet Proc on Partial Resist
        if (cfg.gear.droplet && resData.val < 1.0 && State.t >= State.dropletCD) {
            State.dropletEnd = State.t + 10.0;
            State.dropletCD = State.t + 10.0;
            log(State.t, "PROC", "Nordrassil's Reprieve", "", null, null, "+80 SP, +3% Hit (Partial Resist)");
        }

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
        
        // Mar'kali Proc
        if (cfg.gear.markali && State.t >= State.markaliCD && RNG.check(10 * fortuneMult, "procMarkali")) {
            State.markaliCD = State.t + 1.0;
            // 3% Max Mana, mitigiert durch Arcane Resist des Ziels (kein Crit, profitiert nicht von CoS)
            var markaliDmg = (maxMana * 0.03); //* avgMitArc; 
            RunStats.totalDmg += markaliDmg;
            RunStats.dmgMarkali += markaliDmg;
            log(State.t, "PROC DMG", "Mar'kali", "Hit", { norm: markaliDmg, ecl: 0, crit: 0, total: markaliDmg }, null, "Arcane Dmg (3% Mana)");
        }

        if (cfg.gear.binding && State.t >= State.bindingCD && RNG.check(5 * fortuneMult, "binding")) { 
            State.bindingEnd = State.t + 5.0; 
            State.bindingCD = State.t + 15.0; 
            log(State.t, "PROC", "Binding", "", null, null, "+100 SP"); 
        } 
        
        if (cfg.gear.scythe && RNG.check(5 * fortuneMult, "scythe")) { 
            var baseScythe = 375 + rngHandler.rand() * (500 - 375); 
            if (cfg.mode !== "S") baseScythe = 437.5; 
            var scytheDmg = baseScythe * cosMod; 
            RunStats.totalDmg += scytheDmg; 
            RunStats.dmgScythe += scytheDmg; 
            log(State.t, "PROC DMG", "Scythe of Elune", "Hit", { norm: scytheDmg, ecl: 0, crit: 0, total: scytheDmg }, null, "Arcane Dmg"); 
        }

        if (cfg.gear.nobility && RNG.check(10 * fortuneMult, "procNobility")) {
            State.nobilityEnd = State.t + 6.0;
            log(State.t, "PROC", "Highborne Insight", "", null, null, "+150 Int");
        }
        if (cfg.gear.sulfuras && RNG.check(8 * fortuneMult, "procSulfuras")) {
            State.sulfurasEnd = State.t + 6.0;
            log(State.t, "PROC", "Band of Sulfuras", "", null, null, "+5% Haste");
        }
        if (cfg.gear.sigil && RNG.check(8 * fortuneMult, "procSigil")) {
            var sigilDmg = 400 * cosMod;
            RunStats.totalDmg += sigilDmg;
            RunStats.dmgSigil += sigilDmg;
            log(State.t, "PROC DMG", "Sigil of Accord", "Hit", { norm: sigilDmg, ecl: 0, crit: 0, total: sigilDmg }, null, "Arcane Dmg");
        }
        if (cfg.gear.chromie && RNG.check(10 * fortuneMult, "procChromie")) {
            State.chromieEnd = State.t + 15.0;
            log(State.t, "PROC", "Pocket Watch", "", null, null, "-10% Haste");
        }
        
        // Sphere of the Endless Gulch
        if (cfg.gear.sphere && State.t >= State.sphereCD &&  State.t >= State.enlightenedEnd && RNG.check(20 * fortuneMult, "procSphere")) {
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
        if (spell.id === "Wrath" && cfg.gear.idolAcidity && RNG.check(8* fortuneMult, "procAcidity")) {
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
        if (spell.id === "Starfire" && cfg.gear.idolEquilibrium && State.activeMF && State.activeMF.exp > State.t && RNG.check(15* fortuneMult, "procEquilSF")) {
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
        if (spell.id === "Wrath" && cfg.gear.idolEquilibriumV2 && State.activeIS && State.activeIS.exp > State.t && RNG.check(25* fortuneMult, "procEquilV2Wrath")) {
            State.activeIS.exp = State.t + State.activeIS.spell.dur;
            log(State.t, "PROC", "Idol of Equil. v2", "Refresh (IS)", null, null, "IS Duration Refreshed");
        }

        // Idol of Equilibrium (v2 Krokat) Proc - Starfire -> Moonfire
        if (spell.id === "Starfire" && cfg.gear.idolEquilibriumV2 && State.activeMF && State.activeMF.exp > State.t && RNG.check(50* fortuneMult, "procEquilV2SF")) {
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

        // Heart of Decay Proc
        if (cfg.gear.decay && State.t >= State.decayCD && RNG.check(5* fortuneMult, "procDecay")) {
            State.decayCD = State.t + 5.0;
            var currentNatSP = getCurrentSP("Nature");
            var currentEclipseMod = isNE() ? (1.0 + eclFactor) : 1.0;
            var decayDmg = (180.0 + (0.041 * currentNatSP)) * currentEclipseMod;
            
            RunStats.totalDmg += decayDmg;
            RunStats.dmgDecay += decayDmg;
            
            log(State.t, "PROC DMG", "Heart of Decay", "Tick", {norm: decayDmg, ecl: 0, crit: 0, total: decayDmg}, null, "Nature Dmg");
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
            if (dt > 0) { 
                if (isNE()) RunStats.uptimeNE += Math.min(dt, State.neEnd - State.t); 
                if (isAE()) RunStats.uptimeAE += Math.min(dt, State.aeEnd - State.t); 
                if (State.t < State.dropletEnd) RunStats.uptimeDroplet += Math.min(dt, State.dropletEnd - State.t); 
                if (State.t < State.scytheEnd) RunStats.uptimeScythe += Math.min(dt, State.scytheEnd - State.t);
                if (State.t < State.sulfurasEnd) RunStats.uptimeSulfuras += Math.min(dt, State.sulfurasEnd - State.t);
                if (State.t < State.enlightenedEnd) RunStats.uptimeSphere += Math.min(dt, State.enlightenedEnd - State.t);
                if (State.t < State.chromieEnd) RunStats.uptimeChromie += Math.min(dt, State.chromieEnd - State.t);
                if (State.t < State.nobilityEnd) RunStats.uptimeNobility += Math.min(dt, State.nobilityEnd - State.t);
                if (State.t < State.bindingEnd) RunStats.uptimeBinding += Math.min(dt, State.bindingEnd - State.t);
                if (State.t < State.acidityEnd) RunStats.uptimeAcidity += Math.min(dt, State.acidityEnd - State.t);
            }
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

