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

    status.innerText = "Fetching data from Octo Chronicle...";
    status.style.color = "#aaa";

    // Ziel-API von Octo Chronicle
    // Ziel-API von Octo Chronicle
    var targetUrl = `https://octo.chronicleclassic.com/api/v1/armory/${realm}/${name}`;
    var proxyUrl = `https://chronicle-proxy.krokat.workers.dev/?url=${encodeURIComponent(targetUrl)}`;
    try {
        var response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error("Network Error or Character not found (Status " + response.status + ")");
        }

        var jsonData = await response.json();

        if (jsonData.error) {
            throw new Error(jsonData.error);
        }

        // 1. Rasse extrahieren und für das Format der Simulation (NightElf statt Night Elf) anpassen
        var raceString = jsonData.race || "Tauren";
        if (raceString === "Night Elf") raceString = "NightElf"; 

        // 2. Items & Enchants extrahieren
        var importedItems = [];
        if (jsonData.gear && Array.isArray(jsonData.gear)) {
            jsonData.gear.forEach(function(item) {
                // Item ID 0 (leerer Slot) überspringen
                if (item.item_id && item.item_id !== 0) {
                    importedItems.push({
                        itemId: item.item_id,
                        effectId: item.enchant_id || 0 // enchant_id direkt aus der API übernehmen
                    });
                }
            });
        }

        if (importedItems.length === 0) {
            throw new Error("No items found. Character might be naked or parsing failed.");
        }

        // 3. Daten anwenden & Match-Statistik erhalten (Die existierende Funktion applyImportData übernimmt das Mapping)
        var results = applyImportData(importedItems, raceString, name);
        
        // Feedback Message aufbauen
        var msg = "Armory Scan: Found " + importedItems.length + " Items.<br>";

        if (results.matched > 0) {
            msg += "<span style='color:#4caf50'>Successfully imported " + results.matched + " items.</span>";
        } else {
            msg += "<span style='color:#f44336'>No items matched your local DB.</span>";
        }

        if (results.matched < importedItems.length) {
            msg += "<br><span style='font-size:0.8em; color:#888;'>(" + (importedItems.length - results.matched) + " items skipped - not in local DB)</span>";
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
                // prüfe, ob slotToAssign beinhaltet e.slot Wert (z.B. slotToAssign "Finger 1" und e.slot "Finger")
                var enchant = ENCHANT_DB.find(function (e) { return e.effectId === entry.effectId && slotToAssign.includes(e.slot); });
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