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

/*
function showProgress(text) {
    var el = document.getElementById("progressOverlay");
    if(el) {
        el.classList.remove("hidden");
        var t = document.getElementById("progressText");
        if(t) t.innerText = text;
        var f = document.getElementById("progressFill");
        if(f) f.style.width = "0%";
    }
}
function updateProgress(pct) { var el = document.getElementById("progressFill"); if(el) el.style.width = pct + "%"; }
function hideProgress() { setTimeout(function() { var el = document.getElementById("progressOverlay"); if(el) el.classList.add("hidden"); }, 200); }
*/

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
// PIXEL ART ANIMATION ENGINE
// ============================================================================

var animCtx = null;
var animScale = 4;
var animOutcome = 'hit';
var animSpell = 'wrath';

function initAnimationRandomness() {
    var c = document.getElementById('animCanvas');
    if (c) animCtx = c.getContext('2d');

    // Randomize Gimmick
    animSpell = Math.random() > 0.5 ? 'starfire' : 'wrath';

    //var outcomes = ['hit', 'crit', 'miss', 'immune'];
    //animOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const rand = Math.random() * 100;
    let res = "";
    if (rand < 0.5) { res = "crit" }
    else if (rand < 1.5) { res = "hit" }
    else {
        if (Math.random() > 0.5) { res = "miss" }
        else { res = "immune" }
    }
    animOutcome = res;



}

function rollLuck() {
    rollSpell();
    const rand = Math.random() * 100;
    let res = "";
    if (rand < 0.5) { res = "crit"; rngText.style.color = "#FF0000"; rngText.innerText = "ROLLED: CRIT! (" + rand.toFixed(2) + "%)"; }
    else if (rand < 1.5) { res = "hit"; rngText.style.color = "#4169E1"; rngText.innerText = "ROLLED: HIT (" + rand.toFixed(2) + "%)"; }
    else {
        if (Math.random() > 0.5) { res = "miss"; rngText.style.color = "#aaa"; rngText.innerText = "ROLLED: MISS (" + rand.toFixed(2) + "%)"; }
        else { res = "immune"; rngText.style.color = "#FFD700"; rngText.innerText = "ROLLED: IMMUNE (" + rand.toFixed(2) + "%)"; }
    }
    document.querySelector(`input[name="outcome"][value="${res}"]`).checked = true;
    simulationOutcome = res;
    runSimulation();
}

function drawSprite(sprite, startX, startY) {
    if (!animCtx) return;
    for (var y = 0; y < sprite.length; y++) {
        for (var x = 0; x < sprite[y].length; x++) {
            var color = sprite[y][x];
            if (color) {
                animCtx.fillStyle = color;
                animCtx.fillRect(startX + (x * animScale), startY + (y * animScale), animScale, animScale);
            }
        }
    }
}

function drawDiagonalText(textArr, startX, startY, spacingX, spacingY) {
    textArr.forEach(function (letterSprite, i) {
        drawSprite(letterSprite, startX + (i * spacingX * animScale), startY - (i * spacingY * animScale));
    });
}

