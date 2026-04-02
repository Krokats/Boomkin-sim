// ============================================================================
// ROTATION BUILDER LOGIC (DRAG & DROP & INLINE EDITING)
// ============================================================================
var draggedSkillId = null;
var draggedStepIndex = null;

function initRotationBuilder() {
    try {
        console.log("Starte Rotation Builder...");
        populatePresetDropdown();
        renderRotationToolbox();
        renderRotationList();

        var dropzone = document.getElementById("rbDropzone");
        if (dropzone) {
            dropzone.addEventListener("dragover", function(e) {
                e.preventDefault();
                dropzone.classList.add("drag-over");
            });
            dropzone.addEventListener("dragleave", function(e) {
                dropzone.classList.remove("drag-over");
            });
            dropzone.addEventListener("drop", function(e) {
                e.preventDefault();
                dropzone.classList.remove("drag-over");
                
                if (draggedSkillId) {
                    addRotationStep(draggedSkillId);
                } else if (draggedStepIndex !== null) {
                    var steps = CUSTOM_ROTATION.steps || [];
                    moveRotationStep(draggedStepIndex, steps.length);
                }
                draggedSkillId = null;
                draggedStepIndex = null;
            });
        }
        console.log("Rotation Builder erfolgreich geladen!");
    } catch (e) {
        console.error("Fehler im Rotation Builder:", e);
        showToast("UI Fehler: " + e.message);
    }
}

function updateRotationMeta(field, val) {
    if (!CUSTOM_ROTATION) CUSTOM_ROTATION = { name: "", desc: "", steps: [] };
    CUSTOM_ROTATION[field] = val;
    saveCurrentState();
}

function renderRotationToolbox() {
    var tb = document.getElementById("rbSkillsList");
    if (!tb) return;
    tb.innerHTML = "";
    
    ROTATION_SKILLS.forEach(skill => {
        var el = document.createElement("div");
        el.className = "rb-skill";
        el.draggable = true;
        el.innerHTML = `<img src="https://wow.zamimg.com/images/wow/icons/large/${skill.icon}.jpg" class="rb-skill-icon" alt=""> ${skill.name}`;
        
        el.addEventListener("dragstart", function(e) {
            draggedSkillId = skill.id;
            draggedStepIndex = null;
        });
        tb.appendChild(el);
    });
}

