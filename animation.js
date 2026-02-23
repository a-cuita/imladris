// animation.js — IMLADRIS Two-Frame Animation Engine
// Dependencies: state.js, visualization.js
// The two-frame beat: presort → sorted → next date → presort → sorted → ...

'use strict';

// ============================================================================
// CORE ANIMATION LOOP
// Each "beat" is two frames per date:
//   Frame 1 (presort)  — categories in their PREVIOUS sort order
//   Frame 2 (sorted)   — categories sorted by current date's ranks
// This creates the rolling/sliding motion that reveals pattern transitions
// ============================================================================

function startAnimation(canvas) {
    if (State.animation.active) return;
    if (!State.data || State.data.length === 0) return;

    State.animation.active = true;
    State.animation.frame = 'presort';

    State.animation.timer = setInterval(() => {
        tick(canvas);
    }, State.animation.speed);
}

function stopAnimation() {
    if (State.animation.timer) {
        clearInterval(State.animation.timer);
        State.animation.timer = null;
    }
    State.animation.active = false;
}

function tick(canvas) {
    const sorted = State.data.map(d => d.date); // already chronological
    const current = State.animation.currentDate;
    const idx = sorted.indexOf(current);

    if (State.animation.frame === 'presort') {
        // Frame 1: render with PREVIOUS date's sort order
        // view.sortDate temporarily holds the previous date for this frame
        const prevIdx = idx - State.animation.direction;
        if (prevIdx >= 0 && prevIdx < sorted.length) {
            State.view.sortDate = sorted[prevIdx];
        }
        State.sortMode = 'manual'; // use sortDate for this frame
        Viz.render(canvas);
        State.animation.frame = 'sorted';

    } else {
        // Frame 2: render with CURRENT date's sort order
        State.view.sortDate = current;
        State.sortMode = 'manual';
        Viz.render(canvas);
        State.animation.frame = 'presort';

        // Advance to next date
        const nextIdx = idx + State.animation.direction;
        if (nextIdx < 0 || nextIdx >= sorted.length) {
            // Hit the boundary — stop
            stopAnimation();
            State.sortMode = 'auto';
            State.view.sortDate = null;
            return;
        }

        State.animation.currentDate = sorted[nextIdx];

        // Auto mode: sort always follows current date
        if (State.sortMode !== 'manual') {
            State.view.sortDate = State.animation.currentDate;
        }
    }
}

// ============================================================================
// CONTROLS
// ============================================================================

function setSpeed(ms) {
    State.animation.speed = ms;
    if (State.animation.active) {
        // Restart timer with new speed
        stopAnimation();
        // small delay to let the stop register
        setTimeout(() => startAnimation(getCanvas()), 10);
    }
}

function setDirection(dir) {
    // dir: 1 = forward, -1 = reverse
    State.animation.direction = dir;
}

function stepForward(canvas) {
    if (State.animation.active) return;
    const sorted = State.data.map(d => d.date);
    const idx = sorted.indexOf(State.animation.currentDate);
    if (idx < sorted.length - 1) {
        State.animation.currentDate = sorted[idx + 1];
        State.view.sortDate = State.animation.currentDate;
        State.sortMode = 'manual';
        Viz.render(canvas);
    }
}

function stepBack(canvas) {
    if (State.animation.active) return;
    const sorted = State.data.map(d => d.date);
    const idx = sorted.indexOf(State.animation.currentDate);
    if (idx > 0) {
        State.animation.currentDate = sorted[idx - 1];
        State.view.sortDate = State.animation.currentDate;
        State.sortMode = 'manual';
        Viz.render(canvas);
    }
}

function jumpToDate(date, canvas) {
    stopAnimation();
    if (State.cache[date]) {
        State.animation.currentDate = date;
        State.view.sortDate = date;
        State.sortMode = 'manual';
        Viz.render(canvas);
    }
}

function resetToLatest(canvas) {
    stopAnimation();
    const sorted = State.data.map(d => d.date);
    State.animation.currentDate = sorted[sorted.length - 1];
    State.sortMode = 'auto';
    State.view.sortDate = null;
    Viz.render(canvas);
}

// ============================================================================
// CANVAS REFERENCE
// ui.js sets this after DOM is ready
// ============================================================================

let _canvas = null;

function setCanvas(canvas) {
    _canvas = canvas;
}

function getCanvas() {
    return _canvas;
}

// ============================================================================
// KEYBOARD HANDLER
// Arrow keys for manual stepping when animation is stopped
// ============================================================================

function handleKeydown(e) {
    if (!_canvas) return;
    if (State.animation.active) return; // keys inactive during animation

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepForward(_canvas);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBack(_canvas);
    }
}

document.addEventListener('keydown', handleKeydown);

// ============================================================================
// EXPORTS
// ============================================================================

const Anim = {
    start: startAnimation,
    stop: stopAnimation,
    stepForward,
    stepBack,
    jumpToDate,
    resetToLatest,
    setSpeed,
    setDirection,
    setCanvas
};
