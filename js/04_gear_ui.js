function initGearPlannerUI() {
    if (!document.getElementById('charLeftCol')) return;
    renderSlotColumn("left", "charLeftCol");
    renderSlotColumn("right", "charRightCol");
    renderSlotColumn("bottom", "charBottomRow");
    calculateGearStats();
}

function getIconUrl(iconName) {
    if (!iconName) return "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
    var cleanName = iconName.replace(/\\/g, "/").split("/").pop().replace(/\.jpg|\.png/g, "").toLowerCase();
    // Use local folder
    return "data/wow-icons/" + cleanName + ".jpg";
}

function renderSlotColumn(pos, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    SLOT_LAYOUT[pos].forEach(function (slotName) {
        var itemId = GEAR_SELECTION[slotName];
        // Handle ID or Object (Legacy Safety)
        if (itemId && typeof itemId === 'object' && itemId.id) itemId = itemId.id;

        var item = itemId ? ITEM_ID_MAP[itemId] : null;
        var enchantId = ENCHANT_SELECTION[slotName];
        var enchant = enchantId ? ENCHANT_DB.find(e => e.id == enchantId) : null;

        var div = document.createElement("div");
        div.className = "char-slot";

        // Simple Tooltip logic
        div.onmouseenter = function (e) { showTooltip(e, item); };
        div.onmousemove = function (e) { moveTooltip(e); };
        div.onmouseleave = function () { hideTooltip(); };

        var iconUrl = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
        var rarityClass = "q0";
        var displayName = slotName;
        var statText = "Empty Slot";
        var linkHtml = "";

        if (item) {
            iconUrl = getIconUrl(item.icon);
            rarityClass = "q" + (item.quality || 1);
            displayName = item.name;
            // NEW: Pass slotName to calculate score correctly (including active sets)
            var s = calculateItemScore(item, slotName);
            statText = "Score: " + s.toFixed(1) + (item.requiredLevel ? " | Req: " + item.requiredLevel : "");

            if (item.url) {
                linkHtml = '<a href="' + item.url + '" target="_blank" class="slot-link-btn" title="Open in Database" onclick="event.stopPropagation()">🔗</a>';
            }
        }

        // --- ENCHANT RENDER LOGIC ---
        var canEnchant = true;
        if (slotName.includes("Trinket") || slotName.includes("Idol") || slotName.includes("Relic") || slotName.includes("Off")) canEnchant = false;

        var enchantHtml = "";
        if (canEnchant) {
            var enchName = enchant ? enchant.name : "+ Enchant";
            var enchStyle = enchant ? "color:#0f0; font-size:0.75rem;" : "color:#555; font-size:0.7rem; font-style:italic;";
            var eIdPass = enchant ? enchant.id : 0;
            // Add hover events for enchant tooltip
            enchantHtml = '<div class="slot-enchant-click" onmouseenter="showEnchantTooltip(event, ' + eIdPass + ')" onmousemove="moveTooltip(event)" onmouseleave="hideTooltip()" onclick="event.stopPropagation(); openEnchantSelector(\'' + slotName + '\')" style="' + enchStyle + '; margin-top:2px; cursor:pointer;">' + enchName + '</div>';
        }

        var html = '<div class="slot-icon ' + rarityClass + '" onclick="openItemSelector(\'' + slotName + '\')"><img src="' + iconUrl + '" style="width:100%; height:100%; border-radius:3px;"></div>' +
            '<div class="slot-info">' +
            '<div class="slot-name" onclick="openItemSelector(\'' + slotName + '\')" style="color: ' + getItemColor(item ? item.quality : 0) + '; cursor:pointer;">' + displayName + '</div>' +
            '<span class="slot-stats">' + statText + '</span>' +
            enchantHtml +
            '</div>' +
            linkHtml;
        div.innerHTML = html;
        container.appendChild(div);
    });
}

