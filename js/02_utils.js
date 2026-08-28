/**
 * Moonkin Simulation - File 2: Utilities
 */

// ============================================================================
// 2. UTILS
// ============================================================================
function getVal(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    if (el.type === "checkbox") return el.checked ? 1 : 0;
    if (el.tagName === "SELECT") return el.value;
    return parseFloat(el.value) || 0;
}

function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.innerText = text;
}

function showToast(msg) {
    var t = document.getElementById("toast");
    if (t) {
        if (toastTimer) clearTimeout(toastTimer);
        t.innerText = msg || "Action Successful!";
        t.classList.add("show");
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3000);
    }
}

function showProgress(text) {
    var el = document.getElementById("progressOverlay");
    if (el) {
        el.classList.remove("hidden");
        var t = document.getElementById("progressText");
        if (t) t.innerText = text;
        var f = document.getElementById("progressFill");
        if (f) f.style.width = "0%";

        // Animation initialisieren (Zufalls-Gimmick)
        initAnimationRandomness();
        updateCanvas(0);
    }
}

function updateProgress(pct) {
    var el = document.getElementById("progressFill");
    if (el) el.style.width = pct + "%";

    // Animation updaten
    updateCanvas(pct);
}

function hideProgress() {
    setTimeout(function () {
        var el = document.getElementById("progressOverlay");
        if (el) el.classList.add("hidden");
    }, 200);
}

// ============================================================================
// MODAL CONTROLS & GEAR PRESET (FIX)
// ============================================================================

function openOtherSimsModal() {
    var modal = document.getElementById('otherSimsModal');
    if (modal) modal.classList.remove('hidden');
}

function closeOtherSimsModal() {
    var modal = document.getElementById('otherSimsModal');
    if (modal) modal.classList.add('hidden');
}

function openGearPresetModal() {
    var modal = document.getElementById('gearPresetModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error("Modal mit der ID 'gearPresetModal' wurde nicht gefunden!");
    }
}

function closeGearPresetModal() {
    var modal = document.getElementById('gearPresetModal');
    if (modal) modal.classList.add('hidden');
}

// 1. Wird beim Klick auf "Load" aufgerufen
window.loadBiSPreset = function() {
    var sel = document.getElementById("bis_preset_select");
    if (!sel || !sel.value) { 
        showToast("Please select a preset from the dropdown first."); 
        return; 
    }
    openGearPresetModal();
};

// 2. Wird beim Klick auf "Yes, replace" im Modal aufgerufen
window.confirmLoadBiSPreset = function() {
    var sel = document.getElementById("bis_preset_select");
    if (!sel) return;
    var val = sel.value;

    var preset = null;
    if (val.startsWith("def_")) {
        var k = val.substring(4);
        preset = GEAR_PRESETS[k];
    } else if (val.startsWith("cus_")) {
        var k = val.substring(4);
        var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_gear") || "{}");
        preset = custom[k];
    }

    if (!preset) {
        closeGearPresetModal();
        return;
    }

    GEAR_SELECTION = {};
    ENCHANT_SELECTION = {};

    if (preset.gear) {
        for (var slot in preset.gear) {
            if (preset.gear[slot] !== 0 && preset.gear[slot] !== "") {
                GEAR_SELECTION[slot] = preset.gear[slot];
            }
        }
    }
    if (preset.enchants) {
        for (var slot in preset.enchants) {
            if (preset.enchants[slot] !== 0 && preset.enchants[slot] !== "") {
                ENCHANT_SELECTION[slot] = preset.enchants[slot];
            }
        }
    }

    if (typeof initGearPlannerUI === 'function') initGearPlannerUI();
    saveCurrentState();
    
    closeGearPresetModal();
    showToast("Gear Preset loaded!");
};

// Escape-Key schließt sämtliche Modals
document.addEventListener('keydown', function (e) {
    if (e.key === "Escape") {
        closeOtherSimsModal();
        closeGearPresetModal();
        if (typeof closeItemModal === 'function') closeItemModal();
        if (typeof closeEnchantModal === 'function') closeEnchantModal();
        if (typeof closeImportConfigModal === 'function') closeImportConfigModal();
    }
});
