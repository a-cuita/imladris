// math.js — IMLADRIS Core Calculations
// Dependencies: state.js
// Provides: buildPointInTimeCache, getZScore, getRank, getINDEX, getDivergence

'use strict';

// ============================================================================
// POINT-IN-TIME CACHE
// Structure: { "2025-09-17": { zScores: {cat: z}, ranks: {cat: r}, index: z, overallZ: z } }
// Each date uses only data up to and including that date — never future data.
// ============================================================================

function buildPointInTimeCache() {
    State.cache = {};

    const sorted = State.data; // data.js guarantees chronological sort
    if (!sorted || sorted.length === 0) return;

    const cats = State.categories;

    for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        const date = entry.date;

        // Historical window: all entries up to and including today
        const history = sorted.slice(0, i + 1);

        // ----------------------------------------------------------------
        // STEP 1: Per-category z-scores (point-in-time)
        // ----------------------------------------------------------------
        const stats = {};
        for (const cat of cats) {
            const values = history
                .map(d => d.values[cat])
                .filter(v => v !== null && v !== undefined && !isNaN(v));

            if (values.length < 2) continue;

            const mean = values.reduce((s, v) => s + v, 0) / values.length;
            const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
            const std = Math.sqrt(variance) || 1; // guard against zero std

            stats[cat] = { mean, std };
        }

        const zScores = {};
        for (const cat of cats) {
            const val = entry.values[cat];
            if (val !== null && val !== undefined && !isNaN(val) && stats[cat]) {
                zScores[cat] = (val - stats[cat].mean) / stats[cat].std;
            }
        }

        // ----------------------------------------------------------------
        // STEP 2: Ranking — signed z-score ascending
        // Most negative z = rank 1 (most dragging you down)
        // Most positive z = rank N (most holding you up)
        // ----------------------------------------------------------------
        const ranked = Object.entries(zScores).sort(([, a], [, b]) => a - b);
        const ranks = {};
        ranked.forEach(([cat], idx) => {
            ranks[cat] = idx + 1;
        });

        // ----------------------------------------------------------------
        // STEP 3: INDEX — z-score of the raw category average
        // Raw average for each day → z-score that average against history
        // ----------------------------------------------------------------
        const rawAvg = (vals) => {
            const v = vals.filter(x => x !== null && x !== undefined && !isNaN(x));
            return v.length > 0 ? v.reduce((s, x) => s + x, 0) / v.length : null;
        };

        const todayAvg = rawAvg(cats.map(c => entry.values[c]));
        let indexZ = null;

        if (todayAvg !== null) {
            const historicalAvgs = history
                .map(d => rawAvg(cats.map(c => d.values[c])))
                .filter(v => v !== null);

            if (historicalAvgs.length >= 2) {
                const avgMean = historicalAvgs.reduce((s, v) => s + v, 0) / historicalAvgs.length;
                const avgVariance = historicalAvgs.reduce((s, v) => s + Math.pow(v - avgMean, 2), 0) / historicalAvgs.length;
                const avgStd = Math.sqrt(avgVariance) || 1;
                indexZ = (todayAvg - avgMean) / avgStd;
            }
        }

        // ----------------------------------------------------------------
        // STEP 4: OVERALL z-score (point-in-time)
        // ----------------------------------------------------------------
        const overallHistory = history
            .map(d => d.overall)
            .filter(v => v !== null && !isNaN(v));

        let overallZ = null;
        if (overallHistory.length >= 2) {
            const oMean = overallHistory.reduce((s, v) => s + v, 0) / overallHistory.length;
            const oVariance = overallHistory.reduce((s, v) => s + Math.pow(v - oMean, 2), 0) / overallHistory.length;
            const oStd = Math.sqrt(oVariance) || 1;
            overallZ = (entry.overall - oMean) / oStd;
        }

        // ----------------------------------------------------------------
        // STORE
        // ----------------------------------------------------------------
        State.cache[date] = {
            zScores,   // { cat: z }
            ranks,     // { cat: rank (1=worst, N=best) }
            indexZ,    // z-score of raw category average — null if insufficient history
            overallZ,  // z-score of OVERALL — null if insufficient history
            rawAvg: todayAvg
        };
    }
}

// ============================================================================
// DIVERGENCE
// gap = overallZ - indexZ  (positive = felt better than numbers say)
// divergence = absolute gap (magnitude regardless of direction)
// ============================================================================

function getDivergence(date) {
    const cached = State.cache[date];
    if (!cached || cached.indexZ === null || cached.overallZ === null) return null;

    const gap = cached.overallZ - cached.indexZ;
    const divergence = Math.abs(gap);

    let status = 'harmony';
    if (divergence >= State.settings.alertThreshold) status = 'alert';
    else if (divergence >= State.settings.cautionThreshold) status = 'caution';

    return { gap, divergence, status, overallZ: cached.overallZ, indexZ: cached.indexZ };
}

// ============================================================================
// EXPORTS
// ============================================================================

const Math_ = { buildPointInTimeCache, getDivergence };