function getItemColor(q) {
    var colors = ["#9d9d9d", "#ffffff", "#1eff00", "#0070dd", "#a335ee", "#ff8000"];
    return colors[q] || "#9d9d9d";
}

// Tooltips
function showTooltip(e, item) {
    if (!item) return;
    var tt = document.getElementById("wowTooltip");
    if (!tt) return;
    tt.style.display = "block";

    var qualityColor = getItemColor(item.quality);
    var iconUrl = getIconUrl(item.icon);

    var html = '<div class="tt-header"><div class="tt-icon-small" style="background-image:url(\'' + iconUrl + '\')"></div><div style="flex:1"><div class="tt-name" style="color:' + qualityColor + '">' + item.name + '</div></div></div>';

    // UPDATED: Use requiredLevel instead of itemLevel
    if (item.requiredLevel) html += '<div class="tt-white">Requires Level ' + item.requiredLevel + '</div>';

    // UPDATED: Slot + ArmorType/WeaponType aligned right
    if (item.slot) {
        html += '<div class="tt-white" style="display:flex; justify-content:space-between;">';
        html += '<span>' + item.slot + '</span>';

        // Nutze armorType oder weaponType als Klartext (z.B. "Leather", "Polearm")
        var typeText = item.armorType || item.weaponType || "";
        if (typeText) html += '<span>' + typeText + '</span>';

        html += '</div>';
    }

    if (item.armor) html += '<div class="tt-white">' + item.armor + ' Armor</div>';
    html += '<div class="tt-spacer"></div>';

    if (item.stamina) html += '<div class="tt-white">+' + item.stamina + ' Stamina</div>';
    if (item.intellect) html += '<div class="tt-white">+' + item.intellect + ' Intellect</div>';
    if (item.spirit) html += '<div class="tt-white">+' + item.spirit + ' Spirit</div>';
    if (item.agility) html += '<div class="tt-white">+' + item.agility + ' Agility</div>';
    if (item.strength) html += '<div class="tt-white">+' + item.strength + ' Strength</div>';

    html += '<div class="tt-spacer"></div>';

    // Additional Resistances
    if (item.fireRes) html += '<div class="tt-white">+' + item.fireRes + ' Fire Resistance</div>';
    if (item.natureRes) html += '<div class="tt-white">+' + item.natureRes + ' Nature Resistance</div>';
    if (item.frostRes) html += '<div class="tt-white">+' + item.frostRes + ' Frost Resistance</div>';
    if (item.shadowRes) html += '<div class="tt-white">+' + item.shadowRes + ' Shadow Resistance</div>';
    if (item.arcaneRes) html += '<div class="tt-white">+' + item.arcaneRes + ' Arcane Resistance</div>';

    html += '<div class="tt-spacer"></div>';

    if (item.effects) {
        var eff = item.effects;
        // Custom Texts
        if (eff.custom && Array.isArray(eff.custom)) {
            eff.custom.forEach(function (line) {
                html += '<div class="tt-green">' + line + '</div>';
            });
        }
    }

    // Set Info
    if (item.setName) {
        html += '<div class="tt-spacer"></div>';
        var siblings = ITEM_DB.filter(function (i) { return i.setName === item.setName; });
        var equippedCount = 0;
        for (var slot in GEAR_SELECTION) {
            var gid = GEAR_SELECTION[slot];
            if (gid && (typeof gid === 'number' || typeof gid === 'string') && gid != 0) {
                var gItem = ITEM_ID_MAP[gid];
                if (gItem && gItem.setName === item.setName) equippedCount++;
            }
        }
        html += '<div class="tt-gold">' + item.setName + ' (' + equippedCount + '/' + siblings.length + ')</div>';
        siblings.forEach(function (sItem) {
            var isEquipped = false;
            for (var slot in GEAR_SELECTION) {
                if (GEAR_SELECTION[slot] == sItem.id) isEquipped = true;
            }
            var color = isEquipped ? '#ffff99' : '#888';
            html += '<div style="color:' + color + '; margin-left:10px;">' + sItem.name + '</div>';
        });
        html += '<div class="tt-spacer"></div>';
        if (item.setBonuses) {
            if (typeof item.setBonuses === 'object' && !Array.isArray(item.setBonuses)) {
                var keys = Object.keys(item.setBonuses).sort(function (a, b) { return a - b });
                keys.forEach(function (thresholdStr) {
                    var threshold = parseInt(thresholdStr);
                    var bonusData = item.setBonuses[thresholdStr];
                    var isActive = (equippedCount >= threshold);
                    var color = isActive ? '#0f0' : '#888';

                    if (bonusData.custom && Array.isArray(bonusData.custom)) {
                        bonusData.custom.forEach(function (c) { html += '<div style="color:' + color + '">(' + threshold + ') Set: ' + c + '</div>'; });
                    }
                    else {
                        var parts = [];
                        if (bonusData.attackPower) parts.push("+" + bonusData.attackPower + " AP");
                        if (bonusData.crit) parts.push(bonusData.crit + "% Crit");
                        if (parts.length > 0) html += '<div style="color:' + color + '">(' + threshold + ') Set: ' + parts.join(", ") + '</div>';
                    }
                });
            } else if (Array.isArray(item.setBonuses)) {
                item.setBonuses.forEach(function (bonusText) {
                    var threshold = 0;
                    var match = bonusText.match(/^(\d+)|\((\d+)\)/);
                    if (match) threshold = parseInt(match[1] || match[2]);
                    var isActive = (threshold > 0) ? (equippedCount >= threshold) : false;
                    var color = isActive ? '#0f0' : '#888';
                    html += '<div style="color:' + color + '">' + bonusText + '</div>';
                });
            }
        }
    }

    tt.innerHTML = html;
    moveTooltip(e);
}

