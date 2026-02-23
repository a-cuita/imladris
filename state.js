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
        speed: 400,             // ms per frame
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
        colorScheme: 'earth'     // 'earth' | 'heat'
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
