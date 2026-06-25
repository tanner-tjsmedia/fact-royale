/* =====================================================
   FACT ROYALE — Custom SVG Icon System
   All icons use currentColor for CSS theming.

   Usage:
     el.innerHTML = ICONS.flame;
     el.innerHTML = ICONS.tiers.knight;
     el.innerHTML = ICONS.categories.geography;
     el.innerHTML = ICONS.medals.gold;
   ===================================================== */

const ICONS = {

  // ── Streak Flame ──────────────────────────────────────
  flame: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21C8.1 21 5 17.9 5 14.2C5 11 6.8 8.4 9.7 5.3C10.2 4.8 10.7 4.1 11 3C11.4 4 11.4 5.3 12 6.6C12.7 5.1 13.2 3.7 13.2 2.5C15.5 4.6 19 8.7 19 14.2C19 17.9 15.9 21 12 21Z" fill="currentColor"/>
    <path d="M12 17.8C10.4 17.8 9.2 16.5 9.2 14.8C9.2 13.1 10.2 11.8 11.5 10.3C11.7 11.4 11.9 12.6 12.7 13.7C13.3 12.1 13.8 10.8 13.5 9.4C15.1 11.1 15.8 12.7 15.8 14.5C15.8 16.4 14.4 17.8 12 17.8Z" fill="currentColor" opacity="0.32"/>
  </svg>`,

  // ── Notification Bell ─────────────────────────────────
  bell: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 3C9.5 3 7.7 4.4 6.8 6.5C6.3 7.6 6 8.9 6 10.2V16.5L4 18.5H20L18 16.5V10.2C18 8.9 17.7 7.6 17.2 6.5C16.3 4.4 14.5 3 12 3Z" fill="currentColor"/>
    <path d="M10 18.5C10.1 19.6 11 20.5 12 20.5C13 20.5 13.9 19.6 14 18.5H10Z" fill="currentColor" opacity="0.65"/>
  </svg>`,

  // ── Crown (perfect score UI element) ──────────────────
  crown: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3.5 18L6 9.5L10.5 15L12 5L13.5 15L18 9.5L20.5 18H3.5Z" fill="currentColor"/>
    <rect x="3.5" y="18" width="17" height="2.5" rx="1.25" fill="currentColor" opacity="0.7"/>
    <circle cx="6" cy="9.5" r="1.6" fill="currentColor"/>
    <circle cx="12" cy="5" r="2" fill="currentColor"/>
    <circle cx="18" cy="9.5" r="1.6" fill="currentColor"/>
  </svg>`,

  // ── Trophy (100-day milestone) ────────────────────────
  trophy: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
    unranked: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3.5 2.5"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    // Parchment scroll
    page: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="7" y="4.5" width="10" height="16" rx="1" fill="currentColor" opacity="0.85"/>
      <ellipse cx="12" cy="4.5" rx="5" ry="1.8" fill="currentColor"/>
      <ellipse cx="12" cy="20.5" rx="5" ry="1.8" fill="currentColor" opacity="0.6"/>
      <ellipse cx="12" cy="4.5" rx="3.5" ry="1.2" fill="currentColor" opacity="0.3"/>
    </svg>`,

    // Longsword pointing up
    knight: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.5L13.2 14.5H10.8L12 2.5Z" fill="currentColor"/>
      <rect x="7.5" y="14" width="9" height="2" rx="1" fill="currentColor"/>
      <rect x="11.1" y="16" width="1.8" height="4" rx="0.9" fill="currentColor" opacity="0.65"/>
      <circle cx="12" cy="21.5" r="1.5" fill="currentColor"/>
    </svg>`,

    // Heater shield — plain
    baron: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.5L20.5 6.5V14C20.5 18.2 16.8 21.5 12 23C7.2 21.5 3.5 18.2 3.5 14V6.5L12 2.5Z" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,

    // Heater shield + chevron
    earl: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.5L20.5 6.5V14C20.5 18.2 16.8 21.5 12 23C7.2 21.5 3.5 18.2 3.5 14V6.5L12 2.5Z" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M5.5 12.5L12 8.5L18.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,

    // 3-point crown
    duke: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.5 18.5L7 10.5L12 16.5L17 10.5L19.5 18.5H4.5Z" fill="currentColor" opacity="0.9"/>
      <rect x="4.5" y="18.5" width="15" height="2.5" rx="1.25" fill="currentColor" opacity="0.75"/>
      <circle cx="7" cy="10.5" r="2" fill="currentColor"/>
      <circle cx="12" cy="6.5" r="2.2" fill="currentColor"/>
      <circle cx="17" cy="10.5" r="2" fill="currentColor"/>
    </svg>`,

    // 5-point crown — full royal
    royale: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 18.5L5 9L9 14L12 5L15 14L19 9L21 18.5H3Z" fill="currentColor"/>
      <rect x="3" y="18.5" width="18" height="2.5" rx="1.25" fill="currentColor" opacity="0.8"/>
      <circle cx="5" cy="9" r="1.6" fill="currentColor"/>
      <circle cx="12" cy="5" r="2" fill="currentColor"/>
      <circle cx="19" cy="9" r="1.6" fill="currentColor"/>
      <circle cx="9" cy="14" r="1.2" fill="currentColor" opacity="0.7"/>
      <circle cx="15" cy="14" r="1.2" fill="currentColor" opacity="0.7"/>
    </svg>`,
  },

  // ── Category Icons ─────────────────────────────────────

  categories: {

    // Hourglass
    history: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.5 4H17.5V6L13 10.5V13.5L17.5 18V20H6.5V18L11 13.5V10.5L6.5 6V4Z" fill="currentColor" opacity="0.85"/>
      <rect x="5.5" y="3.5" width="13" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="5.5" y="18.7" width="13" height="1.8" rx="0.9" fill="currentColor"/>
      <ellipse cx="12" cy="12" rx="2.2" ry="1.2" fill="currentColor" opacity="0.35"/>
    </svg>`,

    // Trophy cup
    sports: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.5 4H16.5V12.5C16.5 15.8 14.5 18.5 12 19.5C9.5 18.5 7.5 15.8 7.5 12.5V4Z" fill="currentColor" opacity="0.9"/>
      <path d="M7.5 6.5C5.7 6.5 4.5 8 4.5 9.8C4.5 11.5 5.7 12.8 7.5 13.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M16.5 6.5C18.3 6.5 19.5 8 19.5 9.8C19.5 11.5 18.3 12.8 16.5 13.3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <rect x="11" y="19.5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.8"/>
      <rect x="8.5" y="21.5" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.75"/>
      <rect x="7" y="3.5" width="10" height="1.5" rx="0.75" fill="currentColor"/>
    </svg>`,

    // Globe with meridians
    geography: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <ellipse cx="12" cy="12" rx="4.2" ry="9.2" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <line x1="2.8" y1="12" x2="21.2" y2="12" stroke="currentColor" stroke-width="1.2"/>
      <path d="M4.5 7.5C7 8.6 9.5 9.2 12 9.2C14.5 9.2 17 8.6 19.5 7.5" stroke="currentColor" stroke-width="1" fill="none"/>
      <path d="M4.5 16.5C7 15.4 9.5 14.8 12 14.8C14.5 14.8 17 15.4 19.5 16.5" stroke="currentColor" stroke-width="1" fill="none"/>
    </svg>`,

    // Atom — 3 orbits
    science: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="2.8" fill="currentColor"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.4" fill="none"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.4" fill="none" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" stroke-width="1.4" fill="none" transform="rotate(120 12 12)"/>
    </svg>`,

    // Quarter note
    music: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="8.2" cy="18.5" rx="3.8" ry="2.8" fill="currentColor" transform="rotate(-18 8.2 18.5)"/>
      <rect x="11.2" y="4.5" width="2.2" height="14.5" rx="1.1" fill="currentColor"/>
      <path d="M13.4 4.5C15.5 5.6 17.5 7.8 17.5 11C15.8 10 13.8 9.5 13.4 7.8V4.5Z" fill="currentColor"/>
    </svg>`,
  },

  // ── Leaderboard Medals ─────────────────────────────────

  medals: {

    gold: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="medal-icon">
      <path d="M9.5 2L12 0.5L14.5 2L13.5 7.5H10.5L9.5 2Z" fill="currentColor" opacity="0.85"/>
      <circle cx="12" cy="15" r="7.5" fill="currentColor" opacity="0.18"/>
      <circle cx="12" cy="15" r="7.5" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="19.5" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" font-family="Georgia,serif" letter-spacing="-0.5">I</text>
    </svg>`,

    silver: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="medal-icon">
      <path d="M9.5 2L12 0.5L14.5 2L13.5 7.5H10.5L9.5 2Z" fill="currentColor" opacity="0.85"/>
      <circle cx="12" cy="15" r="7.5" fill="currentColor" opacity="0.18"/>
      <circle cx="12" cy="15" r="7.5" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="19.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" font-family="Georgia,serif" letter-spacing="-0.5">II</text>
    </svg>`,

    bronze: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="medal-icon">
      <path d="M9.5 2L12 0.5L14.5 2L13.5 7.5H10.5L9.5 2Z" fill="currentColor" opacity="0.85"/>
      <circle cx="12" cy="15" r="7.5" fill="currentColor" opacity="0.18"/>
      <circle cx="12" cy="15" r="7.5" stroke="currentColor" stroke-width="2"/>
      <text x="12" y="19.5" text-anchor="middle" font-size="6.5" font-weight="700" fill="currentColor" font-family="Georgia,serif" letter-spacing="-0.5">III</text>
    </svg>`,
  },
};