function renderRotationList() {
    var dz = document.getElementById("rbDropzone");
    var empty = document.getElementById("rbEmptyState");
    if (!dz) return;
    
    // Update Meta UI Fields
    var nInput = document.getElementById("rb_meta_name");
    var dInput = document.getElementById("rb_meta_desc");
    if (nInput) nInput.value = CUSTOM_ROTATION.name || "";
    if (dInput) dInput.value = CUSTOM_ROTATION.desc || "";

    document.querySelectorAll(".rb-step").forEach(el => el.remove());

    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";

    CUSTOM_ROTATION.steps.forEach((step, idx) => {
        var skillDef = ROTATION_SKILLS.find(s => s.id === step.skill) || { name: step.skill, icon: "inv_misc_questionmark" };
        
        var stepEl = document.createElement("div");
        stepEl.className = "rb-step";
        if (step.disabled) stepEl.classList.add("is-disabled");
        stepEl.draggable = true;
        
        stepEl.addEventListener("dragstart", function(e) {
            draggedStepIndex = idx;
            draggedSkillId = null;
            e.stopPropagation();
        });
        stepEl.addEventListener("dragover", function(e) {
            e.preventDefault();
            stepEl.classList.add("drag-over");
        });
        stepEl.addEventListener("dragleave", function(e) {
            stepEl.classList.remove("drag-over");
        });
        stepEl.addEventListener("drop", function(e) {
            e.preventDefault();
            stepEl.classList.remove("drag-over");
            e.stopPropagation(); 
            
            if (draggedSkillId) {
                addRotationStep(draggedSkillId, idx);
            } else if (draggedStepIndex !== null) {
                moveRotationStep(draggedStepIndex, idx);
            }
            draggedSkillId = null;
            draggedStepIndex = null;
        });

        // Exact Execution Count from Engine (Moonkin Engine hook compat)
        var exactCount = 0;
        if (typeof SIM_DATA !== 'undefined' && SIM_DATA && SIM_DATA.median && SIM_DATA.median.stats && SIM_DATA.median.stats.stepCounts && SIM_DATA.median.stats.stepCounts[step.id]) {
            exactCount = Math.round(SIM_DATA.median.stats.stepCounts[step.id]);
        }
        // id="badge_step_${step.id}" is kept so 05_engine.js can update it natively!
        var countHtml = `<span class="rb-step-count" id="badge_step_${step.id}" style="${exactCount > 0 ? '' : 'display:none;'}">${exactCount}x</span>`;

        var html = `
            <div class="rb-step-header">
                <div class="rb-step-title">
                    <img src="https://wow.zamimg.com/images/wow/icons/large/${skillDef.icon}.jpg" class="rb-skill-icon" alt="">
                    ${idx + 1}. ${skillDef.name}
                </div>
                <div style="display:flex; align-items:center;">
                    ${countHtml}
                    <button class="rb-toggle-btn" onclick="toggleStepDisabled(${idx})" title="Enable/Disable Step">${step.disabled ? '🚫' : '✅'}</button>
                    <button class="rb-delete-btn" onclick="removeRotationStep(${idx})">✖</button>
                </div>
            </div>
            <div class="rb-conditions" id="rb_conds_${idx}"></div>
        `;
        stepEl.innerHTML = html;
        dz.appendChild(stepEl);

        var condContainer = document.getElementById(`rb_conds_${idx}`);
        if (step.conditions && step.conditions.length > 0) {
            step.conditions.forEach((cond, cIdx) => {
                condContainer.appendChild(createConditionRow(idx, cIdx, cond));
            });
        }
        
        var addBtn = document.createElement("button");
        addBtn.className = "rb-add-condition";
        addBtn.innerText = "+ Add Condition";
        addBtn.onclick = function() { addCondition(idx); };
        condContainer.appendChild(addBtn);
    });
    
    saveCurrentState();
    generateAutoDescription();
}

function createConditionRow(stepIdx, condIdx, cond) {
    var row = document.createElement("div");
    row.className = "rb-condition-row";
    
    // Type Select
    var typeSel = document.createElement("select");
    CONDITION_TYPES.forEach(cDef => {
        var opt = document.createElement("option");
        opt.value = cDef.id;
        opt.innerText = cDef.label;
        if (cDef.id === cond.type) opt.selected = true;
        typeSel.appendChild(opt);
    });
    typeSel.onchange = function() { updateCondition(stepIdx, condIdx, "type", this.value); };
    row.appendChild(typeSel);

    var cDef = CONDITION_TYPES.find(c => c.id === cond.type) || CONDITION_TYPES[0];
    
    // Target Select
    if (cDef.hasTarget) {
        var targetSel = document.createElement("select");
        cDef.hasTarget.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o; opt.innerText = o;
            if (o === cond.target) opt.selected = true;
            targetSel.appendChild(opt);
        });
        targetSel.onchange = function() { updateCondition(stepIdx, condIdx, "target", this.value); };
        row.appendChild(targetSel);
    }

    // Operator Select
    if (cDef.hasOp) {
        var opSel = document.createElement("select");
        var ops = [">", "<", ">=", "<=", "=="];
        ops.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o; opt.innerText = o;
            if (o === cond.op) opt.selected = true;
            opSel.appendChild(opt);
        });
        opSel.onchange = function() { updateCondition(stepIdx, condIdx, "op", this.value); };
        row.appendChild(opSel);
    }

    // Value Input
    if (cDef.hasVal) {
        var valInp = document.createElement("input");
        valInp.type = "number";
        valInp.value = cond.val !== undefined ? cond.val : 0;
        valInp.onchange = function() { updateCondition(stepIdx, condIdx, "val", parseFloat(this.value)); };
        row.appendChild(valInp);
    }

    // Boolean (True/False) Select
    if (cDef.hasBool) {
        var boolSel = document.createElement("select");
        var opts = [{val: "true", text: "True"}, {val: "false", text: "False"}];
        opts.forEach(o => {
            var opt = document.createElement("option");
            opt.value = o.val; opt.innerText = o.text;
            // Default ist "true"
            if (cond.bool === o.val || (cond.bool === undefined && o.val === "true")) opt.selected = true;
            boolSel.appendChild(opt);
        });
        boolSel.onchange = function() { updateCondition(stepIdx, condIdx, "bool", this.value); };
        row.appendChild(boolSel);
    }

    // Delete Button
    var delBtn = document.createElement("button");
    delBtn.className = "rb-delete-btn";
    delBtn.innerText = "✖";
    delBtn.onclick = function() { removeCondition(stepIdx, condIdx); };
    row.appendChild(delBtn);

    return row;
}

