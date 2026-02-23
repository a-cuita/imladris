// visualization.js — IMLADRIS Temporal Fingerprint
// Dependencies: state.js, math.js
// Renders: heatmap grid + OVR/IDX chart on a single canvas

'use strict';

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const VIZ = {
    // Margins
    marginLeft: 120,    // Category label area
    marginRight: 20,
    marginTop: 20,
    marginBottom: 60,   // Date label area

    // Row heights
    cellHeight: 18,     // Heatmap row height per category
    chartHeight: 80,    // OVR/IDX chart height
    chartGap: 16,       // Gap between heatmap and chart

    // Fonts
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 11,
    labelFontSize: 12,

    // Colors
    bg: '#0a0e17',
    gridLine: '#1f2937',
    textPrimary: '#e5e7eb',
    textMuted: '#6b7280',
    ovrColor: '#10b981',    // Green — OVERALL
    idxColor: '#cc5200',    // Orange — INDEX
    zeroLine: '#374151',

    // Blank cell (same rank as sort reference)
    blankCell: '#0a0e17',   // Same as background — invisible

    // Color driven by State.settings.gradient — edit stops there, not here
};

// ============================================================================
// MAIN RENDER
// Called by animation.js each frame, and directly on state changes
// ============================================================================

function render(canvas) {
    if (!canvas) return;
    if (!State.data || State.data.length === 0) return;

    const ctx = canvas.getContext('2d');

    // Determine visible date window
    const allDates = State.data.map(d => d.date);
    const sortedDates = [...allDates]; // already chronological
    const windowSize = State.view.windowSize;

    // Find anchor: current animation date or last date
    const anchorDate = State.animation.currentDate || sortedDates[sortedDates.length - 1];
    const anchorIdx = sortedDates.indexOf(anchorDate);
    const endIdx = anchorIdx;
    const startIdx = Math.max(0, endIdx - windowSize + 1);
    const visibleDates = sortedDates.slice(startIdx, endIdx + 1);

    if (visibleDates.length === 0) return;

    // Sort reference date
    const sortRef = State.sortMode === 'manual' && State.view.sortDate
        ? State.view.sortDate
        : anchorDate;

    // Get sort reference ranks
    const refCache = State.cache[sortRef];
    const refRanks = refCache ? refCache.ranks : {};

    // Sorted category order (by rank on sort reference date)
    const cats = [...State.categories].filter(c => !State.view.hiddenCats.has(c));
    const sortedCats = [...cats].sort((a, b) => {
        const ra = refRanks[a] ?? 999;
        const rb = refRanks[b] ?? 999;
        return ra - rb;
    });

    const numCats = sortedCats.length;
    const numDates = visibleDates.length;

    // Canvas sizing
    const heatmapW = canvas.width - VIZ.marginLeft - VIZ.marginRight;
    const cellWidth = heatmapW / numDates;
    const heatmapH = numCats * VIZ.cellHeight;
    const totalH = VIZ.marginTop + heatmapH + VIZ.chartGap + VIZ.chartHeight + VIZ.marginBottom;

    canvas.height = totalH;

    // Clear
    ctx.fillStyle = VIZ.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ----------------------------------------------------------------
    // HEATMAP
    // ----------------------------------------------------------------
    const heatTop = VIZ.marginTop;

    sortedCats.forEach((cat, rowIdx) => {
        const y = heatTop + rowIdx * VIZ.cellHeight;
        const refRank = refRanks[cat];

        // Category label (left margin)
        const isHighlighted = State.view.highlightedCats.has(cat);
        ctx.fillStyle = isHighlighted ? '#facc15' : VIZ.textMuted;
        ctx.font = `${isHighlighted ? 600 : 400} ${VIZ.fontSize}px ${VIZ.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat, VIZ.marginLeft - 6, y + VIZ.cellHeight / 2);

        visibleDates.forEach((date, colIdx) => {
            const x = VIZ.marginLeft + colIdx * cellWidth;
            const cached = State.cache[date];
            if (!cached) return;

            const rank = cached.ranks[cat];
            const isBlank = rank === refRank; // same rank as sort reference → blank

            if (isBlank) {
                ctx.fillStyle = VIZ.blankCell;
                ctx.fillRect(x, y, cellWidth - 1, VIZ.cellHeight - 1);
                return;
            }

            // Color by rank position or signed z-score depending on colorMode
            const z = cached.zScores[cat];
            if (z === undefined || z === null) {
                ctx.fillStyle = '#1f2937';
                ctx.fillRect(x, y, cellWidth - 1, VIZ.cellHeight - 1);
                return;
            }

            let pos; // 0.0 = worst, 1.0 = best
            if (State.settings.colorMode === 'rank') {
                const rank = cached.ranks[cat];
                const n = cats.length;
                pos = n > 1 ? (rank - 1) / (n - 1) : 0.5;
            } else {
                // zscore mode: map signed z across defined range
                const range = State.settings.zScoreRange || 3;
                pos = Math.max(0, Math.min(1, (z + range) / (2 * range)));
            }

            ctx.fillStyle = gradientColor(pos, State.settings.gradient);
            ctx.fillRect(x, y, cellWidth - 1, VIZ.cellHeight - 1);
        });
    });

    // ----------------------------------------------------------------
    // OVR / IDX CHART
    // ----------------------------------------------------------------
    const chartTop = heatTop + heatmapH + VIZ.chartGap;
    const chartLeft = VIZ.marginLeft;
    const chartW = heatmapW;

    // Chart background
    ctx.fillStyle = '#111827';
    ctx.fillRect(chartLeft, chartTop, chartW, VIZ.chartHeight);

    // Collect z-score values for scaling
    const ovrZs = visibleDates.map(d => State.cache[d]?.overallZ ?? null);
    const idxZs = visibleDates.map(d => State.cache[d]?.indexZ ?? null);
    const allZ = [...ovrZs, ...idxZs].filter(v => v !== null);

    if (allZ.length > 0) {
        const minZ = Math.min(...allZ, -2);
        const maxZ = Math.max(...allZ, 2);
        const rangeZ = maxZ - minZ || 1;

        const toY = (z) => chartTop + VIZ.chartHeight - ((z - minZ) / rangeZ) * VIZ.chartHeight;

        // Zero line
        const zeroY = toY(0);
        ctx.strokeStyle = VIZ.zeroLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartLeft, zeroY);
        ctx.lineTo(chartLeft + chartW, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw line helper
        const drawLine = (values, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let started = false;
            values.forEach((z, i) => {
                if (z === null) { started = false; return; }
                const x = chartLeft + (i / visibleDates.length) * chartW + cellWidth / 2;
                const y = toY(z);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        drawLine(idxZs, VIZ.idxColor);
        drawLine(ovrZs, VIZ.ovrColor);

        // Y-axis labels
        ctx.fillStyle = VIZ.textMuted;
        ctx.font = `10px ${VIZ.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        [-2, -1, 0, 1, 2].forEach(z => {
            if (z >= minZ && z <= maxZ) {
                ctx.fillText(z === 0 ? '0' : `${z > 0 ? '+' : ''}${z}σ`, chartLeft - 4, toY(z));
            }
        });
    }

    // ----------------------------------------------------------------
    // DATE LABELS (bottom)
    // ----------------------------------------------------------------
    ctx.fillStyle = VIZ.textMuted;
    ctx.font = `10px ${VIZ.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelEvery = Math.max(1, Math.floor(numDates / 20));
    let lastYear = null;

    visibleDates.forEach((date, i) => {
        if (i % labelEvery !== 0) return;
        const x = VIZ.marginLeft + i * cellWidth + cellWidth / 2;
        const y = chartTop + VIZ.chartHeight + 6;
        const year = date.substring(0, 4);
        const label = (lastYear && lastYear !== year) ? date : date.substring(5);
        lastYear = year;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });

    // ----------------------------------------------------------------
    // CURRENT DATE INDICATOR
    // ----------------------------------------------------------------
    const anchorColIdx = visibleDates.indexOf(anchorDate);
    if (anchorColIdx >= 0) {
        const x = VIZ.marginLeft + anchorColIdx * cellWidth;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, heatTop);
        ctx.lineTo(x, chartTop + VIZ.chartHeight);
        ctx.stroke();
    }

    // ----------------------------------------------------------------
    // CHART LEGEND
    // ----------------------------------------------------------------
    const legendY = chartTop + 6;
    const legendX = chartLeft + chartW - 120;
    ctx.font = `11px ${VIZ.fontFamily}`;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = VIZ.ovrColor;
    ctx.fillRect(legendX, legendY, 20, 2);
    ctx.textAlign = 'left';
    ctx.fillText('OVERALL', legendX + 24, legendY + 1);

    ctx.fillStyle = VIZ.idxColor;
    ctx.fillRect(legendX, legendY + 14, 20, 2);
    ctx.fillText('INDEX', legendX + 24, legendY + 15);
}

// ============================================================================
// COLOR HELPERS
// ============================================================================

// Interpolate across gradient stops array
// stops: [{ pos: 0-1, r, g, b }, ...] sorted by pos ascending
// t: 0.0 = worst end, 1.0 = best end
function gradientColor(t, stops) {
    if (!stops || stops.length === 0) return '#888888';
    if (stops.length === 1) return `rgb(${stops[0].r},${stops[0].g},${stops[0].b})`;

    // Clamp
    t = Math.max(0, Math.min(1, t));

    // Find surrounding stops
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].pos && t <= stops[i + 1].pos) {
            lo = stops[i];
            hi = stops[i + 1];
            break;
        }
    }

    // Interpolate
    const range = hi.pos - lo.pos || 1;
    const local = (t - lo.pos) / range;
    const r = Math.round(lo.r + (hi.r - lo.r) * local);
    const g = Math.round(lo.g + (hi.g - lo.g) * local);
    const b = Math.round(lo.b + (hi.b - lo.b) * local);
    return `rgb(${r},${g},${b})`;
}

// ============================================================================
// EXPORTS
// ============================================================================

const Viz = { render };
