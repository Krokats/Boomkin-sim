/**
 * Moonkin Simulation - File 6: Main Init
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    setupUIListeners();
    addSim(true);
    updateEnemyInfo();
    updateSpellStats();
    importSettings();
    loadDatabase();
}

// Start
init();