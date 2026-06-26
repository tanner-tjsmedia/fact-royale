/* =====================================================
   FACT ROYALE — Custom SVG Icon System
   All icons carry width/height="1em" so they scale
   with font-size wherever they appear inline.
   Use currentColor for CSS theming.

   Usage:
     el.innerHTML = ICONS.flame;
     el.innerHTML = ICONS.tiers.knight;
     el.innerHTML = ICONS.categories.geography;
     el.innerHTML = ICONS.medals.gold;
   ===================================================== */

const ICONS = {

  // ── Streak Flame ──────────────────────────────────────
  flame: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21C8.1 21 5 17.9 5 14.2C5 11 6.8 8.4 9.7 5.3C10.2 4.8 10.7 4.1 11 3C11.4 4 11.4 5.3 12 6.6C12.7 5.1 13.2 3.7 13.2 2.5C15.5 4.6 19 8.7 19 14.2C19 17.9 15.9 21 12 21Z" fill="currentColor"/>
    <path d="M12 17.8C10.4 17.8 9.2 16.5 9.2 14.8C9.2 13.1 10.2 11.8 11.5 10.3C11.7 11.4 11.9 12.6 12.7 13.7C13.3 12.1 13.8 10.8 13.5 9.4C15.1 11.1 15.8 12.7 15.8 14.5C15.8 16.4 14.4 17.8 12 17.8Z" fill="currentColor" opacity="0.35"/>
  </svg>`,

  // ── Notification Bell ─────────────────────────────────
  bell: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 3C9.5 3 7.7 4.4 6.8 6.5C6.3 7.6 6 8.9 6 10.2V16.5L4 18.5H20L18 16.5V10.2C18 8.9 17.7 7.6 17.2 6.5C16.3 4.4 14.5 3 12 3Z" fill="currentColor"/>
    <path d="M10 18.5C10.1 19.6 11 20.5 12 20.5C13 20.5 13.9 19.6 14 18.5H10Z" fill="currentColor" opacity="0.65"/>
  </svg>`,

  // ── Crown (perfect score) ─────────────────────────────
  crown: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3.5 18L6 9.5L10.5 15L12 5L13.5 15L18 9.5L20.5 18H3.5Z" fill="currentColor"/>
    <rect x="3.5" y="18" width="17" height="2.5" rx="1.25" fill="currentColor" opacity="0.75"/>
    <circle cx="6" cy="9.5" r="1.6" fill="currentColor"/>
    <circle cx="12" cy="5" r="2" fill="currentColor"/>
    <circle cx="18" cy="9.5" r="1.6" fill="currentColor"/>
  </svg>`,

  // ── Trophy (100-day milestone) ────────────────────────
  trophy: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M7 4H17V12.5C17 15.8 14.8 18.5 12 19.5C9.2 18.5 7 15.8 7 12.5V4Z" fill="currentColor" opacity="0.9"/>
    <path d="M7 6.5C5.2 6.5 4 8.2 4 10C4 11.8 5.2 13.2 7 13.8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M17 6.5C18.8 6.5 20 8.2 20 10C20 11.8 18.8 13.2 17 13.8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <rect x="11" y="19.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.8"/>
    <rect x="8" y="21.5" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.7"/>
    <rect x="6.5" y="3.5" width="11" height="1.5" rx="0.75" fill="currentColor"/>
  </svg>`,

  // ── Tier Icons ─────────────────────────────────────────
  tiers: {

    // Dashed circle — no rank yet
    unranked: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" opacity="0.6"/>
      <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
    </svg>`,

    // Parchment scroll — solid
    page: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="7" y="5" width="11" height="15" rx="1.5" fill="currentColor"/>
      <ellipse cx="12.5" cy="5" rx="5.5" ry="2" fill="currentColor"/>
      <ellipse cx="12.5" cy="20" rx="5.5" ry="2" fill="currentColor" opacity="0.7"/>
      <line x1="10" y1="9"  x2="16" y2="9"  stroke="rgba(0,0,0,0.3)" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="10" y1="12" x2="16" y2="12" stroke="rgba(0,0,0,0.3)" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="10" y1="15" x2="14" y2="15" stroke="rgba(0,0,0,0.3)" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,

    // Longsword — solid blade, guard, pommel
    knight: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.3 3L12.7 3L13.5 15H10.5L11.3 3Z" fill="currentColor"/>
      <rect x="7" y="14" width="10" height="2.2" rx="1.1" fill="currentColor"/>
      <rect x="11" y="16.2" width="2" height="4.3" rx="1" fill="currentColor" opacity="0.8"/>
      <circle cx="12" cy="21.5" r="1.8" fill="currentColor"/>
    </svg>`,

    // Heater shield — filled solid
    baron: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.5L20.5 7V14C20.5 18.2 16.8 21.5 12 23C7.2 21.5 3.5 18.2 3.5 14V7L12 2.5Z" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>
    </svg>`,

    // Shield with bold chevron
    earl: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.5L20.5 7V14C20.5 18.2 16.8 21.5 12 23C7.2 21.5 3.5 18.2 3.5 14V7L12 2.5Z" fill="currentColor"/>
      <path d="M6 13L12 9L18 13" stroke="rgba(0,0,0,0.4)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,

    // 3-point crown — solid filled
    duke: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.5 18.5L7 10L12 16L17 10L19.5 18.5H4.5Z" fill="currentColor"/>
      <rect x="4.5" y="18.5" width="15" height="2.5" rx="1.25" fill="currentColor"/>
      <circle cx="7"  cy="10" r="2.2" fill="currentColor"/>
      <circle cx="12" cy="6"  r="2.5" fill="currentColor"/>
      <circle cx="17" cy="10" r="2.2" fill="currentColor"/>
    </svg>`,

    // 5-point crown — full royal, solid filled
    royale: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 18.5L5 9L9 14.5L12 5L15 14.5L19 9L21 18.5H3Z" fill="currentColor"/>
      <rect x="3" y="18.5" width="18" height="2.5" rx="1.25" fill="currentColor"/>
      <circle cx="5"  cy="9"    r="1.8" fill="currentColor"/>
      <circle cx="12" cy="5"    r="2.2" fill="currentColor"/>
      <circle cx="19" cy="9"    r="1.8" fill="currentColor"/>
      <circle cx="9"  cy="14.5" r="1.3" fill="currentColor"/>
      <circle cx="15" cy="14.5" r="1.3" fill="currentColor"/>
    </svg>`,
  },

  // ── Category Icons ─────────────────────────────────────
  categories: {

    // Hourglass
    history: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.5 4H17.5V6L13 10.5V13.5L17.5 18V20H6.5V18L11 13.5V10.5L6.5 6V4Z" fill="currentColor"/>
      <rect x="5.5" y="3.5" width="13" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="5.5" y="18.7" width="13" height="1.8" rx="0.9" fill="currentColor"/>
    </svg>`,

    // Trophy cup
    sports: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.5 4H16.5V12.5C16.5 15.8 14.5 18.5 12 19.5C9.5 18.5 7.5 15.8 7.5 12.5V4Z" fill="currentColor"/>
      <path d="M7.5 6.5C5.7 6.5 4.5 8 4.5 9.8C4.5 11.5 5.7 12.8 7.5 13.3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M16.5 6.5C18.3 6.5 19.5 8 19.5 9.8C19.5 11.5 18.3 12.8 16.5 13.3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <rect x="11"   y="19.5" width="2"  height="2"   rx="0.5"  fill="currentColor" opacity="0.85"/>
      <rect x="8.5"  y="21.5" width="7"  height="1.5" rx="0.75" fill="currentColor" opacity="0.8"/>
      <rect x="7"    y="3.5"  width="10" height="1.5" rx="0.75" fill="currentColor"/>
    </svg>`,

    // Globe with meridians
    geography: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.8" fill="none"/>
      <ellipse cx="12" cy="12" rx="4.2" ry="9.2" stroke="currentColor" stroke-width="1.4" fill="none"/>
      <line x1="2.8" y1="12" x2="21.2" y2="12" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4.5 7.5C7 8.6 9.5 9.2 12 9.2C14.5 9.2 17 8.6 19.5 7.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <path d="M4.5 16.5C7 15.4 9.5 14.8 12 14.8C14.5 14.8 17 15.4 19.5 16.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
    </svg>`,

    // Atom — 3 orbits + nucleus
    science: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="2.8" fill="currentColor"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.6" fill="none"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.6" fill="none" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.6" fill="none" transform="rotate(120 12 12)"/>
    </svg>`,

    // Quarter note
    music: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="8.2" cy="18.5" rx="3.8" ry="2.8" fill="currentColor" transform="rotate(-18 8.2 18.5)"/>
      <rect x="11.2" y="4.5" width="2.2" height="14.5" rx="1.1" fill="currentColor"/>
      <path d="M13.4 4.5C15.5 5.6 17.5 7.8 17.5 11C15.8 10 13.8 9.5 13.4 7.8V4.5Z" fill="currentColor"/>
    </svg>`,
  },

  // ── Leaderboard Medals ─────────────────────────────────
  medals: {

    gold: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9.5 2.5L12 1L14.5 2.5L13.5 8H10.5L9.5 2.5Z" fill="currentColor"/>
      <circle cx="12" cy="15.5" r="7" fill="currentColor" opacity="0.25"/>
      <circle cx="12" cy="15.5" r="7" stroke="currentColor" stroke-width="2.2"/>
      <text x="12" y="19.8" text-anchor="middle" font-size="8.5" font-weight="800" fill="currentColor" font-family="Georgia,serif">I</text>
    </svg>`,

    silver: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9.5 2.5L12 1L14.5 2.5L13.5 8H10.5L9.5 2.5Z" fill="currentColor"/>
      <circle cx="12" cy="15.5" r="7" fill="currentColor" opacity="0.25"/>
      <circle cx="12" cy="15.5" r="7" stroke="currentColor" stroke-width="2.2"/>
      <text x="12" y="19.8" text-anchor="middle" font-size="7.5" font-weight="800" fill="currentColor" font-family="Georgia,serif">II</text>
    </svg>`,

    bronze: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9.5 2.5L12 1L14.5 2.5L13.5 8H10.5L9.5 2.5Z" fill="currentColor"/>
      <circle cx="12" cy="15.5" r="7" fill="currentColor" opacity="0.25"/>
      <circle cx="12" cy="15.5" r="7" stroke="currentColor" stroke-width="2.2"/>
      <text x="12" y="19.8" text-anchor="middle" font-size="6.5" font-weight="800" fill="currentColor" font-family="Georgia,serif">III</text>
    </svg>`,
  },
};