function updateCanvas(pct) {
    var cvs = document.getElementById('animCanvas');
    if (!cvs || !animCtx) return;

    // Clear
    animCtx.clearRect(0, 0, cvs.width, cvs.height);

    // Background Floor
    var groundY = cvs.height - 20;
    animCtx.fillStyle = '#1a1a2e';
    animCtx.fillRect(0, groundY, cvs.width, 20);

    // Positions
    var moonkinY = groundY - (SPRITES.moonkinLarge.length * animScale) + 5;
    var dummyY = groundY - (SPRITES.dummyLarge.length * animScale) + 5;
    var startX = 30;
    var endX = cvs.width - 80;

    // 1. Draw Moonkin
    drawSprite(SPRITES.moonkinLarge, startX, moonkinY);

    // Tear on Miss
    if (animOutcome === 'miss' && pct >= 80) {
        var tearX = startX + (3 * animScale);
        var tearY = moonkinY + (4 * animScale) + 2;
        drawSprite(SPRITES.tear, tearX, tearY);
    }

    // 2. Draw Dummy
    var dummyShakeX = 0, dummyShakeY = 0;
    if (pct >= 80 && pct < 95 && (animOutcome === 'hit' || animOutcome === 'crit')) {
        dummyShakeX = (Math.random() * 4 - 2); dummyShakeY = (Math.random() * 2);
    }
    drawSprite(SPRITES.dummyLarge, endX + dummyShakeX, dummyY + dummyShakeY);

    // Shield on Immune
    if (animOutcome === 'immune' && pct >= 80) {
        var shieldX = endX + (2 * animScale);
        var shieldY = dummyY + (3 * animScale);
        drawSprite(SPRITES.shield, shieldX, shieldY);
    }

    // 3. Animation Logic
    var castFinishedAt = 80;
    var wrathFlyStart = 40;
    var wrathFlyEnd = 80;

    // === STARFIRE ANIMATION ===
    if (animSpell === 'starfire') {
        if (pct < castFinishedAt && pct > 0) {
            var castX = startX + (SPRITES.moonkinLarge[0].length * animScale) - 10;
            var castY = moonkinY + 20;
            var pulse = (Math.floor(pct / 4) % 2 === 0); // Pulse Speed hardcoded for smooth look
            if (pulse) drawSprite(SPRITES.castBall2, castX - 2, castY - 2);
            else drawSprite(SPRITES.castBall1, castX, castY);

        } else if (pct >= castFinishedAt) {
            var beamX = endX + 8;
            var segmentHeight = SPRITES.beamSegment.length * animScale;

            if (animOutcome === 'hit' || animOutcome === 'immune') { // Beam appears on immune too, just blocked
                for (var yPos = -20; yPos < groundY; yPos += segmentHeight) drawSprite(SPRITES.beamSegment, beamX, yPos);
                if (animOutcome === 'hit') drawSprite(SPRITES.impactSplash, beamX - 5, groundY - 15);
            } else if (animOutcome === 'crit') {
                for (var yPos = -20; yPos < groundY; yPos += segmentHeight) drawSprite(SPRITES.redBeamSegment, beamX, yPos);
                drawSprite(SPRITES.impactSplash, beamX - 5, groundY - 15);
            }
        }
    }
    // === WRATH ANIMATION ===
    else if (animSpell === 'wrath') {
        var castX = startX + (SPRITES.moonkinLarge[0].length * animScale) - 5;
        var castY = moonkinY + 20;
        var targetX = endX + 10;
        var targetY = dummyY + 20;

        if (pct < wrathFlyStart && pct > 0) {
            // Casting
            if (pct % 10 < 5) drawSprite(SPRITES.wrathBall, castX, castY);
        } else if (pct >= wrathFlyStart) {
            // Flight
            var flightDuration = wrathFlyEnd - wrathFlyStart;
            var currentFlightTime = pct - wrathFlyStart;
            var flightFactor = currentFlightTime / flightDuration;

            var curX = castX + (targetX - castX) * flightFactor;
            var curY = castY + (targetY - castY) * flightFactor;

            if (pct < wrathFlyEnd) {
                drawSprite(SPRITES.wrathBall, curX, curY);
            } else {
                // Impact
                if (animOutcome === 'hit' || animOutcome === 'crit') {
                    drawSprite(SPRITES.wrathSplash, targetX - 5, targetY - 5);
                } else if (animOutcome === 'miss') {
                    drawSprite(SPRITES.wrathBall, curX, curY); // Flies past
                }
            }
        }
    }

    // === TEXT OVERLAYS ===
    if (pct >= castFinishedAt) {
        var textStartX = endX - 20;
        var textStartY = dummyY - 10;

        if (animOutcome === 'crit') {
            drawDiagonalText([SPRITES.txtC, SPRITES.txtR, SPRITES.txtI, SPRITES.txtT, SPRITES.txtEcl], textStartX, textStartY, 4, 2);
        } else if (animOutcome === 'miss') {
            drawDiagonalText([SPRITES.txtM, SPRITES.txtI, SPRITES.txtS, SPRITES.txtS, SPRITES.txtEcl], textStartX, textStartY, 4, 2);
        } else if (animOutcome === 'immune') {
            drawDiagonalText([SPRITES.txtI_y, SPRITES.txtM_y, SPRITES.txtM_y, SPRITES.txtU_y, SPRITES.txtN_y, SPRITES.txtE_y, SPRITES.txtEcl_y], textStartX - 10, textStartY, 4, 2);
        }
    }
}

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR (Mulberry32)
// ============================================================================
/**
 * Returns a function that generates random numbers between 0 and 1 based on a seed.
 * Usage: var rng = mulberry32(12345); var rand = rng();
 */
function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