function updateCondition(sIdx, cIdx, field, value) {
    var cond = CUSTOM_ROTATION.steps[sIdx].conditions[cIdx];
    cond[field] = value;
    
    // Reset secondary fields if type changes
    if (field === "type") {
        var def = CONDITION_TYPES.find(c => c.id === value);
        if(def.hasOp) cond.op = ">="; else delete cond.op;
        if(def.hasTarget) cond.target = def.hasTarget[0]; else delete cond.target;
        if(def.hasVal) cond.val = 0; else delete cond.val;
    }
    if(def.hasBool) cond.bool = "true"; else delete cond.bool;
    renderRotationList();
}

function toggleStepDisabled(idx) {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || !CUSTOM_ROTATION.steps[idx]) return;
    CUSTOM_ROTATION.steps[idx].disabled = !CUSTOM_ROTATION.steps[idx].disabled;
    renderRotationList();
}

function addRotationStep(skillId, insertAtIdx) {
    if (!CUSTOM_ROTATION.steps) CUSTOM_ROTATION.steps = [];
    var newStep = {
        id: Date.now() + Math.floor(Math.random()*1000), // Numeric ID needed for Moonkin Engine Array
        skill: skillId,
        conditions: [],
        disabled: false
    };
    if (insertAtIdx !== undefined && insertAtIdx !== null) {
        CUSTOM_ROTATION.steps.splice(insertAtIdx, 0, newStep);
    } else {
        CUSTOM_ROTATION.steps.push(newStep);
    }
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function removeRotationStep(idx) {
    CUSTOM_ROTATION.steps.splice(idx, 1);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function moveRotationStep(fromIdx, toIdx) {
    if (toIdx > fromIdx) toIdx--; 
    var step = CUSTOM_ROTATION.steps.splice(fromIdx, 1)[0];
    CUSTOM_ROTATION.steps.splice(toIdx, 0, step);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function addCondition(sIdx) {
    var def = CONDITION_TYPES[0]; // debuff_rem
    var newCond = { type: def.id };
    if(def.hasTarget) newCond.target = def.hasTarget[0];
    if(def.hasOp) newCond.op = ">=";
    if(def.hasVal) newCond.val = 0;
    if(def.hasBool) newCond.bool = "true";
    
    CUSTOM_ROTATION.steps[sIdx].conditions.push(newCond);
    CUSTOM_ROTATION.name = "Custom Rotation";
    renderRotationList();
}

function removeCondition(sIdx, cIdx) {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || !CUSTOM_ROTATION.steps[sIdx]) return;
    
    // Bedingung aus dem Array entfernen
    CUSTOM_ROTATION.steps[sIdx].conditions.splice(cIdx, 1);
    
    // Name auf "Custom" setzen, da die Rotation verändert wurde
    CUSTOM_ROTATION.name = "Custom Rotation";
    
    // UI neu laden und speichern
    renderRotationList();
}

function populatePresetDropdown() {
    var sel = document.getElementById("rotation_preset_select");
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Preset --</option>';
    
    var grpDef = document.createElement("optgroup");
    grpDef.label = "Default Presets";
    Object.keys(PRESET_ROTATIONS).forEach(k => {
        var opt = document.createElement("option"); opt.value = "def_" + k; opt.innerText = PRESET_ROTATIONS[k].name || k;
        grpDef.appendChild(opt);
    });
    sel.appendChild(grpDef);

    var customStr = localStorage.getItem("boomkin_sim_custom_rotations");
    if (customStr) {
        try {
            var custom = JSON.parse(customStr);
            var grpCus = document.createElement("optgroup");
            grpCus.label = "My Saved Presets";
            Object.keys(custom).forEach(k => {
                var opt = document.createElement("option"); opt.value = "cus_" + k; opt.innerText = custom[k].name || k;
                grpCus.appendChild(opt);
            });
            if (grpCus.children.length > 0) sel.appendChild(grpCus);
        } catch(e){}
    }
}

function loadSelectedPreset() {
    var val = document.getElementById("rotation_preset_select").value;
    if (!val) { alert("Please select a preset from the dropdown first."); return; }
    if (CUSTOM_ROTATION && CUSTOM_ROTATION.steps && CUSTOM_ROTATION.steps.length > 0) {
        if(!confirm("Overwrite your current rotation?")) return;
    }
    
    if (val.startsWith("def_")) {
        var k = val.substring(4);
        CUSTOM_ROTATION = JSON.parse(JSON.stringify(PRESET_ROTATIONS[k]));
    } else if (val.startsWith("cus_")) {
        var k = val.substring(4);
        var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
        if (custom[k]) CUSTOM_ROTATION = JSON.parse(JSON.stringify(custom[k]));
    }
    renderRotationList();
    showToast("Preset loaded!");
}

function saveCustomPreset() {
    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) { alert("Rotation is empty."); return; }
    var name = CUSTOM_ROTATION.name || "Custom Rota";
    var safeName = prompt("Enter a save name for your local storage:", name);
    if (!safeName) return;
    
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
    CUSTOM_ROTATION.name = safeName; // Updates the input field
    custom[safeName] = JSON.parse(JSON.stringify(CUSTOM_ROTATION));
    localStorage.setItem("boomkin_sim_custom_rotations", JSON.stringify(custom));
    
    populatePresetDropdown();
    document.getElementById("rotation_preset_select").value = "cus_" + safeName;
    renderRotationList(); // Update UI
    showToast("Preset saved locally!");
}

function deleteCustomPreset() {
    var val = document.getElementById("rotation_preset_select").value;
    if (!val || !val.startsWith("cus_")) { alert("Please select one of 'My Saved Presets' to delete."); return; }
    if (!confirm("Are you sure you want to delete this preset?")) return;
    
    var k = val.substring(4);
    var custom = JSON.parse(localStorage.getItem("boomkin_sim_custom_rotations") || "{}");
    delete custom[k];
    localStorage.setItem("boomkin_sim_custom_rotations", JSON.stringify(custom));
    
    populatePresetDropdown();
    showToast("Preset deleted!");
}

function clearRotation() {
    if (confirm("Are you sure you want to clear your custom rotation?")) {
        CUSTOM_ROTATION = { name: "Blank", desc: "", steps: [] };
        document.getElementById("rotation_preset_select").value = "";
        renderRotationList();
    }
}

function generateAutoDescription() {
    var container = document.getElementById("rb_auto_desc");
    var header = document.getElementById("rb_auto_desc_header"); // Referenz auf den neuen Header
    if (!container) return;

    if (!CUSTOM_ROTATION || !CUSTOM_ROTATION.steps || CUSTOM_ROTATION.steps.length === 0) {
        container.innerHTML = "<em>No rotation configured.</em>";
        if (header) header.style.display = "none"; // Verstecke den Header, wenn leer
        return;
    }

    var activeSteps = CUSTOM_ROTATION.steps.filter(function(s) { return !s.disabled; });

    if (activeSteps.length === 0) {
        container.innerHTML = "<em>All rotation steps are disabled.</em>";
        if (header) header.style.display = "none"; // Verstecke den Header, wenn leer
        return;
    }

    // Zeige den Header an, da wir aktive Rotations-Schritte haben
    if (header) header.style.display = "flex";

    // Der Titel "Rotation Priority:" wurde entfernt, da er jetzt im klickbaren Header steht
    var text = "<div style='margin-top: 5px;'>";

    function formatSpell(skillId) {
        var sDef = ROTATION_SKILLS.find(function(s) { return s.id === skillId; }) || { name: skillId };
        var name = sDef.name;
        var cls = "desc-spell-arcane"; 
        if (skillId === "Wrath" || skillId === "InsectSwarm") cls = "desc-spell-nature";
        if (skillId.includes("Trinket")) cls = "desc-spell-item";
        return "<span class='" + cls + "'>" + name + "</span>";
    }

    function formatCond(cond) {
        var target = cond.target ? cond.target : "";
        var val = parseFloat(cond.val) || 0;
        var op = cond.op || "==";

        switch (cond.type) {
            case "debuff_rem":
            case "buff_rem":
            case "player_debuff_rem":
                if (op === "<=" && val === 0) return target + " is not active";
                if ((op === ">" || op === ">=") && val === 0) return target + " is active";
                if (op === "<=" || op === "<") return target + " has " + val + "s or less remaining";
                if (op === ">=" || op === ">") return target + " has more than " + val + "s remaining";
                return target + " duration is " + op + " " + val + "s";
                
            case "time_elapsed":
                if (op === "<=" && val === 0) return "combat just started";
                return "combat time is " + op + " " + val + "s";
                
            case "time_remaining":
                return "the fight has " + op + " " + val + "s left";
                
            case "ecl_vs_cast":
                if (cond.bool === "false") return "there is not enough Eclipse time left to cast " + target;
                return "there is enough Eclipse time left to cast " + target;
                
            case "last_cast":
                return "the last cast was " + target;
                
            default:
                return "a specific condition is met";
        }
    }

    var groupedSteps = [];
    activeSteps.forEach(function(step) {
        var lastGroup = groupedSteps[groupedSteps.length - 1];
        if (lastGroup && lastGroup.skill === step.skill) {
            lastGroup.conditionGroups.push(step.conditions || []);
        } else {
            groupedSteps.push({
                skill: step.skill,
                conditionGroups: [step.conditions || []]
            });
        }
    });

    groupedSteps.forEach(function(group, idx) {
        var spellHtml = formatSpell(group.skill);
        var isLast = (idx === groupedSteps.length - 1);
        
        var groupTexts = [];
        var hasUnconditional = false;

        group.conditionGroups.forEach(function(conds) {
            if (!conds || conds.length === 0) {
                hasUnconditional = true;
            } else {
                var condTexts = conds.map(function(c) { 
                    return "<span class='desc-condition'>" + formatCond(c) + "</span>"; 
                });
                groupTexts.push(condTexts.join(" <strong>and</strong> "));
            }
        });
        
        var condString = "";
        if (!hasUnconditional && groupTexts.length > 0) {
            condString = "<div style='margin-left: 20px; opacity: 0.9; margin-top: 2px;'>&#8627; if " + groupTexts.join(" <strong style='color:var(--text-color);'>OR</strong> if ") + "</div>";
        }

        var stepText = "";
        if (idx === 0) {
            stepText = "First, cast " + spellHtml;
        } else if (isLast && hasUnconditional) {
            stepText = "Otherwise, default to " + spellHtml + " as your filler.";
        } else {
            var trans = ["Next, use ", "Then, cast ", "After that, prioritize ", "Followed by "][(idx - 1) % 4];
            stepText = trans + spellHtml;
        }

        text += "<div style='margin-bottom: 8px;'>" + stepText + condString + "</div>";
    });

    text += "</div>";
    container.innerHTML = text;
}

// Neue Funktion für das Auf- und Zuklappen der Beschreibung
function toggleAutoDesc() {
    var content = document.getElementById("rb_auto_desc");
    var header = document.getElementById("rb_auto_desc_header");
    var icon = document.getElementById("rb_auto_desc_icon");
    
    if (!content || !header || !icon) return;
    
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block"; // Aufklappen
        header.classList.add("is-open"); // Passt das CSS für abgerundete Ecken an
        icon.innerHTML = "&#9650;"; // Ändert das Icon auf einen Pfeil nach oben
    } else {
        content.style.display = "none"; // Zuklappen
        header.classList.remove("is-open");
        icon.innerHTML = "&#9660;"; // Ändert das Icon auf einen Pfeil nach unten
    }
}