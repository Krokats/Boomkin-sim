var ITEM_ID_MAP = {}; // Performance cache for lookups

// ============================================================================
// GEAR PLANNER LOGIC
// ============================================================================

async function loadDatabase() {
    showProgress("Loading Database...");
    try {
        updateProgress(20);

        // Load Items (JSONL) and Enchants (JSON)
        const [rItems, rEnchants] = await Promise.all([
            fetch('data/items.jsonl'), // Pfad zur .jsonl-Datei geändert
            fetch('data/enchants.json')
        ]);

        if (!rItems.ok) throw new Error("Items DB Error " + rItems.status);
        if (!rEnchants.ok) throw new Error("Enchants DB Error " + rEnchants.status);

        // 1. JSONL einlesen: Als Text laden, in Zeilen aufteilen und jede Zeile parsen
        const itemsText = await rItems.text();
        const items = itemsText
            .split(/\r?\n/) // Berücksichtigt Windows (\r\n) und Linux (\n) Zeilenumbrüche
            .filter(line => line.trim() !== '') // Leere Zeilen (z.B. am Ende der Datei) ignorieren
            .map(line => JSON.parse(line)); // Jede einzelne Zeile als JSON parsen

        // 2. Enchants weiterhin als reguläres JSON einlesen
        const enchants = await rEnchants.json();
        
        updateProgress(60);

        ITEM_DB = items.filter(i => {
            return true;
        });

        // Build Map for O(1) lookup
        ITEM_ID_MAP = {};
        ITEM_DB.forEach(i => { ITEM_ID_MAP[i.id] = i; });
        ENCHANT_DB = enchants;

        initGearPlannerUI();
        var statusEl = document.getElementById("dbStatus");
        if (statusEl) {
            statusEl.innerText = "Loaded (" + ITEM_DB.length + " items, " + ENCHANT_DB.length + " enchants)";
            statusEl.style.color = "#4caf50";
        }
        updateProgress(100);
    } catch (e) {
        console.error("DB Load Failed:", e);
        var statusEl = document.getElementById("dbStatus");
        if (statusEl) statusEl.innerText = "Error loading database files.";
    } finally { 
        hideProgress(); 
    }
}