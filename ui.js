// ui.js — IMLADRIS User Interface
// Dependencies: state.js, math.js, data.js, visualization.js, animation.js, pattern.js
// Wires all modules together. Owns the DOM.

'use strict';

// ============================================================================
// INIT — called once DOM is ready
// ============================================================================

function initUI() {
    Anim.setCanvas(document.getElementById('mainCanvas'));
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    bindControls();
    renderCategoryList();
    renderPatternCategorySelector();
    showPanel('welcome');
}

// ============================================================================
// CANVAS SIZING
// ============================================================================

function resizeCanvas() {
    const canvas = document.getElementById('mainCanvas');
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    if (State.data.length > 0) Viz.render(canvas);
}

// ============================================================================
// DATA LOADING CALLBACKS
// Called by data.js after parseCSV completes
// ============================================================================

function onDataLoaded(summary) {
    showMessage(`Loaded ${summary.rowCount} entries across ${summary.categoryCount} categories (${summary.dateRange.from} → ${summary.dateRange.to})`, 'success');
    renderCategoryList();
    renderPatternCategorySelector();
    updateInsightsPanel();
    showPanel('main');
    Viz.render(document.getElementById('mainCanvas'));
}

function onDataError(message) {
    showMessage(message, 'error');
}

// ============================================================================
// CONTROL BINDING
// ============================================================================

function bindControls() {
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.addEventListener('change', Data.handleFileInput);

    // Animation controls
    bind('btnPlay', () => {
        const canvas = document.getElementById('mainCanvas');
        if (State.animation.active) {
            Anim.stop();
            setText('btnPlay', '▶ Play');
        } else {
            Anim.start(canvas);
            setText('btnPlay', '⏸ Pause');
        }
    });

    bind('btnStepBack', () => Anim.stepBack(document.getElementById('mainCanvas')));
    bind('btnStepForward', () => Anim.stepForward(document.getElementById('mainCanvas')));

    bind('btnDirectionToggle', () => {
        const newDir = State.animation.direction === 1 ? -1 : 1;
        Anim.setDirection(newDir);
        setText('btnDirectionToggle', newDir === 1 ? '→ Forward' : '← Reverse');
    });

    bind('btnResetLatest', () => Anim.resetToLatest(document.getElementById('mainCanvas')));

    // Speed slider
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
        speedSlider.value = State.animation.speed;
        speedSlider.addEventListener('input', () => {
            const ms = parseInt(speedSlider.value);
            Anim.setSpeed(ms);
            setText('speedLabel', `${ms}ms`);
        });
    }

    // Jump to date
    bind('btnJumpDate', () => {
        const input = document.getElementById('jumpDateInput');
        if (!input || !input.value) return;
        const canvas = document.getElementById('mainCanvas');
        Anim.jumpToDate(input.value, canvas);
    });

    // Window size
    const windowInput = document.getElementById('windowSizeInput');
    if (windowInput) {
        windowInput.value = State.view.windowSize;
        windowInput.addEventListener('change', () => {
            const v = parseInt(windowInput.value);
            if (v > 0 && v <= 730) {
                State.view.windowSize = v;
                Viz.render(document.getElementById('mainCanvas'));
            }
        });
    }

    // Color mode toggle
    bind('btnColorMode', () => {
        State.settings.colorMode = State.settings.colorMode === 'rank' ? 'zscore' : 'rank';
        setText('btnColorMode', State.settings.colorMode === 'rank' ? 'Color: Rank' : 'Color: Z-Score');
        Viz.render(document.getElementById('mainCanvas'));
    });

    // Pattern matching
    bind('btnRunPattern', runPatternUI);

    bind('btnPatternUseCurrentDate', () => {
        const input = document.getElementById('patternDateInput');
        if (input && State.animation.currentDate) {
            input.value = State.animation.currentDate;
        }
    });
}

// ============================================================================
// CATEGORY LIST
// ============================================================================

