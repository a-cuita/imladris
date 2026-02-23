# IMLADRIS

**Integrated Models Linking Analytics Directly, Retroactively, and In-Situ**

IMLADRIS is a personal analytics methodology that compares objective composite scores (INDEX) against subjective human perception (OVERALL) to surface meaningful divergences — the gap between what the numbers say and what you actually felt.

---

## What It Does

Each day, 24 life categories are scored. IMLADRIS calculates:

- **INDEX** — a z-scored composite of all category values. What the data says.
- **OVERALL** — a subjective daily rating. What it felt like.
- **Divergence** — the gap between INDEX and OVERALL. Where the insight lives.

The temporal fingerprint visualization animates this data over time, revealing patterns, phase transitions, and blind spots in self-perception that are invisible in static charts.

---

## Architecture

Static frontend. All computation client-side. No backend, no server, no dependencies.

| File | Purpose |
|---|---|
| `index.html` | Entry point |
| `state.js` | Global state — single source of truth |
| `data.js` | CSV ingestion and parsing |
| `math.js` | Z-scores, ranking, INDEX, Divergence |
| `pattern.js` | Pattern matching — find similar past days |
| `visualization.js` | Temporal fingerprint rendering |
| `animation.js` | Two-frame animation engine |
| `ui.js` | Controls, panels, interactions |
| `style.css` | Styling |

---

## Key Design Decisions

- **Ranking:** Signed z-score ascending. Most negative = rank 1 (most dragging you down). Most positive = rank N (most holding you up).
- **Z-scores:** Point-in-time. Each date is scored using only historical data up to that date — no future data leakage.
- **INDEX:** Z-score of the raw category average — not average of z-scores.
- **Two-frame animation:** Core UX feature. Pre-sort and sorted frames per day create the temporal fingerprint experience.

---

## Status

Active development. Phase 1 (static frontend) in progress.

---

## Part of the RabbitHole Ecosystem

IMLADRIS is the analytical methodology at the heart of RabbitHole. The same INDEX/OVERALL/Divergence framework applies across domains — personal health tracking, ecological assessment, crowdsourced data validation, and more. Personal self-tracking is the proving ground.
