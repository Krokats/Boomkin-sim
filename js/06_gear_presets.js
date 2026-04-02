// ============================================================================
// GEAR PRESET LOGIC (BiS & Custom)
// ============================================================================

function populateBiSDropdown() {
    var sel = document.getElementById("bis_preset_select");
    if (!sel) return;
    
    sel.innerHTML = '<option value="">-- Select Preset --</option>';
    
    // Globale Presets (aus 01_globals.js)
    if (typeof GEAR_PRESETS !== 'undefined') {
        var grpDef = document.createElement("optgroup");
        grpDef.label = "Default Presets";
        Object.keys(GEAR_PRESETS).forEach(function(k) {
            var opt = document.createElement("option");
            opt.value = "def_" + k;
            opt.innerText = k;
            grpDef.appendChild(opt);
        });
        sel.appendChild(grpDef);
    }

    // Lokale Presets (aus localStorage)
    var customStr = localStorage.getItem("boomkin_sim_custom_gear");
    if (customStr) {
        try {
            var custom = JSON.parse(customStr);
            var grpCus = document.createElement("optgroup");
            grpCus.label = "My Saved Gear";
            Object.keys(custom).forEach(function(k) {
                var opt = document.createElement("option");
                opt.value = "cus_" + k;
                opt.innerText = k;
                grpCus.appendChild(opt);
            });
            if (grpCus.children.length > 0) sel.appendChild(grpCus);
        } catch(e) {}
    }
}

function loadBiSPreset() {
    var sel = document.getElementById("bis_preset_select");
    if (!sel) return;
    var val = sel.value;
    if (!val) { alert("Please select a preset from the dropdown first."); return; }
    
    if (!confirm("Load preset? This will overwrite your currently equipped gear and enchants.")) return;

    var preset = null;
    if (val.startsWith("def_")) {
        var k = val.substring(4);
        preset = GEAR_PRESETS[k];
    } else if (val.startsWith("cus_")) {
        var k = val.substring(4);
        var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_gear") || "{}");
        preset = custom[k];
    }

    if (!preset) return;

    GEAR_SELECTION = {};
    ENCHANT_SELECTION = {};

    if (preset.gear) {
        for (var slot in preset.gear) {
            if (preset.gear[slot] !== 0) GEAR_SELECTION[slot] = preset.gear[slot];
        }
    }
    if (preset.enchants) {
        for (var slot in preset.enchants) {
            if (preset.enchants[slot] !== 0) ENCHANT_SELECTION[slot] = preset.enchants[slot];
        }
    }

    initGearPlannerUI();
    saveCurrentState();
    showToast("Gear Preset loaded!");
}

function saveCustomGearPreset() {
    if (Object.keys(GEAR_SELECTION).length === 0) { alert("No gear equipped to save."); return; }
    
    var safeName = prompt("Enter a name for your Gear Preset:");
    if (!safeName) return;
    
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_gear") || "{}");
    custom[safeName] = {
        gear: JSON.parse(JSON.stringify(GEAR_SELECTION)),
        enchants: JSON.parse(JSON.stringify(ENCHANT_SELECTION))
    };
    localStorage.setItem("boomkin_sim_custom_gear", JSON.stringify(custom));
    
    populateBiSDropdown();
    document.getElementById("bis_preset_select").value = "cus_" + safeName;
    showToast("Gear Preset saved!");
}

function deleteCustomGearPreset() {
    var val = document.getElementById("bis_preset_select").value;
    if (!val || !val.startsWith("cus_")) { alert("Please select one of 'My Saved Gear' to delete."); return; }
    if (!confirm("Are you sure you want to delete this gear preset?")) return;
    
    var k = val.substring(4);
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_gear") || "{}");
    delete custom[k];
    localStorage.setItem("boomkin_sim_custom_gear", JSON.stringify(custom));
    
    populateBiSDropdown();
    showToast("Preset deleted!");
}

function shareGearPreset() {
    var presetToShare = {
        gear: GEAR_SELECTION,
        enchants: ENCHANT_SELECTION
    };
    
    if (Object.keys(presetToShare.gear).length === 0) {
        alert("Your character has no gear to share!");
        return;
    }

    var jsonStr = JSON.stringify(presetToShare);
    var compressed = "";
    if (typeof LZString !== 'undefined') {
        compressed = LZString.compressToEncodedURIComponent(jsonStr);
    } else {
        compressed = btoa(jsonStr);
    }

    var code = "GEAR:" + compressed;
    prompt("Copy this Gear-Code to share it:", code);
}

function importGearPreset() {
    var input = prompt("Paste the Gear-Code here:");
    if (!input) return;
    
    if (input.startsWith("GEAR:")) {
        input = input.substring(5);
    }

    try {
        var json = null;
        if (typeof LZString !== 'undefined') {
            json = LZString.decompressFromEncodedURIComponent(input);
        }
        if (!json) { try { json = atob(input); } catch (e) { } }

        if (!json) throw new Error("Could not decode string");

        var preset = JSON.parse(json);
        if (!preset.gear) throw new Error("Invalid gear format");

        if (confirm("Importing this gear will overwrite your current items. Proceed?")) {
            GEAR_SELECTION = preset.gear || {};
            ENCHANT_SELECTION = preset.enchants || {};
            
            initGearPlannerUI();
            saveCurrentState();
            showToast("Gear imported successfully!");
            
            if(confirm("Do you want to save this imported gear permanently to your list?")) {
                saveCustomGearPreset();
            }
        }
    } catch (e) {
        console.error(e);
        alert("Invalid Gear Code!");
    }
}