// NEW: Enchant Tooltip with Text
function showEnchantTooltip(e, enchantId) {
    if (!enchantId || enchantId === 0) return;
    var ench = ENCHANT_DB.find(x => x.id == enchantId);
    if (!ench) return;

    var tt = document.getElementById("wowTooltip");
    if (!tt) return;
    tt.style.display = "block";

    var html = '<div class="tt-header"><div style="flex:1"><div class="tt-name" style="color:#1eff00">' + ench.name + '</div></div></div>';
    html += '<div class="tt-white">Enchant</div>';
    html += '<div class="tt-spacer"></div>';

    // Description from 'text' property (Green)
    if (ench.text) {
        html += '<div class="tt-green">' + ench.text + '</div>';
    }
    // Fallback if 'text' is missing but 'effects' exist
    else if (ench.effects) {
        var ef = ench.effects;
        if (ef.spellPower) html += '<div class="tt-green">+' + ef.spellPower + ' Spell Power</div>';
        if (ef.intellect) html += '<div class="tt-green">+' + ef.intellect + ' Intellect</div>';
        // Add others if needed
    }

    tt.innerHTML = html;
    moveTooltip(e);
}

function moveTooltip(e) {
    var tt = document.getElementById("wowTooltip");
    if (!tt) return;

    var width = tt.offsetWidth;
    var height = tt.offsetHeight;

    var x = e.clientX + 15;
    var y = e.clientY + 15;

    // X Logic
    if (x + width > window.innerWidth) {
        x = e.clientX - width - 15;
    }

    // Y Logic: Prefer down, if not enough space check up, if neither pin to top
    if (y + height > window.innerHeight) {
        // Check if fits above
        var yUp = e.clientY - height - 10;
        if (yUp < 0) {
            y = 10; // Pin to top
        } else {
            y = yUp;
        }
    }

    tt.style.left = x + "px";
    tt.style.top = y + "px";
}


function hideTooltip() { var tt = document.getElementById("wowTooltip"); if (tt) tt.style.display = "none"; }

