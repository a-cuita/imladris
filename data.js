// data.js — IMLADRIS Data Ingestion
// Dependencies: state.js
// Responsibilities: CSV parsing, validation, loading into State

'use strict';

// ============================================================================
// CSV PARSING
// Expected columns: date, [categories...], OVERALL, NOTE (optional)
// IDX_* columns are recognized and stored separately
// Category columns = everything that isn't date, OVERALL, NOTE, or IDX_*
// ============================================================================

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must contain a header row and at least one data row.');

    const headers = lines[0].split(',').map(h => h.trim());

    if (!headers.includes('OVERALL')) throw new Error('CSV must include an OVERALL column.');

    // Identify special columns
    const dateCol = 0; // First column is always date
    const overallCol = headers.indexOf('OVERALL');
    const noteCol = headers.findIndex(h => h.toUpperCase() === 'NOTE');
    const idxCols = headers
        .map((h, i) => ({ name: h, i }))
        .filter(c => c.name.startsWith('IDX_'));

    const reservedCols = new Set([
        dateCol,
        overallCol,
        noteCol,
        ...idxCols.map(c => c.i)
    ]);

    // Category columns: everything that isn't reserved
    const catCols = headers
        .map((h, i) => ({ name: h, i }))
        .filter(c => !reservedCols.has(c.i));

    if (catCols.length === 0) throw new Error('CSV must include at least one category column.');

    // Parse data rows
    const data = [];
    for (let r = 1; r < lines.length; r++) {
        const line = lines[r].trim();
        if (!line) continue;

        const vals = line.split(',').map(v => v.trim());
        if (vals.length !== headers.length) continue;

        // Date
        const dateRaw = vals[dateCol];
        const date = new Date(dateRaw);
        if (isNaN(date.getTime())) continue;
        const dateStr = date.toISOString().split('T')[0];

        // OVERALL
        const overall = parseFloat(vals[overallCol]);
        if (isNaN(overall)) continue;

        // Category values — null if missing or non-numeric
        const values = {};
        for (const col of catCols) {
            const v = parseFloat(vals[col.i]);
            values[col.name] = isNaN(v) ? null : v;
        }

        // IDX_* columns (user-defined indices from sheet)
        const indices = {};
        for (const col of idxCols) {
            const v = parseFloat(vals[col.i]);
            indices[col.name] = isNaN(v) ? null : v;
        }

        // NOTE
        const note = noteCol !== -1 ? (vals[noteCol] || '') : '';

        data.push({ date: dateStr, overall, values, indices, note });
    }

    if (data.length === 0) throw new Error('No valid data rows found.');

    // Sort chronologically
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        categories: catCols.map(c => c.name),
        data
    };
}

// ============================================================================
// LOAD INTO STATE
// Parses CSV, resets state, populates State.data and State.categories,
// then triggers cache build in math.js
// ============================================================================

function loadCSV(text) {
    const { categories, data } = parseCSV(text);

    State.reset();
    State.categories = categories;
    State.data = data;

    // Build point-in-time calculation cache
    buildPointInTimeCache();

    // Set initial animation date to most recent entry
    State.animation.currentDate = data[data.length - 1].date;

    return {
        rowCount: data.length,
        categoryCount: categories.length,
        dateRange: { from: data[0].date, to: data[data.length - 1].date }
    };
}

// ============================================================================
// FILE INPUT HANDLER
// Wires to a file <input> element in index.html
// ============================================================================

function handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const summary = loadCSV(e.target.result);
            console.log(`IMLADRIS: Loaded ${summary.rowCount} entries, ${summary.categoryCount} categories (${summary.dateRange.from} → ${summary.dateRange.to})`);
            // ui.js will listen for state changes and re-render
            if (typeof onDataLoaded === 'function') onDataLoaded(summary);
        } catch (err) {
            console.error('IMLADRIS load error:', err.message);
            if (typeof onDataError === 'function') onDataError(err.message);
        }
    };
    reader.readAsText(file, 'ISO-8859-1');
}

// ============================================================================
// EXPORTS
// ============================================================================

const Data = { loadCSV, handleFileInput };
