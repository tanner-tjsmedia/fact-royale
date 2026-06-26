/* =====================================================
   FACT ROYALE — Icon System (Lucide paths, MIT license)
   All icons: 24x24 viewBox, stroke-based, currentColor.
   width/height="1em" so they scale with font-size.
   ===================================================== */

const _svg = (paths, extra = '') =>
  `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true" ${extra}>${paths}</svg>`;

const ICONS = {

  // ── Streak Flame ──────────────────────────────────────
  flame: _svg(`<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`),

  // ── Notification Bell ─────────────────────────────────
  bell: _svg(`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`),

  // ── Crown (perfect score) ─────────────────────────────
  crown: _svg(`<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>`),

  // ── Trophy (100-day streak) ───────────────────────────
  trophy: _svg(`<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`),

  // ── Tier Icons ─────────────────────────────────────────
  tiers: {

    // No rank — empty circle with dash
    unranked: _svg(`<circle cx="12" cy="12" r="10"/>
      <line x1="8" x2="16" y1="12" y2="12"/>`),

    // Page — open book / document
    page: _svg(`<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`),

    // Knight — sword
    knight: _svg(`<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
      <line x1="13" x2="19" y1="19" y2="13"/>
      <line x1="16" x2="20" y1="16" y2="20"/>
      <line x1="19" x2="21" y1="21" y2="19"/>`),

    // Baron — plain shield
    baron: _svg(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`),

    // Earl — shield with checkmark (proven, decorated)
    earl: _svg(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>`),

    // Duke — crown
    duke: _svg(`<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>`),

    // Royale — gem / diamond (pinnacle)
    royale: _svg(`<path d="M6 3h12l4 6-10 13L2 9Z"/>
      <path d="M11 3 8 9l4 13 4-13-3-6"/>
      <path d="M2 9h20"/>`),
  },

  // ── Category Icons ─────────────────────────────────────
  categories: {

    // History — hourglass
    history: _svg(`<path d="M5 22h14"/>
      <path d="M5 2h14"/>
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
      <path d="M7 2v4.172a2 2 0 0 1 .586 1.414L12 12l4.414-4.414A2 2 0 0 1 17 6.172V2"/>`),

    // Sports — trophy
    sports: _svg(`<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`),

    // Geography — globe
    geography: _svg(`<circle cx="12" cy="12" r="10"/>
      <line x1="2" x2="22" y1="12" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`),

    // Science & Nature — atom
    science: _svg(`<circle cx="12" cy="12" r="1"/>
      <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5z"/>
      <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5z"/>`),

    // Music/Movies — music note
    music: _svg(`<path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>`),
  },

  // ── Leaderboard Medals ─────────────────────────────────
  // Same award shape, differentiated by color in the caller
  medals: {
    gold:   _svg(`<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>`),
    silver: _svg(`<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>`),
    bronze: _svg(`<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>`),
  },
};