// --- ITEM MODAL ---
var CURRENT_SELECTING_SLOT = null;
function openItemSelector(slotName) {
    CURRENT_SELECTING_SLOT = slotName;
    var modal = document.getElementById("itemSelectorModal");
    var title = document.getElementById("modalTitle");
    var input = document.getElementById("itemSearchInput");
    if (modal && title && input) {
        title.innerText = "Select " + slotName;
        modal.classList.remove("hidden");
        input.value = ""; input.focus();
        renderItemList();
    }
}
function closeItemModal() { var modal = document.getElementById("itemSelectorModal"); if (modal) modal.classList.add("hidden"); CURRENT_SELECTING_SLOT = null; }

function renderItemList(filterText) {
    var list = document.getElementById("modalItemList");
    if (!list) return;
    list.innerHTML = "";
    var unequipDiv = document.createElement("div");
    unequipDiv.className = "item-row";
    unequipDiv.onclick = function () { selectItem(0); };
    unequipDiv.innerHTML = '<div class="item-row-icon" style="background:#333;"></div><div class="item-row-details"><div class="item-row-name" style="color:#888;">- Unequip -</div></div>';
    list.appendChild(unequipDiv);
    var slotKey = CURRENT_SELECTING_SLOT;
    if (slotKey.includes("Finger")) slotKey = "Finger";
    if (slotKey.includes("Trinket")) slotKey = "Trinket";
    if(slotKey === "Idol") slotKey = "Relic";

    var relevantItems = ITEM_DB.filter(function (i) {
        if (CURRENT_SELECTING_SLOT === "Main Hand") {
            var s = i.slot.toLowerCase().replace(/[\s-]/g, "");
            if (s !== "mainhand" && s !== "onehand" && s !== "twohand") return false;

            return i.weaponType;
        }

        if (CURRENT_SELECTING_SLOT === "Finger 1" && GEAR_SELECTION["Finger 2"] == i.id) return false;
        if (CURRENT_SELECTING_SLOT === "Finger 2" && GEAR_SELECTION["Finger 1"] == i.id) return false;
        if (CURRENT_SELECTING_SLOT === "Trinket 1" && GEAR_SELECTION["Trinket 2"] == i.id) return false;
        if (CURRENT_SELECTING_SLOT === "Trinket 2" && GEAR_SELECTION["Trinket 1"] == i.id) return false;

        if (CURRENT_SELECTING_SLOT === "Off Hand") return (i.slot === "Held In Off-Hand");
        return i.slot === slotKey;
    });

    // Calculate Score with Context (Slot Name) for Set Bonuses
    relevantItems.forEach(function (i) { i.simScore = calculateItemScore(i, CURRENT_SELECTING_SLOT); });
    relevantItems.sort(function (a, b) { return b.simScore - a.simScore; });

    if (filterText) {
        var ft = filterText.toLowerCase();
        relevantItems = relevantItems.filter(function (i) { return i.name.toLowerCase().includes(ft); });
    }

    // --- MARGINAL SCORE LOGIC ---
    // 1. Score des aktuell ausgerüsteten Items in diesem Slot ermitteln
    var currentEquippedId = GEAR_SELECTION[CURRENT_SELECTING_SLOT];
    // Legacy Safety
    if (currentEquippedId && typeof currentEquippedId === 'object' && currentEquippedId.id) currentEquippedId = currentEquippedId.id;
    
    var currentEquippedScore = 0;
    if (currentEquippedId && currentEquippedId !== 0) {
        var currentItem = ITEM_ID_MAP[currentEquippedId];
        if (currentItem) {
            currentEquippedScore = calculateItemScore(currentItem, CURRENT_SELECTING_SLOT);
        }
    }

    relevantItems.slice(0, 100).forEach(function (item) {
        var iconUrl = getIconUrl(item.icon);
        var row = document.createElement("div");
        row.className = "item-row";
        row.onclick = function () { selectItem(item.id); };
        row.onmouseenter = function (e) { showTooltip(e, item); };
        row.onmousemove = function (e) { moveTooltip(e); };
        row.onmouseleave = function () { hideTooltip(); };
        var levelText = item.requiredLevel ? 'Req: ' + item.requiredLevel : '';

        // 2. Delta (Differenz) berechnen und HTML formatieren
        var delta = item.simScore - currentEquippedScore;
        var deltaHtml = "";
        
        // Kleine Rundungsfehler ignorieren
        if (delta > 0.05) {
            deltaHtml = ' <span style="color:#1eff00; font-size:0.85em; margin-left: 5px;">(+' + delta.toFixed(1) + ')</span>';
        } else if (delta < -0.05) {
            deltaHtml = ' <span style="color:#f44336; font-size:0.85em; margin-left: 5px;">(' + delta.toFixed(1) + ')</span>';
        } else {
            deltaHtml = ' <span style="color:#888; font-size:0.85em; margin-left: 5px;">(0.0)</span>';
        }

        var html = '<div class="item-row-icon"><img src="' + iconUrl + '" style="width:100%; height:100%; border-radius:3px;"></div>' +
            '<div class="item-row-details"><div class="item-row-name" style="color: ' + getItemColor(item.quality) + '">' + item.name + '</div><div class="item-row-sub">' + levelText + '</div></div>' +
            '<div class="item-score-badge" style="display:flex; align-items:center;"><span class="score-label" style="margin-right: 4px;">SCORE</span>' + item.simScore.toFixed(1) + deltaHtml + '</div>';

        row.innerHTML = html;
        list.appendChild(row);
    });
}
function filterItemList() { var txt = document.getElementById("itemSearchInput").value; renderItemList(txt); }

