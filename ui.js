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

    // Sort mode toggle
    bind('btnSortMode', () => {
        const next = State.settings.sortMode === 'normal' ? 'middleOut' : 'normal';
        State.settings.sortMode = next;
        setText('btnSortMode', next === 'normal' ? 'Sort: Normal' : 'Sort: Middle-Out');
        Viz.render(document.getElementById('mainCanvas'));
    });

    // Settings save/load
    bind('btnSaveSettings', saveSettings);
    const settingsFileInput = document.getElementById('settingsFileInput');
    if (settingsFileInput) settingsFileInput.addEventListener('change', (e) => loadSettings(e.target.files[0]));

    // Cell shape toggle — square > dot > shape-by-rank > square
    bind('btnCellShape', () => {
        const shapes = ['square', 'dot', 'shape-by-rank'];
        const current = State.settings.cellShape || 'square';
        const next = shapes[(shapes.indexOf(current) + 1) % shapes.length];
        State.settings.cellShape = next;
        const labels = { 'square': 'Cell: Square', 'dot': 'Cell: Dot', 'shape-by-rank': 'Cell: Shape' };
        setText('btnCellShape', labels[next]);
        Viz.render(document.getElementById('mainCanvas'));
    });

    // Gradient editor
    renderGradientEditor();
    bind('btnAddStop', addGradientStop);

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

    const allRow = document.createElement('div');
    allRow.innerHTML = `
        <label>
            <input type="checkbox" id="patternUseAll" checked onchange="togglePatternAllCats(this.checked)">
            All categories
        </label>
    `;
    container.appendChild(allRow);

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

function normalizeDate(raw) {
    if (!raw) return null;
    raw = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
        const [, m, d, y] = mdyMatch;
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return null;
}

function runPatternUI() {
    const rawDate = document.getElementById('patternDateInput')?.value;
    const refDate = normalizeDate(rawDate);
    if (!refDate) {
        showMessage('Select a reference date for pattern matching.', 'error');
        return;
    }

    if (!State.cache[refDate]) {
        showMessage(`No data found for ${refDate}. Use YYYY-MM-DD or the date picker.`, 'error');
        return;
    }

    const selectedCats = getPatternSelectedCats();
    if (selectedCats.length === 0) {
        showMessage('Select at least one category for pattern matching.', 'error');
        return;
    }

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
    const det = Math_Divergence(lastDate);

    if (!det) {
        panel.innerHTML = '<div class="info-text">Insufficient data for divergence analysis.</div>';
        return;
    }

    let lastHarmony = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
        const d = getDivergence(sorted[i].date);
        if (d && d.status === 'harmony') { lastHarmony = sorted[i].date; break; }
    }

    const last30 = sorted.slice(-Math.min(30, sorted.length));
    const avg30 = last30.reduce((sum, d) => {
        const div = getDivergence(d.date);
        return sum + (div ? div.divergence : 0);
    }, 0) / last30.length;

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
// ============================================================================

function showPanel(name) {
    if (name === 'main') {
        const welcome = document.getElementById('panel-welcome');
        if (welcome) welcome.style.display = 'none';
        return;
    }
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

// ============================================================================
// GRADIENT EDITOR
// ============================================================================

function renderGradientEditor() {
    const container = document.getElementById('gradientEditor');
    if (!container) return;

    container.innerHTML = '';

    State.settings.gradient.forEach((stop, i) => {
        const row = document.createElement('div');
        row.className = 'gradient-stop-row';
        row.innerHTML = `
            <input type="number" class="input-number" value="${stop.pos.toFixed(2)}" min="0" max="1" step="0.01"
                onchange="updateGradientStop(${i}, 'pos', parseFloat(this.value))">
            <input type="color" value="${rgbToHex(stop.r, stop.g, stop.b)}"
                onchange="updateGradientStopColor(${i}, this.value)">
            <button class="btn-small" onclick="removeGradientStop(${i})">✕</button>
        `;
        container.appendChild(row);
    });
}

function updateGradientStop(i, key, value) {
    State.settings.gradient[i][key] = value;
    State.settings.gradient.sort((a, b) => a.pos - b.pos);
    renderGradientEditor();
    Viz.render(document.getElementById('mainCanvas'));
}

function updateGradientStopColor(i, hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    State.settings.gradient[i].r = r;
    State.settings.gradient[i].g = g;
    State.settings.gradient[i].b = b;
    Viz.render(document.getElementById('mainCanvas'));
}

function addGradientStop() {
    const stops = State.settings.gradient;
    let maxGap = 0;
    let insertPos = 0.5;
    for (let i = 0; i < stops.length - 1; i++) {
        const gap = stops[i + 1].pos - stops[i].pos;
        if (gap > maxGap) {
            maxGap = gap;
            insertPos = (stops[i].pos + stops[i + 1].pos) / 2;
        }
    }
    State.settings.gradient.push({ pos: insertPos, r: 128, g: 128, b: 128 });
    State.settings.gradient.sort((a, b) => a.pos - b.pos);
    renderGradientEditor();
    Viz.render(document.getElementById('mainCanvas'));
}

function removeGradientStop(i) {
    if (State.settings.gradient.length <= 2) {
        showMessage('Need at least 2 gradient stops.', 'error');
        return;
    }
    State.settings.gradient.splice(i, 1);
    renderGradientEditor();
    Viz.render(document.getElementById('mainCanvas'));
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// SETTINGS SAVE / LOAD (JSON)
// ============================================================================

function saveSettings() {
    const settings = {
        version: 1,
        colorMode: State.settings.colorMode,
        cellShape: State.settings.cellShape,
        zScoreRange: State.settings.zScoreRange,
        cautionThreshold: State.settings.cautionThreshold,
        alertThreshold: State.settings.alertThreshold,
        gradient: State.settings.gradient,
        windowSize: State.view.windowSize,
        sortMode: State.settings.sortMode
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imladris_settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showMessage('Settings saved.', 'success');
}

function loadSettings(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const s = JSON.parse(e.target.result);
            if (s.colorMode) State.settings.colorMode = s.colorMode;
            if (s.cellShape) State.settings.cellShape = s.cellShape;
            if (s.zScoreRange) State.settings.zScoreRange = s.zScoreRange;
            if (s.cautionThreshold) State.settings.cautionThreshold = s.cautionThreshold;
            if (s.alertThreshold) State.settings.alertThreshold = s.alertThreshold;
            if (s.gradient) State.settings.gradient = s.gradient;
            if (s.sortMode) State.settings.sortMode = s.sortMode;
            if (s.windowSize) {
                State.view.windowSize = s.windowSize;
                const el = document.getElementById('windowSizeInput');
                if (el) el.value = s.windowSize;
            }
            setText('btnColorMode', State.settings.colorMode === 'rank' ? 'Color: Rank' : 'Color: Z-Score');
            const shapeLabels = { 'square': 'Cell: Square', 'dot': 'Cell: Dot', 'shape-by-rank': 'Cell: Shape' };
            setText('btnCellShape', shapeLabels[State.settings.cellShape] || 'Cell: Square');
            setText('btnSortMode', State.settings.sortMode === 'normal' ? 'Sort: Normal' : 'Sort: Middle-Out');
            renderGradientEditor();
            Viz.render(document.getElementById('mainCanvas'));
            showMessage('Settings loaded.', 'success');
        } catch (err) {
            showMessage('Failed to load settings — invalid file.', 'error');
        }
    };
    reader.readAsText(file);
}

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
