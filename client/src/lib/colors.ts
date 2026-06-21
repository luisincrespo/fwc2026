// Centralized semantic color palette.
// Each export name describes WHAT the color means in the product, not its hue.
// Change here to retheme all usages at once.

// Scoring prediction tiers
export const COLOR_EXACT = '#f59e0b';           // amber — exact score prediction
export const COLOR_CORRECT = '#22c55e';         // green — correct outcome prediction
export const COLOR_CORRECT_LIVE = '#4ade80';    // bright green — live points column / movers
export const COLOR_MARGIN = '#94a3b8';          // slate — within margin (E rule, partial credit)
export const COLOR_MISS = '#475569';            // dark slate — 0 pts

// App interaction states
export const COLOR_SIMULATION = '#60a5fa';      // blue — hypothetical / score simulator
export const COLOR_EXPERIMENTAL = '#2dd4bf';    // teal — experimental scoring mode
export const COLOR_EXPERIMENTAL_BG = '#042f2e'; // dark teal — panel background
export const COLOR_EXPERIMENTAL_BORDER = '#0f766e'; // teal — panel / button border
export const COLOR_EXPERIMENTAL_BRIGHT = '#5eead4'; // bright teal — highlighted labels in panel

// Rank & movement indicators
export const COLOR_RANK_1 = '#fbbf24';          // gold
export const COLOR_RANK_2 = '#94a3b8';          // silver (slate)
export const COLOR_RANK_3 = '#cd7f32';          // bronze
export const COLOR_RANK_UP = '#22c55e';         // green — rank improved (same hue as CORRECT)
export const COLOR_RANK_DOWN = '#ef4444';       // red — rank dropped
export const COLOR_RANK_DOWN_SOFT = '#f87171';  // soft red — minor daily drop
export const COLOR_RANK_NEUTRAL = '#64748b';    // slate — no change

// Widget accents
export const COLOR_TOP_SCORERS = '#a78bfa';     // violet — top scorers today widget