function selectItem(itemId) {
    if (CURRENT_SELECTING_SLOT) {
        // --- 2H / OFFHAND LOGIC START ---

        // Check if we are selecting Main Hand
        if (CURRENT_SELECTING_SLOT === "Main Hand" && itemId != 0) {
            var item = ITEM_ID_MAP[itemId];
            // If item is Two-Handed, clear Off Hand
            if (item) {
                var s = item.slot ? item.slot.toLowerCase().replace(/[\s-]/g, "") : "";
                if (s === "twohand" || s === "staff" || s === "polearm") {
                    GEAR_SELECTION["Off Hand"] = 0;
                }
            }
        }

        // Check if we are selecting Off Hand
        if (CURRENT_SELECTING_SLOT === "Off Hand" && itemId != 0) {
            // Check if Main Hand is Two-Handed
            var mhId = GEAR_SELECTION["Main Hand"];
            if (mhId) {
                var mhItem = ITEM_ID_MAP[mhId];
                if (mhItem) {
                    var s = mhItem.slot ? mhItem.slot.toLowerCase().replace(/[\s-]/g, "") : "";
                    if (s === "twohand" || s === "staff" || s === "polearm") {
                        GEAR_SELECTION["Main Hand"] = 0; // Unequip 2H
                    }
                }
            }
        }
        // --- 2H / OFFHAND LOGIC END ---

        GEAR_SELECTION[CURRENT_SELECTING_SLOT] = itemId;
    }
    closeItemModal();
    initGearPlannerUI();
    saveCurrentState();
    // FORCE UI UPDATE AFTER GEAR CHANGE
    if (typeof updatePlayerStats === 'function') updatePlayerStats();
    if (typeof updateEnemyInfo === 'function') updateEnemyInfo();
}


// --- ENCHANT MODAL (NEW) ---
function openEnchantSelector(slotName) {
    CURRENT_SELECTING_SLOT = slotName;
    var modal = document.getElementById("enchantSelectorModal");
    var title = document.getElementById("enchantModalTitle");
    if (modal && title) {
        title.innerText = "Enchant " + slotName;
        modal.classList.remove("hidden");
        renderEnchantList();
    }
}
function closeEnchantModal() { 
    var modal = document.getElementById("enchantSelectorModal"); 
    if (modal) modal.classList.add("hidden"); 
    CURRENT_SELECTING_SLOT = null; 
}

