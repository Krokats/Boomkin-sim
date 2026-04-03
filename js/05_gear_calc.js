function resetGear() { GEAR_SELECTION = {}; ENCHANT_SELECTION = {}; initGearPlannerUI(); }

function recalcItemScores() {
    if (!document.getElementById("itemSelectorModal").classList.contains("hidden")) {
        renderItemList(document.getElementById("itemSearchInput").value);
    }
    if (!document.getElementById("enchantSelectorModal").classList.contains("hidden")) {
        renderEnchantList();
    }
    initGearPlannerUI();
}

function calculateItemScore(item, slotNameOverride) {
    if (!item) return 0;
    // FORMULA: GS = SP + AP + NP + (Crit * CW) + (Hit * HW) + (Haste * HW) + Int/60 * CW

    var wHit = parseFloat(document.getElementById("weight_hit") ? document.getElementById("weight_hit").value : 16);
    var wCrit = parseFloat(document.getElementById("weight_crit") ? document.getElementById("weight_crit").value : 15);
    var wHaste = parseFloat(document.getElementById("weight_haste") ? document.getElementById("weight_haste").value : 11);
    var wSP = parseFloat(document.getElementById("weight_sp") ? document.getElementById("weight_sp").value : 1.0);

    var score = 0;
    var e = item.effects || {};

    // --- EFFECTIVE HIT CALCULATION ---
    var currentSlot = slotNameOverride || CURRENT_SELECTING_SLOT;
    var currentTotalHit = parseFloat(document.getElementById("statHit") ? document.getElementById("statHit").value : 0);
    
    function getHitContribution(testItem) {
        if (!testItem) return 0;
        var h = testItem.effects ? (testItem.effects.spellHit || 0) : 0;
        if (testItem.name === "Droplet of Nordrassil") h += (3.0 * 0.42);
        if (testItem.setName) {
            var otherSetItemsCount = 0;
            for (var slot in GEAR_SELECTION) {
                if (currentSlot && slot === currentSlot) continue;
                var id = GEAR_SELECTION[slot];
                if (id && typeof id === 'object' && id.id) id = id.id;
                if (!id || id == 0) continue;
                var equipped = ITEM_ID_MAP[id];
                if (equipped && equipped.setName === testItem.setName) {
                    otherSetItemsCount++;
                }
            }
            var newTotalCount = otherSetItemsCount + 1;
            if (testItem.setBonuses && !Array.isArray(testItem.setBonuses)) {
                for (var k in testItem.setBonuses) {
                    if (parseInt(k) === newTotalCount) {
                        h += (testItem.setBonuses[k].spellHit || 0);
                    }
                }
            }
        }
        return h;
    }

    var currentEquippedId = currentSlot ? GEAR_SELECTION[currentSlot] : 0;
    if (currentEquippedId && typeof currentEquippedId === 'object' && currentEquippedId.id) currentEquippedId = currentEquippedId.id;
    var equippedHitContribution = 0;
    if (currentEquippedId && currentEquippedId !== 0) {
        equippedHitContribution = getHitContribution(ITEM_ID_MAP[currentEquippedId]);
    }
    var baseHitWithoutSlot = currentTotalHit - equippedHitContribution;
    var newItemTotalHit = getHitContribution(item);
    var effectiveHit = Math.min(16, baseHitWithoutSlot + newItemTotalHit) - Math.min(16, baseHitWithoutSlot);
    // ---------------------------------

    // 1. BASE STATS
    // SP + AP/2 + NP/2
    var sp = (e.spellPower || 0);
    var ap = (e.arcaneSpellPower || 0);
    var np = (e.natureSpellPower || 0);
    score += (sp + ap / 2 + np / 2) * wSP;

    // Crit * CW
    score += (e.spellCrit || 0) * wCrit;

    // Haste * HW
    score += (e.spellHaste || 0) * wHaste;

    // Int / 60 * CW
    var intVal = item.intellect || 0;
    score += (intVal / 60) * wCrit;

    // --- ON-USE & PROC TRINKET LOGIC ---
    var fightLength = parseFloat(document.getElementById("maxTime") ? document.getElementById("maxTime").value : 120);
    if (fightLength <= 0) fightLength = 120; // Fallback

    var avgBonusSP = 0;
    var avgBonusHaste = 0; // NEU: Für Haste-Trinkets

    // Umbenannt zu getOnUseAvg, da wir damit nun auch Haste berechnen
    function getOnUseAvg(bonusVal, duration, cooldown) {
        var fullUses = Math.floor(fightLength / cooldown);
        var remainingTime = fightLength - (fullUses * cooldown);
        var activeTime = (fullUses * duration) + Math.min(remainingTime, duration);
        return (activeTime / fightLength) * bonusVal;
    }

    if (item.name === "The Restrained Essence of Sapphiron") avgBonusSP += getOnUseAvg(130, 20, 120);
    if (item.name === "Talisman of Ephemeral Power") avgBonusSP += getOnUseAvg(175, 15, 90);
    if (item.name === "Remains of Overwhelming Power") avgBonusSP += getOnUseAvg(55, 60, 300);
    if (item.name === "Zandalarian Hero Charm") avgBonusSP += getOnUseAvg(102, 20, 120);

    // Procs
    if (item.name === "Bindings of Contained Magic" || item.id === 23201) {
        avgBonusSP += 10; // 10% uptime of 100 SP proc, grobe Schätzung basierend auf Simulationsdaten
    }
    if (item.name === "Scythe of Elune") {
        avgBonusSP += 30; // ~30 SP Äquivalent für 5% Proc (500-650 Dmg)
        avgBonusHaste += getOnUseAvg(10, 8, 600); // 10% Haste für 8s, 10 Min (600s) CD
    }
    // NEU: Approximationen für neue Procs (nur für den Gear Score im UI)
    if (item.name === "Spellwoven Nobility Drape") {
        score += (150 / 60) * 0.25 * wCrit; // ca. 25% Uptime von 150 Int (in Crit umgerechnet)
    }
    if (item.name === "Harness of the High Thane") {
        avgBonusSP += 40*0.25; // ca. 40 SP Äquivalent für +48 Dmg nach Crit, @ 25% crit chance
    }
    if (item.name === "True Band of Sulfuras") {
        avgBonusHaste += 1.0; // ca. 20% Uptime von 5% Haste
    }
    if (item.name === "Sphere of the Endless Gulch") {
        avgBonusHaste += 0.75; // Grobe Schätzung: 100 Treffer nötig, 3 sek ICD --> 300 sekunden bis procc, in 312 sekunden ist 12 sekunden uptime, ~3,8% Uptime von 20% Haste
    }
    if (item.name === "Sigil of the Ancient Accord") {
        avgBonusSP += 30; // ca. 30 SP Äquivalent (8% Proc von 400 dmg)
    }
    if (item.name === "Chromie's Broken Pocket Watch") {
        avgBonusHaste -= 6.0; // Negativer Effekt! ca. 60% Uptime von -10% Haste
    }

    if (item.name === "Pristine Enchanted South Seas Kelp") {
        score += (2.0 * wCrit) * 0.66; // 2% Crit für 2 von 3 Spells (Wrath/Starfire)
    }
    if (item.name === "Droplet of Nordrassil") {
        score += (80 * 0.42) * wSP; // ca. 50% Uptime von 80 SP
        //score += (3.0 * 0.42) * wHit; // ca. 50% Uptime von 3% Hit
    }
    if (item.name === "Mar'kali, the Midnight Star") {
        var currentIntStr = document.getElementById("gp_int") ? document.getElementById("gp_int").innerText : "150";
        var currentInt = parseFloat(currentIntStr) || 150;
        var maxMana = 964 + (15 * currentInt);
        var procDmg = maxMana * 0.03; // 3% of Max Mana
        var dpsContribution = (procDmg * 0.10) / 2.0; // 10% Chance, alle 2 Sekunden gecastet
        score += (dpsContribution / 0.7) * wSP; // Umrechnung von DPS in SP-Wertung (1 SP ≈ 0.7 DPS)
    }

    score += avgBonusSP * wSP;
    score += avgBonusHaste * wHaste; // NEU: Durchschnittliche Haste zum Score addieren

    // 2. SET BONUS LOGIC
    if (item.setName) {
        // Determine which slot we are simulating for
        var currentSlot = slotNameOverride || CURRENT_SELECTING_SLOT;
        var otherSetItemsCount = 0;

        // Count OTHER equipped items of this set
        for (var slot in GEAR_SELECTION) {
            // Skip the slot we are currently evaluating/filling
            if (currentSlot && slot === currentSlot) continue;

            var id = GEAR_SELECTION[slot];
            // Handle ID vs Object
            if (id && typeof id === 'object' && id.id) id = id.id;

            if (!id || id == 0) continue;

            // Use Map for O(1)
            var equipped = ITEM_ID_MAP[id];
            if (equipped && equipped.setName === item.setName) {
                otherSetItemsCount++;
            }
        }

        var newTotalCount = otherSetItemsCount + 1; // +1 includes the item we are scoring

        // Check if a NEW bonus is reached exactly at this count
        if (item.setBonuses && !Array.isArray(item.setBonuses)) {
            for (var k in item.setBonuses) {
                if (parseInt(k) === newTotalCount) {
                    // Bingo! This item completes this tier of bonus. Add its value.
                    var b = item.setBonuses[k];

                    var bScore = 0;
                    bScore += (b.spellPower || 0) * wSP;
                    bScore += (b.arcaneSpellPower / 2 || 0) * wSP;
                    bScore += (b.natureSpellPower / 2 || 0) * wSP;
                    bScore += (b.spellCrit || 0) * wCrit;
                    //bScore += (b.spellHit || 0) * wHit;
                    bScore += (b.spellHaste || 0) * wHaste;
                    bScore += ((b.intellect || 0) / 60) * wCrit;

                    score += bScore;
                }
            }
        }
    }

    score += effectiveHit * wHit;
    return score;
}

