// state.js — IMLADRIS Global State
// Single source of truth. All modules read and write through here.
// No module should reach directly into another module's internals.

'use strict';

const State = {

    // ----------------------------------------------------------------
    // DATA
    // Raw ingested entries, sorted chronologically by data.js
    // Structure: [{ date: "2025-09-17", overall: 60, values: { ".pro": 40, ... }, note: "" }]
    // ----------------------------------------------------------------
    data: [],

    // ----------------------------------------------------------------
    // CATEGORIES
    // Ordered list of category IDs, derived from CSV headers by data.js
    // Structure: [".pro", ".scl", ".fit", ...]
    // ----------------------------------------------------------------
    categories: [],

    // ----------------------------------------------------------------
    // CACHE
    // Point-in-time calculation results, keyed by date string
    // Built by math.js — do not write directly
    // Structure: { "2025-09-17": { zScores, ranks, indexZ, overallZ, rawAvg } }
    // ----------------------------------------------------------------
    cache: {},

    // ----------------------------------------------------------------
    // ANIMATION
    // ----------------------------------------------------------------
    animation: {
        active: false,
        currentDate: null,      // Date string currently displayed
        frame: 'presort',       // 'presort' | 'sorted' — two-frame beat
        direction: 1,           // 1 = forward, -1 = reverse
        speed: 500,             // ms per frame
        timer: null             // setInterval handle
    },

    // ----------------------------------------------------------------
    // VIEW
    // Controls what's visible in the visualization
    // ----------------------------------------------------------------
    view: {
        sortDate: null,         // Date used for category sort order (manual mode)
        windowSize: 90,         // Number of days visible
        highlightedCats: new Set(),
        hiddenCats: new Set()
    },

    // ----------------------------------------------------------------
    // SORTING
    // 'auto'   — sort follows animation / rightmost visible date
    // 'manual' — user controls via sortDate
    // ----------------------------------------------------------------
    sortMode: 'auto',

    // ----------------------------------------------------------------
    // PATTERN MATCHING
    // ----------------------------------------------------------------
    pattern: {
        referenceDate: null,
        useAllCategories: true,
        results: []             // [{ date, similarity, distance }]
    },

    // ----------------------------------------------------------------
    // SETTINGS
    // Tunable thresholds and display options — never hardcoded in math.js
    // ----------------------------------------------------------------
    settings: {
        cautionThreshold: 0.75,  // |gap| >= this → caution
        alertThreshold: 1.5,     // |gap| >= this → alert

        // Color mode:
        // 'rank'   — color assigned by rank position (0=worst, 1=best), fully stretched every day
        // 'zscore' — color assigned by actual signed z-score, anchored to zScoreRange
        colorMode: 'rank',
        cellShape: 'rect',       // 'rect' | 'circle' | 'dot'
        sortMode: 'normal',     // 'normal' | 'middleOut'
        zScoreRange: 3,          // z-score value mapped to gradient endpoints (mode: zscore only)

        // Gradient stops — editable array, interpolated in order
        // pos: 0.0 = worst/most negative, 1.0 = best/most positive
        // Add, remove, or reposition stops freely
        gradient: [
            { pos: 0.0,  r: 220, g: 50,  b: 50  },   // worst — red
            { pos: 0.5,  r: 40,  g: 40,  b: 40  },   // neutral — dark grey
            { pos: 1.0,  r: 50,  g: 150, b: 220 }    // best — blue
        ]
    },

    // ----------------------------------------------------------------
    // RESET
    // Called when new data is loaded — clears all derived state
    // ----------------------------------------------------------------
    reset() {
        this.data = [];
        this.categories = [];
        this.cache = {};
        this.animation.active = false;
        this.animation.currentDate = null;
        this.animation.frame = 'presort';
        if (this.animation.timer) {
            clearInterval(this.animation.timer);
            this.animation.timer = null;
        }
        this.view.sortDate = null;
        this.view.highlightedCats = new Set();
        this.view.hiddenCats = new Set();
        this.sortMode = 'auto';
        this.pattern.referenceDate = null;
        this.pattern.results = [];
    }
};