function renderEnchantList() {
    var list = document.getElementById("modalEnchantList");
    if (!list) return;
    list.innerHTML = "";

    // Remove Enchant Option
    var unequipDiv = document.createElement("div");
    unequipDiv.className = "item-row";
    unequipDiv.onclick = function () { selectEnchant(0); };
    unequipDiv.innerHTML = '<div class="item-row-details"><div class="item-row-name" style="color:#888;">- No Enchant -</div></div>';
    list.appendChild(unequipDiv);

    var slotKey = CURRENT_SELECTING_SLOT;
    // Map Slots for DB query (Assume DB uses generic keys or check multiple)
    // E.g. "Finger 1" -> "Finger"
    if (slotKey.includes("Finger")) slotKey = "Finger";
    if (slotKey.includes("Trinket")) slotKey = "Trinket";
    if (slotKey === "Main Hand") slotKey = "Two Hand"; // Or One Hand, depends on logic. Enchants are usually "Weapon"

    var relevantEnchants = ENCHANT_DB.filter(function (e) {
        // 1. Class Filter (New)
        // 512 = Druid
        if (e.allowableClasses && e.allowableClasses !== -1) {
            // If the bitmask does not contain the Druid bit, skip it
            if ((e.allowableClasses & 512) === 0) return false;
        }

        // 2. Slot Filter (Existing)
        if (CURRENT_SELECTING_SLOT === "Main Hand") return (e.slot === "Weapon" || e.slot === "Two-hand" || e.slot === "Mainhand"); // NEW: Mainhand
        if (CURRENT_SELECTING_SLOT === "Off Hand") return (e.slot === "Shield"); // Only Shield Enchants
        if (CURRENT_SELECTING_SLOT === "Feet") return (e.slot === "Boots" || e.slot === "Feet");
        if (CURRENT_SELECTING_SLOT === "Hands") return (e.slot === "Gloves" || e.slot === "Hands");
        if (CURRENT_SELECTING_SLOT === "Waist") return (e.slot === "Belt" || e.slot === "Waist");
        if (CURRENT_SELECTING_SLOT === "Wrist") return (e.slot === "Bracer" || e.slot === "Wrist");
        if (CURRENT_SELECTING_SLOT === "Back") return (e.slot === "Cloak" || e.slot === "Back");
        if (CURRENT_SELECTING_SLOT.includes("Finger")) return (e.slot === "Finger"); // NEW: Finger (Neck cat in DB)

        return e.slot === CURRENT_SELECTING_SLOT || e.slot === slotKey;
    });

    relevantEnchants.forEach(function (e) { e.simScore = calculateEnchantScore(e); });
    relevantEnchants.sort(function (a, b) { return b.simScore - a.simScore; });

    relevantEnchants.forEach(function (ench) {
        var row = document.createElement("div");
        row.className = "item-row";
        row.onclick = function () { selectEnchant(ench.id); };
        row.onmouseenter = function (e) { showEnchantTooltip(e, ench.id); };
        row.onmousemove = function (e) { moveTooltip(e); };
        row.onmouseleave = function () { hideTooltip(); };

        var desc = ench.text || ""; // Show text description in list

        var html = '<div class="item-row-details"><div class="item-row-name" style="color: #1eff00;">' + ench.name + '</div><div class="item-row-sub">' + desc + '</div></div>' +
            '<div class="item-score-badge"><span class="score-label">SCORE</span>' + ench.simScore.toFixed(1) + '</div>';

        row.innerHTML = html;
        list.appendChild(row);
    });
}

function selectEnchant(enchId) {
    if (CURRENT_SELECTING_SLOT) {
        ENCHANT_SELECTION[CURRENT_SELECTING_SLOT] = enchId;
    }
    closeEnchantModal();
    initGearPlannerUI();
    saveCurrentState(); // Fix: Instant Save
}