function calculateEnchantScore(ench) {
    if (!ench) return 0;
    // FORMULA: GS = SP + AP + NP + (Crit * CW) + (Hit * HW) + (Haste * HW) + Int/60 * CW
    // Use 'effects' object

    var wHit = parseFloat(document.getElementById("weight_hit") ? document.getElementById("weight_hit").value : 16);
    var wCrit = parseFloat(document.getElementById("weight_crit") ? document.getElementById("weight_crit").value : 15);
    var wHaste = parseFloat(document.getElementById("weight_haste") ? document.getElementById("weight_haste").value : 11);
    var wSP = parseFloat(document.getElementById("weight_sp") ? document.getElementById("weight_sp").value : 1.0);

    var score = 0;
    var stats = ench.effects || {}; // Changed to effects

    // SP + AP + NP
    var sp = (stats.spellPower || 0);
    var ap = (stats.arcaneSpellPower || 0);
    var np = (stats.natureSpellPower || 0);
    score += (sp + ap / 2 + np / 2) * wSP;

    // --- EFFECTIVE HIT CALCULATION ---
    var currentTotalHit = parseFloat(document.getElementById("statHit") ? document.getElementById("statHit").value : 0);
    var currentEnchantId = CURRENT_SELECTING_SLOT ? ENCHANT_SELECTION[CURRENT_SELECTING_SLOT] : 0;
    var equippedEnchHit = 0;
    if (currentEnchantId && currentEnchantId !== 0) {
        var cEnch = ENCHANT_DB.find(function(e) { return e.id == currentEnchantId; });
        if (cEnch && cEnch.effects) equippedEnchHit = (cEnch.effects.spellHit || 0);
    }
    var baseHitWithoutEnchant = currentTotalHit - equippedEnchHit;
    var newEnchantHit = (stats.spellHit || 0);
    var effectiveHit = Math.min(16, baseHitWithoutEnchant + newEnchantHit) - Math.min(16, baseHitWithoutEnchant);
    
    score += effectiveHit * wHit;
    // ---------------------------------

    // Crit * CW
    score += (stats.spellCrit || 0) * wCrit;

    // Haste * HW
    score += (stats.spellHaste || 0) * wHaste;

    // Int / 60 * CW
    var intVal = stats.intellect || 0;
    score += (intVal / 60) * wCrit;

    return score;
}

