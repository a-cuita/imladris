// visualization.js — IMLADRIS Temporal Fingerprint
// Dependencies: state.js, math.js
// Renders: heatmap grid with OVR/IDX lines overlaid

'use strict';

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const VIZ = {
    // Margins
    marginLeft: 120,    // Category label area
    marginRight: 60,    // Right margin — OVR/IDX y-axis labels go here
    marginTop: 20,
    marginBottom: 60,   // Date label area

    // Row heights
    cellHeight: 18,     // Heatmap row height per category — overridden dynamically by mode

    // Fonts
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 11,

    // Colors
    bg: '#0a0e17',
    textPrimary: '#e5e7eb',
    textMuted: '#6b7280',
    ovrColor: '#10b981',
    idxColor: '#cc5200',
    zeroLine: 'rgba(255,255,255,0.12)',
    highlightRow: 'rgba(250,204,21,0.12)',
    blankCell: '#161d2e',    // Subtle fill — visible but recedes
    gridLine: '#0d1420',        // Slightly darker gap between cells

    // Color driven by State.settings.gradient
};

// ============================================================================
// MAIN RENDER
// ============================================================================

function render(canvas) {
    if (!canvas) return;
    if (!State.data || State.data.length === 0) return;

    const ctx = canvas.getContext('2d');

    const sortedDates = State.data.map(d => d.date);
    const windowSize = State.view.windowSize;
    const anchorDate = State.animation.currentDate || sortedDates[sortedDates.length - 1];
    const anchorIdx = sortedDates.indexOf(anchorDate);
    const startIdx = Math.max(0, anchorIdx - windowSize + 1);
    const visibleDates = sortedDates.slice(startIdx, anchorIdx + 1);

    if (visibleDates.length === 0) return;

    const sortRef = State.sortMode === 'manual' && State.view.sortDate
        ? State.view.sortDate
        : anchorDate;

    const refCache = State.cache[sortRef];
    const refRanks = refCache ? refCache.ranks : {};

    const cats = [...State.categories].filter(c => !State.view.hiddenCats.has(c));
    const rankSorted = [...cats].sort((a, b) => (refRanks[a] ?? 999) - (refRanks[b] ?? 999));

    // Sort modes: 'normal' (rank 1 top) or 'middleOut' (extremes meet in center)
    let sortedCats;
    if (State.settings.sortMode === 'middleOut') {
        const half = Math.floor(rankSorted.length / 2);
        sortedCats = [
            ...rankSorted.slice(0, half).reverse(),  // rank N/2 down to rank 1
            ...rankSorted.slice(half).reverse()       // rank N down to rank N/2+1
        ];
    } else {
        sortedCats = rankSorted;
    }

    // Dynamic row height by cell mode
    const cellMode = State.settings.cellShape || 'square';
    if (cellMode === 'dot') VIZ.cellHeight = 7;
    else if (cellMode === 'shape-by-rank') VIZ.cellHeight = 11;
    else VIZ.cellHeight = 11;  // square — nearly touching

    const numCats = sortedCats.length;
    const numDates = visibleDates.length;

    const heatmapW = canvas.width - VIZ.marginLeft - VIZ.marginRight;
    const cellWidth = heatmapW / numDates;
    const heatmapH = numCats * VIZ.cellHeight;
    const totalH = VIZ.marginTop + heatmapH + VIZ.marginBottom;

    canvas.height = totalH;

    ctx.fillStyle = VIZ.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const heatTop = VIZ.marginTop;

    // ----------------------------------------------------------------
    // HEATMAP ROWS
    // ----------------------------------------------------------------
    sortedCats.forEach((cat, rowIdx) => {
        const y = heatTop + rowIdx * VIZ.cellHeight;
        const refRank = refRanks[cat];
        const isHighlighted = State.view.highlightedCats.has(cat);

        if (isHighlighted) {
            ctx.fillStyle = VIZ.highlightRow;
            ctx.fillRect(VIZ.marginLeft, y, heatmapW, VIZ.cellHeight);
        }

        ctx.fillStyle = isHighlighted ? '#facc15' : VIZ.textMuted;
        ctx.font = `${isHighlighted ? '600' : '400'} ${VIZ.fontSize}px ${VIZ.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat, VIZ.marginLeft - 6, y + VIZ.cellHeight / 2);

        visibleDates.forEach((date, colIdx) => {
            const x = VIZ.marginLeft + colIdx * cellWidth;
            const cached = State.cache[date];
            if (!cached) return;

            const rank = cached.ranks[cat];
            const isBlank = rank === refRank;
            const mode = State.settings.cellShape || 'square';

            if (isBlank) {
                // shape-by-rank blank = very dim square; others = blankCell fill
                if (mode === 'shape-by-rank') {
                    ctx.fillStyle = 'rgba(80,80,90,0.18)';
                    drawCell(ctx, x, y, cellWidth, VIZ.cellHeight, 'blank-square');
                } else {
                    ctx.fillStyle = VIZ.blankCell;
                    drawCell(ctx, x, y, cellWidth, VIZ.cellHeight, mode);
                }
                return;
            }

            const z = cached.zScores[cat];
            if (z === undefined || z === null) {
                ctx.fillStyle = '#1f2937';
                drawCell(ctx, x, y, cellWidth, VIZ.cellHeight, 'blank-square');
                return;
            }

            let pos;
            if (State.settings.colorMode === 'rank') {
                const n = cats.length;
                pos = n > 1 ? (rank - 1) / (n - 1) : 0.5;
            } else {
                const range = State.settings.zScoreRange || 3;
                pos = Math.max(0, Math.min(1, (z + range) / (2 * range)));
            }

            ctx.fillStyle = gradientColor(pos, State.settings.gradient);
            drawCell(ctx, x, y, cellWidth, VIZ.cellHeight, mode, rank);
        });
    });

    // ----------------------------------------------------------------
    // OVR / IDX OVERLAY — drawn over heatmap
    // ----------------------------------------------------------------
    const ovrZs = visibleDates.map(d => State.cache[d]?.overallZ ?? null);
    const idxZs = visibleDates.map(d => State.cache[d]?.indexZ ?? null);
    const allZ = [...ovrZs, ...idxZs].filter(v => v !== null);

    if (allZ.length > 0) {
        // Range based on visible window OVR/IDX values
        // minZ anchors to bottom of heatmap, maxZ anchors to top
        const minZ = Math.min(...allZ);
        const maxZ = Math.max(...allZ);
        const rangeZ = maxZ - minZ || 1;

        const toY = (z) => heatTop + heatmapH - ((z - minZ) / rangeZ) * heatmapH;

        // Zero line
        ctx.strokeStyle = VIZ.zeroLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(VIZ.marginLeft, toY(0));
        ctx.lineTo(VIZ.marginLeft + heatmapW, toY(0));
        ctx.stroke();
        ctx.setLineDash([]);

        const drawLine = (values, color, lineWidth) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            let started = false;
            values.forEach((z, i) => {
                if (z === null) { started = false; return; }
                const x = VIZ.marginLeft + (i + 0.5) * cellWidth;
                const y = toY(z);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        drawLine(idxZs, VIZ.idxColor, 1.5);
        drawLine(ovrZs, VIZ.ovrColor, 1.5);

        // Y-axis labels — RIGHT side
        ctx.fillStyle = VIZ.textMuted;
        ctx.font = `10px ${VIZ.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labelX = VIZ.marginLeft + heatmapW + 6;
        [-2, -1, 0, 1, 2].forEach(z => {
            if (z >= minZ && z <= maxZ) {
                ctx.fillText(`${z > 0 ? '+' : ''}${z === 0 ? '0' : z}σ`, labelX, toY(z));
            }
        });

        // Legend — top right of heatmap
        const legendX = VIZ.marginLeft + heatmapW - 90;
        const legendY = heatTop + 8;
        ctx.font = `10px ${VIZ.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = VIZ.ovrColor;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(legendX, legendY); ctx.lineTo(legendX + 14, legendY); ctx.stroke();
        ctx.fillStyle = VIZ.ovrColor;
        ctx.fillText('OVR', legendX + 18, legendY);

        ctx.strokeStyle = VIZ.idxColor;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(legendX, legendY + 14); ctx.lineTo(legendX + 14, legendY + 14); ctx.stroke();
        ctx.fillStyle = VIZ.idxColor;
        ctx.fillText('IDX', legendX + 18, legendY + 14);
    }

    // ----------------------------------------------------------------
    // MOST RECENT INDICATOR
    // ----------------------------------------------------------------
    const anchorColIdx = visibleDates.indexOf(anchorDate);
    if (anchorColIdx >= 0) {
        const x = VIZ.marginLeft + (anchorColIdx + 1) * cellWidth - 1;

        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, heatTop);
        ctx.lineTo(x, heatTop + heatmapH);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 10px ${VIZ.fontFamily}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(anchorDate, x - 2, heatTop - 2);
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
        const y = heatTop + heatmapH + 6;
        const year = date.substring(0, 4);
        const label = (lastYear && lastYear !== year) ? date : date.substring(5);
        lastYear = year;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });
}

// ============================================================================
// CELL SHAPE RENDERER
// ============================================================================

function drawCell(ctx, x, y, w, h, shape, rank) {
    const pad = 1;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const size = Math.max(2, Math.min(w, h) - pad * 2);
    const half = size / 2;

    switch (shape) {
        case 'square': {
            // Fill nearly full cell — 1px gap total (0.5px each side)
            ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
            break;
        }
        case 'dot': {
            // Small circle, collapsed row
            const r = Math.max(1, half * 0.6);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'shape-by-rank': {
            // rank 1-based, cycle: 0=circle, 1=triangle, 2=square, 3=diamond
            const shapeIdx = ((rank || 1) - 1) % 4;
            const r = Math.max(1, half * 0.85);
            if (shapeIdx === 0) {
                // Circle
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (shapeIdx === 1) {
                // Triangle (pointing up)
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx + r, cy + r * 0.7);
                ctx.lineTo(cx - r, cy + r * 0.7);
                ctx.closePath();
                ctx.fill();
            } else if (shapeIdx === 2) {
                // Square
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            } else {
                // Diamond
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx + r, cy);
                ctx.lineTo(cx, cy + r);
                ctx.lineTo(cx - r, cy);
                ctx.closePath();
                ctx.fill();
            }
            break;
        }
        case 'blank-square': {
            // Very dim square for null/blank cells in shape-by-rank mode
            const s = Math.max(2, half * 0.7);
            ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
            break;
        }
        case 'rect':
        default:
            ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
            break;
    }
}

// ============================================================================
// GRADIENT INTERPOLATION
// ============================================================================

function gradientColor(t, stops) {
    if (!stops || stops.length === 0) return '#888888';
    if (stops.length === 1) return `rgb(${stops[0].r},${stops[0].g},${stops[0].b})`;

    t = Math.max(0, Math.min(1, t));

    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].pos && t <= stops[i + 1].pos) {
            lo = stops[i];
            hi = stops[i + 1];
            break;
        }
    }

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