function renderCategoryList() {
    const container = document.getElementById('categoryList');
    if (!container) return;

    container.innerHTML = '';

    State.categories.forEach(cat => {
        const isHighlighted = State.view.highlightedCats.has(cat);
        const isHidden = State.view.hiddenCats.has(cat);

        const row = document.createElement('div');
        row.className = 'cat-row' + (isHighlighted ? ' highlighted' : '') + (isHidden ? ' hidden' : '');
        row.innerHTML = `
            <span class="cat-label">${cat}</span>
            <button class="btn-small" onclick="toggleHighlight('${cat}')">${isHighlighted ? '★' : '☆'}</button>
            <button class="btn-small" onclick="toggleHidden('${cat}')">${isHidden ? '👁' : '◎'}</button>
        `;
        container.appendChild(row);
    });
}

function toggleHighlight(cat) {
    if (State.view.highlightedCats.has(cat)) {
        State.view.highlightedCats.delete(cat);
    } else {
        State.view.highlightedCats.add(cat);
    }
    renderCategoryList();
    Viz.render(document.getElementById('mainCanvas'));
}

function toggleHidden(cat) {
    if (State.view.hiddenCats.has(cat)) {
        State.view.hiddenCats.delete(cat);
    } else {
        State.view.hiddenCats.add(cat);
    }
    renderCategoryList();
    Viz.render(document.getElementById('mainCanvas'));
}

// ============================================================================
// RANK HIGHLIGHTING
// Track a specific rank position through time
// ============================================================================

let highlightedRanks = new Set();

function toggleRankHighlight(rank) {
    if (highlightedRanks.has(rank)) {
        highlightedRanks.delete(rank);
    } else {
        highlightedRanks.add(rank);
    }
    Viz.render(document.getElementById('mainCanvas'));
}

// ============================================================================
// PATTERN MATCHING UI
// ============================================================================

function renderPatternCategorySelector() {
    const container = document.getElementById('patternCatSelector');
    if (!container) return;

    container.innerHTML = '';

    // "All categories" checkbox
    const allRow = document.createElement('div');
    allRow.innerHTML = `
        <label>
            <input type="checkbox" id="patternUseAll" checked onchange="togglePatternAllCats(this.checked)">
            All categories
        </label>
    `;
    container.appendChild(allRow);

    // Individual category checkboxes
    State.categories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'pattern-cat-row';
        row.innerHTML = `
            <label>
                <input type="checkbox" class="pattern-cat-check" value="${cat}" checked>
                ${cat}
            </label>
        `;
        container.appendChild(row);
    });
}

function togglePatternAllCats(checked) {
    const checkboxes = document.querySelectorAll('.pattern-cat-check');
    checkboxes.forEach(cb => cb.checked = checked);
}

function getPatternSelectedCats() {
    const useAll = document.getElementById('patternUseAll')?.checked;
    if (useAll) return [...State.categories];
    return [...document.querySelectorAll('.pattern-cat-check:checked')].map(cb => cb.value);
}

function runPatternUI() {
    const refDate = document.getElementById('patternDateInput')?.value;
    if (!refDate) {
        showMessage('Select a reference date for pattern matching.', 'error');
        return;
    }

    if (!State.cache[refDate]) {
        showMessage(`No data found for ${refDate}.`, 'error');
        return;
    }

    const selectedCats = getPatternSelectedCats();
    if (selectedCats.length === 0) {
        showMessage('Select at least one category for pattern matching.', 'error');
        return;
    }

    // Temporarily override category selection for this match
    const results = Pattern.findSimilarDays(refDate, {
        topN: 10,
        useAllCategories: false,
        _catOverride: selectedCats
    });

    State.pattern.referenceDate = refDate;
    State.pattern.results = results;

    renderPatternResults(results, refDate);
}