function calculateGearStats() {
    // 1. Get Race Stats (Base)
    var raceSel = document.getElementById("char_race");
    var raceName = raceSel ? raceSel.value : "Tauren";
    var baseStats = RACE_STATS[raceName] || RACE_STATS["Tauren"];

    // Character Stats (Starts with Base, accumulates EVERYTHING)
    var charStats = {
        sp: 0, spArc: 0, spNat: 0, // NEW: Split SP
        crit: baseStats.crit,
        hit: baseStats.hit,
        int: baseStats.int,
        haste: baseStats.haste, // Additiv für UI
        hasteMult: 1.0 + (baseStats.haste / 100), // Multiplikativ für Engine
        fortune: 0
    };

    // Gear Only Stats (Accumulates ONLY items + sets, NO base, NO enchants)
    // Used for GS calculation only.
    var gearOnlyStats = {
        sp: 0,
        crit: 0,
        hit: 0,
        int: 0,
        haste: baseStats.haste, // Additiv für UI
        hasteMult: 1.0 + (baseStats.haste / 100), // Multiplikativ für Engine
        fortune: 0
    };

    var setCounts = {};

    // Counters for Auto-Checkbox Logic
    var countStag = 0;
    var countT3 = 0;
    var countT35 = 0;
    var hasBinding = false;
    var hasScythe = false;
    var hasNobility = false;
    var hasThane = false;
    var hasSulfuras = false;
    var hasSigil = false;
    var hasChromie = false;
    var hasReos = false;
    var hasToep = false;
    var hasRoop = false;
    var hasZhc = false;
    var hasKelp = false;
    var hasSphere = false;
    var hasDecay = false;
    var hasDroplet = false;
    var hasMarkali = false;

    var hasIdolEoF = false;
    var hasIdolMoon = false;
    var hasIdolProp = false;
    var hasIdolMoonfang = false;
    var hasIdolAcidity = false;
    var hasIdolEquilibrium = false;
    var hasIdolEquilibriumV2 = false;
    var hasIdolEquilibriumV3 = false;


    // ITEMS
    for (var slot in GEAR_SELECTION) {
        var id = GEAR_SELECTION[slot];
        if (id && typeof id === 'object' && id.id) id = id.id; // Legacy safety

        if (id && id !== 0) {
            var item = ITEM_ID_MAP[id] || ITEM_DB.find(i => i.id == id); // Use Map
            if (item) {
                var intVal = (item.intellect || 0);
                var e = item.effects || {};
                var spVal = (e.spellPower || 0);
                var spArc = (e.arcaneSpellPower || 0);
                var spNat = (e.natureSpellPower || 0);
                var critVal = (e.spellCrit || 0);
                var hitVal = (e.spellHit || 0);
                var hasteVal = (e.spellHaste || 0);
                var fortuneVal = (e.fortune || 0);

                // Add to Character (Total)
                charStats.int += intVal;
                charStats.sp += spVal;
                charStats.spArc += spArc;
                charStats.spNat += spNat;
                charStats.crit += critVal;
                charStats.hit += hitVal;
                charStats.haste += hasteVal;
                charStats.fortune += fortuneVal;
                if (hasteVal) charStats.hasteMult *= (1 + (hasteVal / 100));

                // Add to Gear Only (GS)
                // For GS, sum all SP types (Arcane und Nature zählen nur zu 50%)
                gearOnlyStats.int += intVal;
                gearOnlyStats.sp += (spVal + (spArc / 2) + (spNat / 2));
                gearOnlyStats.crit += critVal;
                gearOnlyStats.hit += hitVal;
                gearOnlyStats.haste += hasteVal;
                gearOnlyStats.fortune += fortuneVal;
                if (hasteVal) gearOnlyStats.hasteMult *= (1 + (hasteVal / 100));

                if (item.setName) {
                    if (!setCounts[item.setName]) setCounts[item.setName] = 0;
                    setCounts[item.setName]++;
                }

                // --- AUTO CHECKBOX LOGIC ---
                // Corrected Set Name
                if (item.setName === "Majesty of the Stag") countStag++;
                if (item.setName === "Dreamwalker Regalia") countT3++;
                if (item.setName === "Regalia of the Talon") countT35++;

                // Specific Items (Names Corrected)
                // Specific Items (Names Corrected)
                if (item.name === "Bindings of Contained Magic" || item.id === 23201) hasBinding = true;
                if (item.name === "Scythe of Elune") hasScythe = true;
                if (item.name === "Spellwoven Nobility Drape") hasNobility = true;
                if (item.name === "Harness of the High Thane") hasThane = true;
                if (item.name === "True Band of Sulfuras") hasSulfuras = true;
                if (item.name === "Sigil of the Ancient Accord") hasSigil = true;
                if (item.name === "Chromie's Broken Pocket Watch") hasChromie = true;
                if (item.name === "The Restrained Essence of Sapphiron") hasReos = true;
                if (item.name === "Talisman of Ephemeral Power") hasToep = true;
                if (item.name === "Remains of Overwhelming Power") hasRoop = true;
                if (item.name === "Zandalarian Hero Charm") hasZhc = true;
                if (item.name === "Pristine Enchanted South Seas Kelp") hasKelp = true;
                if (item.name === "Sphere of the Endless Gulch") hasSphere = true;
                if (item.name === "Heart of Decay") hasDecay = true;
                if (item.name === "Droplet of Nordrassil") hasDroplet = true;
                if (item.name === "Mar'kali, the Midnight Star") hasMarkali = true;

                if (item.name === "Idol of Ebb and Flow" || item.id === 55497) hasIdolEoF = true;
                if (item.name === "Idol of the Moon" || item.id === 23197) hasIdolMoon = true;
                if (item.name === "Idol of Propagation" || item.id === 58179) hasIdolProp = true;
                if (item.name === "Idol of the Moonfang" || item.id === 61293) hasIdolMoonfang = true;
                if (item.name === "Idol of Acidity") hasIdolAcidity = true;
                if (item.name === "Idol of Equilibrium") hasIdolEquilibrium = true;
                if (item.name === "Idol of Equilibrium (v2 Krokat)") hasIdolEquilibriumV2 = true;
                if (item.name === "Idol of Equilibrium (v3 Krokat)") hasIdolEquilibriumV3 = true;

            }
        }
    }

    // Update Checkboxes based on gear
    var elT34 = document.getElementById('t3_4p'); if (elT34) elT34.checked = countT3 >= 4;
    var elT36 = document.getElementById('t3_6p'); if (elT36) elT36.checked = countT3 >= 6;
    var elT38 = document.getElementById('t3_8p'); if (elT38) elT38.checked = countT3 >= 8;
    var elT35 = document.getElementById('t35_3p'); if (elT35) elT35.checked = countT35 >= 3;
    var elT35 = document.getElementById('t35_5p'); if (elT35) elT35.checked = countT35 >= 5;
    var elStag = document.getElementById('stag_5p'); if (elStag) elStag.checked = countStag >= 5;

    var elBind = document.getElementById('item_binding'); if (elBind) elBind.checked = hasBinding;
    var elScythe = document.getElementById('item_scythe'); if (elScythe) elScythe.checked = hasScythe;
    var elNobility = document.getElementById('item_nobility'); if (elNobility) elNobility.checked = hasNobility;
    var elThane = document.getElementById('item_thane'); if (elThane) elThane.checked = hasThane;
    var elSulfuras = document.getElementById('item_sulfuras'); if (elSulfuras) elSulfuras.checked = hasSulfuras;
    var elSigil = document.getElementById('item_sigil'); if (elSigil) elSigil.checked = hasSigil;
    var elChromie = document.getElementById('item_chromie'); if (elChromie) elChromie.checked = hasChromie;
    var elKelp = document.getElementById('item_kelp'); if (elKelp) elKelp.checked = hasKelp;
    var elSphere = document.getElementById('item_sphere'); if (elSphere) elSphere.checked = hasSphere;
    var elDecay = document.getElementById('item_decay'); if (elDecay) elDecay.checked = hasDecay;
    var elReos = document.getElementById('item_reos'); if (elReos) elReos.checked = hasReos;
    var elMarkali = document.getElementById('item_markali'); if (elMarkali) elMarkali.checked = hasMarkali;
    var elDroplet = document.getElementById('item_droplet'); if (elDroplet) elDroplet.checked = hasDroplet;

    var elToep = document.getElementById('item_toep'); if (elToep) elToep.checked = hasToep;
    var elRoop = document.getElementById('item_roop'); if (elRoop) elRoop.checked = hasRoop;
    var elZhc = document.getElementById('item_zhc'); if (elZhc) elZhc.checked = hasZhc;

    var elIdolEoF = document.getElementById('idolEoF'); if (elIdolEoF) elIdolEoF.checked = hasIdolEoF;
    var elIdolMoon = document.getElementById('idolMoon'); if (elIdolMoon) elIdolMoon.checked = hasIdolMoon;
    var elIdolProp = document.getElementById('idolProp'); if (elIdolProp) elIdolProp.checked = hasIdolProp;
    var elIdolMoonfang = document.getElementById('idolMoonfang'); if (elIdolMoonfang) elIdolMoonfang.checked = hasIdolMoonfang;
    var elIdolAcidity = document.getElementById('idolAcidity'); if (elIdolAcidity) elIdolAcidity.checked = hasIdolAcidity;
    var elIdolEquilibrium = document.getElementById('idolEquilibrium'); if (elIdolEquilibrium) elIdolEquilibrium.checked = hasIdolEquilibrium;
    var elIdolEquilibriumV2 = document.getElementById('idolEquilibriumV2'); if (elIdolEquilibriumV2) elIdolEquilibriumV2.checked = hasIdolEquilibriumV2;
    var elIdolEquilibriumV3 = document.getElementById('idolEquilibriumV3'); if (elIdolEquilibriumV3) elIdolEquilibriumV3.checked = hasIdolEquilibriumV3;

    // ENCHANTS
    // "Boni der Enchants auch in den Gear-Stats (nicht im Gear Score)"
    for (var slot in ENCHANT_SELECTION) {
        var eid = ENCHANT_SELECTION[slot];
        if (eid && eid !== 0) {
            var ench = ENCHANT_DB.find(e => e.id == eid);
            if (ench && ench.effects) { // Use effects
                var intVal = (ench.effects.intellect || 0);
                var spVal = (ench.effects.spellPower || 0);
                var spArc = (ench.effects.arcaneSpellPower || 0);
                var spNat = (ench.effects.natureSpellPower || 0);
                var critVal = (ench.effects.spellCrit || 0);
                var hitVal = (ench.effects.spellHit || 0);
                var hasteVal = (ench.effects.spellHaste || 0);
                var fortuneVal = (ench.effects.fortune || 0)

                // Add to Character (Total) - YES
                charStats.int += intVal;
                charStats.sp += spVal;
                charStats.spArc += spArc;
                charStats.spNat += spNat;
                charStats.crit += critVal;
                charStats.hit += hitVal;
                charStats.haste += hasteVal;
                charStats.fortune += fortuneVal;
                if (hasteVal) charStats.hasteMult *= (1 + (hasteVal / 100));
            }
        }
    }

    // CALCULATE SET BONUSES
    for (var setName in setCounts) {
        var count = setCounts[setName];
        var refItem = ITEM_DB.find(i => i.setName === setName);

        if (refItem && refItem.setBonuses && !Array.isArray(refItem.setBonuses)) {
            var keys = Object.keys(refItem.setBonuses);
            keys.forEach(function (k) {
                var threshold = parseInt(k);
                if (count >= threshold) {
                    var bonus = refItem.setBonuses[k];
                    var spVal = (bonus.spellPower || 0);
                    var spArc = (bonus.arcaneSpellPower || 0);
                    var spNat = (bonus.natureSpellPower || 0);
                    var critVal = (bonus.spellCrit || 0);
                    var hitVal = (bonus.spellHit || 0);
                    var hasteVal = (bonus.spellHaste || 0);
                    var fortuneVal = (bonus.fortune || 0);

                    // Add to Character (Total)
                    charStats.sp += spVal;
                    charStats.spArc += spArc;
                    charStats.spNat += spNat;
                    charStats.crit += critVal;
                    charStats.hit += hitVal;
                    charStats.haste += hasteVal;
                    charStats.fortune += fortuneVal;
                    if (hasteVal) charStats.hasteMult *= (1 + (hasteVal / 100));

                    // Add to Gear Only (GS) - Sets usually count as Gear Power
                    gearOnlyStats.sp += (spVal + spArc + spNat);
                    gearOnlyStats.crit += critVal;
                    gearOnlyStats.hit += hitVal;
                    gearOnlyStats.haste += hasteVal;
                    gearOnlyStats.fortune += fortuneVal;
                    if (hasteVal) gearOnlyStats.hasteMult *= (1 + (hasteVal / 100));
                }
            });
        }
    }

    // BUFFS & CONSUMABLES LOGIC
    // 1. GATHER FLAT BUFFS
    var buffInt = 0;
    var buffSP = 0;
    var buffSPArc = 0; // Split buffs
    var buffSPNat = 0;
    var buffCrit = 0;
    var buffHit = 0;
    var buffHasteMult = 1.0;

    // Auras
    if (getVal("buff_atiesh_warlock")) buffSP += 33;

    // Buffs
    if (getVal("buff_arcane_brilliance")) buffInt += 31;
    if (getVal("buff_gotw")) buffInt += 16;

    // Food
    if (getVal("buff_food_sp")) buffSP += 22;
    if (getVal("buff_food_medley")) {
        charStats.haste += 2;
        charStats.hasteMult *= 1.02;
    }
    if (getVal("buff_food_int")) buffInt += 15;

    // Potions
    if (getVal("buff_elixir_dreamshard")) buffSP += 15;
    if (getVal("buff_elixir_nature")) buffSPNat += 55; // FIXED: Nature
    if (getVal("buff_elixir_arcane_power")) buffSPArc += 40; // FIXED: Arcane
    if (getVal("buff_elixir_greater_arcane")) buffSP += 35; // FIXED: SP
    if (getVal("buff_dreamtonic")) buffSP += 35;
    if (getVal("buff_cerebral")) buffInt += 25;
    if (getVal("buff_wizard_oil")) buffSP += 36;
    if (getVal("buff_flask")) buffSP += 150;

    // ADD FLAT BUFFS TO TOTAL
    charStats.int += buffInt;
    charStats.sp += buffSP;
    charStats.spArc += buffSPArc;
    charStats.spNat += buffSPNat;

    // 2. APPLY MULTIPLIERS (BoK)
    if (getVal("buff_bok")) {
        charStats.int = Math.floor(charStats.int * 1.10);
    }

    // 3. DERIVE CRIT FROM INT
    var charCritFromInt = charStats.int / 60;
    charStats.crit += charCritFromInt;

    // 4. ADD PERCENTAGE BUFFS
    if (getVal("buff_moonkin")) buffCrit += 3;
    if (getVal("buff_atiesh_druid")) {
        charStats.haste += 2; // Variante A: UI Additiv
        charStats.hasteMult *= 1.02; // Engine Multiplikativ
    }
    if (getVal("buff_atiesh_mage")) buffCrit += 2;
    if (getVal("buff_emerald")) buffHit += 1;
    if (getVal("buff_elixir_dreamshard")) buffCrit += 2;
    if (getVal("buff_wizard_oil")) buffCrit += 1;

    charStats.crit += buffCrit;
    charStats.hit += buffHit;
    //charStats.haste *= buffHasteMult;

    // --- HASTE MULTIPLIKATOREN ZURÜCK IN PROZENT UMRECHNEN ---
    //charStats.haste = (charStats.haste - 1.0) * 100;
    //gearOnlyStats.haste = (gearOnlyStats.haste - 1.0) * 100;


    // For Gear Score Display: Only Gear Int / 60
    var gearCritFromInt = gearOnlyStats.int / 60;

    // --- ON-USE & PROC TRINKET LOGIC FOR GEAR SCORE ---
    var fightLength = parseFloat(document.getElementById("maxTime") ? document.getElementById("maxTime").value : 120);
    if (fightLength <= 0) fightLength = 120;

    function getGlobalOnUseAvg(bonusVal, duration, cooldown) {
        var fullUses = Math.floor(fightLength / cooldown);
        var remainingTime = fightLength - (fullUses * cooldown);
        var activeTime = (fullUses * duration) + Math.min(remainingTime, duration);
        return (activeTime / fightLength) * bonusVal;
    }

    if (hasReos) gearOnlyStats.sp += getGlobalOnUseAvg(130, 20, 120);
    if (hasToep) gearOnlyStats.sp += getGlobalOnUseAvg(175, 15, 90);
    if (hasRoop) gearOnlyStats.sp += getGlobalOnUseAvg(55, 60, 180);
    if (hasZhc) gearOnlyStats.sp += getGlobalOnUseAvg(102, 20, 120);
    if (hasBinding) gearOnlyStats.sp += 10;
    if (hasScythe) {
        gearOnlyStats.sp += 30; // SP Äquivalent für Proc
        gearOnlyStats.haste += getGlobalOnUseAvg(10, 8, 600); // Haste On-Use
    }
    if (hasNobility) gearOnlyStats.crit += (150 / 60) * 0.25; // Statische Approximation für Score
    if (hasThane) gearOnlyStats.sp += 40;
    if (hasSulfuras) gearOnlyStats.haste += 1.0;
    if (hasSphere) gearOnlyStats.haste += 1.0;
    if (hasSigil) gearOnlyStats.sp += 30;
    if (hasChromie) gearOnlyStats.haste -= 6.0;
    if (hasDroplet) {
        gearOnlyStats.sp += (80 * 0.42);
        gearOnlyStats.hit += (3.0 * 0.42);
    }

    // CALCULATE TOTAL GEAR SCORE FOR DISPLAY (Purely from Items+Sets)
    var wHit = parseFloat(document.getElementById("weight_hit") ? document.getElementById("weight_hit").value : 16);
    var wCrit = parseFloat(document.getElementById("weight_crit") ? document.getElementById("weight_crit").value : 15);
    var wHaste = parseFloat(document.getElementById("weight_haste") ? document.getElementById("weight_haste").value : 11);
    var wSP = parseFloat(document.getElementById("weight_sp") ? document.getElementById("weight_sp").value : 1.0);

    // Hit Cap Logic for Global Gear Score
    var baseAndBuffHit = charStats.hit - gearOnlyStats.hit;
    var usableGearHit = Math.max(0, Math.min(16, charStats.hit) - baseAndBuffHit);

    // Score Formula: SP + Crit(raw)*CW + Hit(usable)*HW + Haste*HW + (Int/60)*CW
    var finalGS = (gearOnlyStats.sp * wSP) +
        (gearOnlyStats.crit * wCrit) +
        (usableGearHit * wHit) +
        (gearOnlyStats.haste * wHaste) +
        (gearCritFromInt * wCrit);

    // Update Gear Planner Preview (Score) - Excludes Enchants, Excludes Base
    var elGS = document.getElementById("gp_gs"); if (elGS) elGS.innerText = finalGS.toFixed(0);

    // Update Gear Planner Preview (Stats) - SHOW TOTAL STATS (Base + Gear + Enchants)
    // For Preview Box "Total SP", we sum Generic + Arcane + Nature to give an idea of power
    var displayTotalSP = charStats.sp + charStats.spArc + charStats.spNat;
    var elSP = document.getElementById("gp_sp"); if (elSP) elSP.innerText = displayTotalSP;
    var elCrit = document.getElementById("gp_crit"); if (elCrit) elCrit.innerText = charStats.crit.toFixed(2) + "%";
    var elHit = document.getElementById("gp_hit"); if (elHit) elHit.innerText = charStats.hit;
    var elHaste = document.getElementById("gp_haste"); if (elHaste) elHaste.innerText = charStats.haste.toFixed(2) + "%";
    var elFortune = document.getElementById("gp_fortune"); if (elFortune) elFortune.innerText = charStats.fortune.toFixed(2) + "%";
    
    // NEU: Max Mana berechnen und UI anpassen
    var maxMana = 964 + (15 * charStats.int);
    var elInt = document.getElementById("gp_int"); 
    if (elInt) {
        elInt.innerText = charStats.int + " / " + maxMana;
        elInt.style.fontSize = "0.85rem"; // Schriftgröße etwas reduzieren, damit der Text in die Box passt
    }

    // Update Main Simulation Inputs (TOTAL STATS - SPLIT)
    var inMana = document.getElementById("statMana"); if (inMana) { inMana.value = maxMana; inMana.dispatchEvent(new Event('change')); }
    
    var inSP = document.getElementById("sp_gen"); if (inSP) { inSP.value = charStats.sp; inSP.dispatchEvent(new Event('change')); }
    var inSPNat = document.getElementById("sp_nature"); if (inSPNat) { inSPNat.value = charStats.spNat; inSPNat.dispatchEvent(new Event('change')); }
    var inSPArc = document.getElementById("sp_arcane"); if (inSPArc) { inSPArc.value = charStats.spArc; inSPArc.dispatchEvent(new Event('change')); }

    var inCrit = document.getElementById("statCrit"); if (inCrit) { inCrit.value = charStats.crit.toFixed(2); inCrit.dispatchEvent(new Event('change')); }
    var inHit = document.getElementById("statHit"); if (inHit) { inHit.value = charStats.hit; inHit.dispatchEvent(new Event('change')); }
    var inHaste = document.getElementById("statHaste"); if (inHaste) { 
        inHaste.value = charStats.haste.toFixed(2); 
        inHaste.setAttribute("data-mult", charStats.hasteMult); // NEU: Multiplikativer Wert für die Engine speichern
        inHaste.dispatchEvent(new Event('change')); 
    }
    var inFortune = document.getElementById("statFortune"); if (inFortune) { 
        inFortune.value = charStats.fortune.toFixed(2); 
        inFortune.dispatchEvent(new Event('change')); 
    }

}
