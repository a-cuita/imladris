// pattern.js — IMLADRIS Pattern Matching
// Dependencies: state.js, math.js
// "When have I felt like this before?"
// Finds past days with the most similar z-score profiles to a reference date

'use strict';

// ============================================================================
// EUCLIDEAN DISTANCE ON Z-SCORE VECTORS
// Compares two dates across a set of categories
// Lower distance = more similar profiles
// ============================================================================

function zScoreDistance(date1, date2, cats) {
    const c1 = State.cache[date1];
    const c2 = State.cache[date2];
    if (!c1 || !c2) return null;

    let sumSquared = 0;
    let count = 0;

    for (const cat of cats) {
        const z1 = c1.zScores[cat];
        const z2 = c2.zScores[cat];
        if (z1 === undefined || z1 === null) continue;
        if (z2 === undefined || z2 === null) continue;
        sumSquared += Math.pow(z1 - z2, 2);
        count++;
    }

    if (count === 0) return null;

    const distance = Math.sqrt(sumSquared / count); // normalize by category count
    // Convert to similarity: 0 distance = 100%, max meaningful distance ~3σ = 0%
    const similarity = Math.max(0, 100 - (distance / 3) * 100);

    return { distance, similarity, categoriesCompared: count };
}

// ============================================================================
// FIND SIMILAR PATTERNS
// Compares reference date against all other dates in history
// Returns top N matches sorted by similarity descending
// ============================================================================

function findSimilarDays(refDate, options = {}) {
    const {
        topN = 10,
        useAllCategories = State.pattern.useAllCategories,
        excludeWindow = 7  // exclude dates within this many days of refDate
    } = options;

    if (!State.cache[refDate]) return [];

    // Determine which categories to compare
    const cats = useAllCategories
        ? State.categories.filter(c => !State.view.hiddenCats.has(c))
        : State.categories.filter(c =>
            !State.view.hiddenCats.has(c) &&
            State.view.highlightedCats.has(c)
          );

    if (cats.length === 0) return [];

    const refTime = new Date(refDate).getTime();
    const windowMs = excludeWindow * 24 * 60 * 60 * 1000;

    const results = [];

    for (const entry of State.data) {
        const date = entry.date;
        if (date === refDate) continue;

        // Exclude dates too close to reference (they'll always look similar)
        const dateTime = new Date(date).getTime();
        if (Math.abs(dateTime - refTime) < windowMs) continue;

        const result = zScoreDistance(refDate, date, cats);
        if (!result) continue;

        results.push({
            date,
            similarity: result.similarity,
            distance: result.distance,
            categoriesCompared: result.categoriesCompared,
            overall: entry.overall,
            note: entry.note || ''
        });
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topN);
}

// ============================================================================
// RUN AND STORE
// Runs pattern match and stores results in State for ui.js to render
// ============================================================================

function runPatternMatch(refDate, options = {}) {
    if (!refDate) return;

    State.pattern.referenceDate = refDate;
    State.pattern.results = findSimilarDays(refDate, options);

    return State.pattern.results;
}

// ============================================================================
// EXPORTS
// ============================================================================

const Pattern = { runPatternMatch, findSimilarDays, zScoreDistance };