function renderPatternResults(results, refDate) {
    const container = document.getElementById('patternResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = '<div class="info-text">No matches found.</div>';
        return;
    }

    container.innerHTML = results.map((match, i) => {
        const simColor = match.similarity > 80 ? '#10b981' : match.similarity > 60 ? '#fbbf24' : '#6b7280';
        const hasNote = match.note && match.note.trim().length > 0;
        return `
            <div class="pattern-match" style="border-left: 3px solid ${simColor};">
                <div class="pattern-match-header">
                    <span class="pattern-rank">#${i + 1}</span>
                    <span class="pattern-date" onclick="Anim.jumpToDate('${match.date}', document.getElementById('mainCanvas'))" style="cursor:pointer; color:#3b82f6;">${match.date}</span>
                    <span class="pattern-sim" style="color:${simColor}">${match.similarity.toFixed(1)}%</span>
                    <span class="pattern-ovr">OVR: ${match.overall}</span>
                </div>
                ${hasNote ? `<div class="pattern-note">${match.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================================================
// INSIGHTS / DIVERGENCE PANEL
// ============================================================================

function updateInsightsPanel() {
    const panel = document.getElementById('insightsPanel');
    if (!panel || State.data.length === 0) return;

    const sorted = State.data;
    const lastDate = sorted[sorted.length - 1].date;
    const det = Math_Divergence(lastDate); // getDivergence from math.js

    if (!det) {
        panel.innerHTML = '<div class="info-text">Insufficient data for divergence analysis.</div>';
        return;
    }

    // Find last harmony
    let lastHarmony = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
        const d = getDivergence(sorted[i].date);
        if (d && d.status === 'harmony') { lastHarmony = sorted[i].date; break; }
    }

    // 30-day average divergence
    const last30 = sorted.slice(-Math.min(30, sorted.length));
    const avg30 = last30.reduce((sum, d) => {
        const div = getDivergence(d.date);
        return sum + (div ? div.divergence : 0);
    }, 0) / last30.length;

    // Peak divergence
    let peak = null;
    for (const entry of sorted) {
        const div = getDivergence(entry.date);
        if (div && (!peak || div.divergence > peak.divergence)) {
            peak = { ...div, date: entry.date };
        }
    }

    const statusColors = { harmony: '#10b981', caution: '#fbbf24', alert: '#ef4444' };
    const color = statusColors[det.status] || '#6b7280';

    panel.innerHTML = `
        <div class="stat-row">
            <span class="stat-label">Status</span>
            <span class="stat-value" style="color:${color}">${det.status.charAt(0).toUpperCase() + det.status.slice(1)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Divergence</span>
            <span class="stat-value">${det.divergence.toFixed(2)}σ</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Gap (OVR − IDX)</span>
            <span class="stat-value" style="color:${det.gap > 0 ? '#fbbf24' : '#3b82f6'}">${det.gap > 0 ? '+' : ''}${det.gap.toFixed(2)}σ</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Last Harmony</span>
            <span class="stat-value">${lastHarmony || 'None found'}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">30-Day Avg</span>
            <span class="stat-value">${avg30.toFixed(2)}σ</span>
        </div>
        ${peak ? `
        <div class="stat-row">
            <span class="stat-label">Peak Divergence</span>
            <span class="stat-value">${peak.divergence.toFixed(2)}σ<br><small style="color:#6b7280">${peak.date}</small></span>
        </div>` : ''}
    `;
}

// ============================================================================
// PANEL MANAGEMENT
// Simple show/hide for collapsible sections
// ============================================================================

function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`panel-${name}`);
    if (target) target.classList.add('active');
}

function toggleCollapsible(sectionId) {
    const content = document.getElementById(`${sectionId}-content`);
    const icon = document.getElementById(`${sectionId}-icon`);
    if (!content) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : 'block';
    if (icon) icon.textContent = isOpen ? '▶' : '▼';
}

// ============================================================================
// MESSAGES
// ============================================================================

function showMessage(text, type = 'success') {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `message message-${type}`;
    div.textContent = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// ============================================================================
// HELPERS
// ============================================================================

function bind(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// Alias so math.js getDivergence is accessible here without name collision
const Math_Divergence = (date) => getDivergence(date);

// ============================================================================
// EXPORTS
// ============================================================================

const UI = {
    initUI,
    onDataLoaded,
    onDataError,
    toggleHighlight,
    toggleHidden,
    toggleRankHighlight,
    toggleCollapsible,
    showMessage,
    updateInsightsPanel,
    renderPatternResults
};
