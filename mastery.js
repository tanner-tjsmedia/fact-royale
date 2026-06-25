/* ===========================
   FACT ROYALE | Category Mastery
   Requires: firebase-config.js (db, auth globals)
   =========================== */

// ── Tier Definitions ─────────────────────────────────────

const MASTERY_TIERS = [
  { id: 'unranked', name: 'Unranked', minTotal:   0, minAcc: 0.00, color: '#6b7280', icon: ICONS.tiers.unranked },
  { id: 'page',     name: 'Page',     minTotal:   5, minAcc: 0.00, color: '#9ca3af', icon: ICONS.tiers.page     },
  { id: 'knight',   name: 'Knight',   minTotal:  10, minAcc: 0.50, color: '#cd7f32', icon: ICONS.tiers.knight   },
  { id: 'baron',    name: 'Baron',    minTotal:  25, minAcc: 0.65, color: '#c0c0c0', icon: ICONS.tiers.baron    },
  { id: 'earl',     name: 'Earl',     minTotal:  50, minAcc: 0.75, color: '#f59e0b', icon: ICONS.tiers.earl     },
  { id: 'duke',     name: 'Duke',     minTotal: 100, minAcc: 0.85, color: '#67e8f9', icon: ICONS.tiers.duke     },
  { id: 'royale',   name: 'Royale',   minTotal: 200, minAcc: 0.92, color: '#f0c040', icon: ICONS.tiers.royale   },
];

const CAT_META = {
  'History':          { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Sports':           { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)'  },
  'Music/Movies':     { color: '#c084fc', bg: 'rgba(168,85,247,0.12)'  },
  'Geography':        { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
  'Science & Nature': { color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
};

const ALL_CATEGORIES = ['History', 'Sports', 'Music/Movies', 'Geography', 'Science & Nature'];

// ── Tier Utilities ────────────────────────────────────────

function computeTier(correct, total) {
  if (total === 0) return MASTERY_TIERS[0];
  const acc = correct / total;
  for (let i = MASTERY_TIERS.length - 1; i >= 0; i--) {
    const t = MASTERY_TIERS[i];
    if (total >= t.minTotal && acc >= t.minAcc) return t;
  }
  return MASTERY_TIERS[0];
}

function tierIndex(idOrTier) {
  const id = typeof idOrTier === 'string' ? idOrTier : idOrTier.id;
  return MASTERY_TIERS.findIndex(t => t.id === id);
}

function getNextTier(correct, total) {
  const cur = computeTier(correct, total);
  const idx = tierIndex(cur);
  return idx < MASTERY_TIERS.length - 1 ? MASTERY_TIERS[idx + 1] : null;
}

function getTierProgress(correct, total) {
  const next = getNextTier(correct, total);
  if (!next) return null;
  const acc = total > 0 ? correct / total : 0;
  return {
    next,
    volPct:    Math.min(1, total / next.minTotal),
    accPct:    next.minAcc > 0 ? Math.min(1, acc / next.minAcc) : 1,
    volNeeded: Math.max(0, next.minTotal - total),
    accNeeded: next.minAcc > 0
      ? Math.max(0, Math.ceil(next.minAcc * 100) - Math.floor(acc * 100))
      : 0,
  };
}

function computeMasteryScore(categoryMastery) {
  let score = 0;
  Object.values(categoryMastery).forEach(cat => {
    const idx = tierIndex(computeTier(cat.correct, cat.total));
    const acc = cat.total > 0 ? cat.correct / cat.total : 0;
    score += cat.correct * (idx + 1);                            // tier-weighted correct answers
    score += (cat.perfectStreak || 0) * 8;                       // perfect streak bonus
    if (acc >= 0.9) score += Math.floor(cat.total / 10) * 15;   // accuracy bonus
  });
  return Math.round(score);
}

// ── Firestore Update ──────────────────────────────────────
// Called from auth.js after quiz submission.
// Returns array of level-up objects: [{category, from, to}]

async function updateCategoryMastery(categoryScores, dateKey) {
  if (typeof auth === 'undefined' || !auth.currentUser) return [];
  const uid     = auth.currentUser.uid;
  const userRef = db.collection('users').doc(uid);

  let levelUps = [];

  try {
    // Write daily breakdown to subcollection (idempotent)
    await userRef.collection('masteryHistory').doc(dateKey).set(categoryScores);

    // Read current mastery data
    const snap    = await userRef.get();
    const data    = snap.data() || {};
    const mastery = { ...(data.categoryMastery || {}) };

    Object.entries(categoryScores).forEach(([cat, { correct, total }]) => {
      const prev    = mastery[cat] || { correct: 0, total: 0, perfectStreak: 0, bestPerfectStreak: 0 };
      const oldTier = computeTier(prev.correct, prev.total);

      const newCorrect = (prev.correct || 0) + correct;
      const newTotal   = (prev.total   || 0) + total;
      const newTier    = computeTier(newCorrect, newTotal);

      // Perfect streak: consecutive days answering ALL in this category correctly
      // Only resets when you miss — skipped days don't break it
      const isPerfect     = total > 0 && correct === total;
      const newStreak     = isPerfect ? (prev.perfectStreak || 0) + 1 : 0;
      const newBestStreak = Math.max(prev.bestPerfectStreak || 0, newStreak);

      if (tierIndex(newTier) > tierIndex(oldTier)) {
        levelUps.push({ category: cat, from: oldTier, to: newTier });
      }

      mastery[cat] = {
        correct:           newCorrect,
        total:             newTotal,
        perfectStreak:     newStreak,
        bestPerfectStreak: newBestStreak,
        lastPlayedDate:    dateKey,
        level:             newTier.id,
      };
    });

    const masteryScore = computeMasteryScore(mastery);
    await userRef.update({ categoryMastery: mastery, masteryScore });

    if (levelUps.length > 0) {
      localStorage.setItem('fr_levelUps', JSON.stringify(levelUps));
    }
  } catch (err) {
    console.error('Mastery update error:', err);
  }

  return levelUps;
}

// ── Mastery Page ──────────────────────────────────────────

async function loadMasteryPage() {
  const loadEl    = document.getElementById('mastery-loading');
  const signinEl  = document.getElementById('mastery-signin');
  const contentEl = document.getElementById('mastery-content');

  auth.onAuthStateChanged(async user => {
    if (loadEl)  loadEl.style.display  = 'none';

    if (!user) {
      if (signinEl)  signinEl.style.display  = 'flex';
      if (contentEl) contentEl.style.display = 'none';
      return;
    }
    if (signinEl)  signinEl.style.display  = 'none';
    if (contentEl) contentEl.style.display = 'block';

    // Show skeleton while loading
    const grid = document.getElementById('mastery-grid');
    if (grid) grid.innerHTML = ALL_CATEGORIES.map(() =>
      '<div class="mc-card mc-skeleton"></div>').join('');

    try {
      const userRef  = db.collection('users').doc(user.uid);
      const userSnap = await userRef.get();

      // Fetch history separately — if Firestore rules block it, degrade gracefully
      let historySnap = { docs: [] };
      try {
        historySnap = await userRef.collection('masteryHistory')
          .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
          .limit(14)
          .get();
      } catch (histErr) {
        console.warn('[Mastery] masteryHistory unavailable — update Firestore rules to enable sparklines:', histErr.code);
      }

      const data = userSnap.data() || {};
      let categoryMastery = data.categoryMastery || {};

      // Auto-seed from categoryStats if mastery is empty
      if (isMasteryEmpty(categoryMastery) && data.categoryStats) {
        categoryMastery = await seedMasteryFromStats(userRef, data.categoryStats);
      }

      const masteryScore = data.masteryScore != null && !isMasteryEmpty(categoryMastery)
        ? data.masteryScore
        : computeMasteryScore(categoryMastery);

      // Build history map: cat -> [{date, correct, total}, ...] oldest-first
      const historyMap = {};
      historySnap.docs.slice().reverse().forEach(doc => {
        Object.entries(doc.data()).forEach(([cat, stats]) => {
          if (!historyMap[cat]) historyMap[cat] = [];
          historyMap[cat].push({ date: doc.id, ...stats });
        });
      });

      renderMasteryHero(masteryScore, categoryMastery, user);
      renderCategoryCards(categoryMastery, historyMap);
    } catch (err) {
      console.error('Mastery load error:', err);
      if (grid) grid.innerHTML = '<p style="color:#9ca3af;padding:2rem">Failed to load mastery data.</p>';
    }
  });
}

function renderMasteryHero(score, categoryMastery, user) {
  const el = id => document.getElementById(id);

  if (el('mastery-username')) {
    el('mastery-username').textContent = user.displayName || user.email.split('@')[0];
  }
  if (el('mastery-score')) {
    el('mastery-score').textContent = score.toLocaleString();
  }

  // Best rank across all categories
  let bestIdx = 0;
  Object.values(categoryMastery).forEach(cat => {
    const idx = tierIndex(computeTier(cat.correct, cat.total));
    if (idx > bestIdx) bestIdx = idx;
  });
  const bestTier = MASTERY_TIERS[bestIdx];
  if (el('mastery-best-rank')) {
    el('mastery-best-rank').textContent = `${bestTier.icon} ${bestTier.name}`;
    el('mastery-best-rank').style.color = bestTier.color;
  }

  // Total questions answered
  const totalQ = Object.values(categoryMastery).reduce((n, c) => n + (c.total || 0), 0);
  if (el('mastery-total-q')) el('mastery-total-q').textContent = totalQ.toLocaleString();

  // Overall accuracy
  const totalC = Object.values(categoryMastery).reduce((n, c) => n + (c.correct || 0), 0);
  const overallAcc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  if (el('mastery-overall-acc')) el('mastery-overall-acc').textContent = overallAcc + '%';

  // Strongest / weakest (min 5 questions)
  let strongest = null, weakest = null, bestAcc = -1, worstAcc = 2;
  Object.entries(categoryMastery).forEach(([cat, s]) => {
    if ((s.total || 0) < 5) return;
    const acc = s.correct / s.total;
    if (acc > bestAcc)  { bestAcc  = acc; strongest = { cat, acc }; }
    if (acc < worstAcc) { worstAcc = acc; weakest   = { cat, acc }; }
  });

  if (el('mastery-strongest') && strongest) {
    const m = CAT_META[strongest.cat] || { color: '#f0c040' };
    el('mastery-strongest').innerHTML =
      `<span style="color:${m.color}">${strongest.cat}</span>&nbsp;<span class="hero-acc">${Math.round(strongest.acc * 100)}%</span>`;
  }
  if (el('mastery-weakest') && weakest) {
    const m = CAT_META[weakest.cat] || { color: '#f0c040' };
    el('mastery-weakest').innerHTML =
      `<span style="color:${m.color}">${weakest.cat}</span>&nbsp;<span class="hero-acc">${Math.round(weakest.acc * 100)}%</span>`;
  }
}

function renderCategoryCards(categoryMastery, historyMap) {
  const grid = document.getElementById('mastery-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ALL_CATEGORIES.forEach(cat => {
    const stats   = categoryMastery[cat] || { correct: 0, total: 0, perfectStreak: 0, bestPerfectStreak: 0 };
    const tier    = computeTier(stats.correct, stats.total);
    const prog    = getTierProgress(stats.correct, stats.total);
    const meta    = CAT_META[cat] || { color: '#f0c040', bg: 'rgba(240,192,64,0.1)' };
    const acc     = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const history = historyMap[cat] || [];

    // Progress section
    let progHTML = '';
    if (prog) {
      const volW = Math.round(prog.volPct * 100);
      const accW = Math.round(prog.accPct * 100);
      const needParts = [];
      if (prog.volNeeded > 0) needParts.push(`${prog.volNeeded} more questions`);
      if (prog.accNeeded > 0) needParts.push(`${prog.accNeeded}%+ accuracy`);
      const needMsg = needParts.length > 0
        ? `<div class="mc-need">Need: ${needParts.join(' and ')}</div>`
        : `<div class="mc-need mc-ready">Ready to rank up! Play today.</div>`;

      progHTML = `
        <div class="mc-progress">
          <div class="mc-prog-header">
            Progress to <strong style="color:${prog.next.color}">${prog.next.icon} ${prog.next.name}</strong>
          </div>
          <div class="mc-prog-row">
            <span class="mc-prog-tag">Questions</span>
            <div class="mc-track">
              <div class="mc-fill" style="width:${volW}%;background:${meta.color}"></div>
            </div>
            <span class="mc-prog-num">${stats.total}/${prog.next.minTotal}</span>
          </div>
          <div class="mc-prog-row">
            <span class="mc-prog-tag">Accuracy</span>
            <div class="mc-track">
              <div class="mc-fill" style="width:${accW}%;background:${meta.color}"></div>
            </div>
            <span class="mc-prog-num">${acc}%/${Math.round(prog.next.minAcc * 100)}%</span>
          </div>
          ${needMsg}
        </div>`;
    } else {
      progHTML = `
        <div class="mc-progress">
          <div class="mc-prog-header" style="color:${tier.color}">
            ♛ Maximum rank achieved
          </div>
        </div>`;
    }

    const sparkHTML = buildSparkline(history, meta.color);

    const card = document.createElement('div');
    card.className = 'mc-card';
    card.innerHTML = `
      <div class="mc-header" style="background:${meta.bg};border-left:4px solid ${meta.color}">
        <span class="mc-cat-name" style="color:${meta.color}">${cat}</span>
        <span class="mc-tier-badge" style="color:${tier.color};background:${tier.color}22">${tier.icon} ${tier.name}</span>
      </div>
      <div class="mc-stats">
        <div class="mc-stat">
          <div class="mc-val">${acc}%</div>
          <div class="mc-lbl">Accuracy</div>
        </div>
        <div class="mc-stat">
          <div class="mc-val">${stats.correct}<span class="mc-sub">/${stats.total}</span></div>
          <div class="mc-lbl">Correct</div>
        </div>
        <div class="mc-stat">
          <div class="mc-val">${stats.perfectStreak || 0}<span class="mc-sub"><span class="fr-icon fr-icon-xs" style="color:var(--gold,#d4af37);vertical-align:middle">${ICONS.flame}</span></span></div>
          <div class="mc-lbl">Perfect Streak</div>
        </div>
        <div class="mc-stat">
          <div class="mc-val">${stats.bestPerfectStreak || 0}</div>
          <div class="mc-lbl">Best Streak</div>
        </div>
      </div>
      ${progHTML}
      <div class="mc-spark-section">
        <div class="mc-spark-label">Last ${history.length} day${history.length !== 1 ? 's' : ''}</div>
        ${sparkHTML}
      </div>`;

    grid.appendChild(card);
  });
}

function buildSparkline(history, color) {
  if (!history || history.length === 0) {
    return '<div class="mc-spark-empty">Play the quiz to build your history</div>';
  }
  const bars = history.map(day => {
    const pct       = day.total > 0 ? day.correct / day.total : 0;
    const height    = Math.max(4, Math.round(pct * 44));
    const alpha     = 0.2 + pct * 0.8;
    const isPerfect = day.total > 0 && day.correct === day.total;
    const label     = `${day.date}: ${day.correct}/${day.total} (${Math.round(pct * 100)}%)`;
    return `<div class="spark-bar${isPerfect ? ' spark-perfect' : ''}"
               style="height:${height}px;background:${color};opacity:${alpha}"
               title="${label}"></div>`;
  }).join('');
  return `<div class="mc-sparkline">${bars}</div>`;
}

// ── Auto-seed mastery from categoryStats ─────────────────
// Runs once for any user whose categoryMastery is empty but
// who has existing categoryStats from prior quiz play.

async function seedMasteryFromStats(userRef, categoryStats) {
  if (!categoryStats || Object.keys(categoryStats).length === 0) return {};

  const categoryMastery = {};
  Object.entries(categoryStats).forEach(([cat, s]) => {
    const correct = s.correct || 0;
    const total   = s.played  || 0;
    if (total === 0) return;
    categoryMastery[cat] = {
      correct,
      total,
      perfectStreak:     0,  // can't know historical streaks
      bestPerfectStreak: 0,
      lastPlayedDate:    '',
      level:             computeTier(correct, total).id,
    };
  });

  if (Object.keys(categoryMastery).length === 0) return {};

  const masteryScore = computeMasteryScore(categoryMastery);
  try {
    await userRef.update({ categoryMastery, masteryScore });
    console.log('[Mastery] Auto-seeded from categoryStats. Score:', masteryScore);
  } catch (e) {
    console.warn('[Mastery] Seed write failed:', e);
  }
  return categoryMastery;
}

function isMasteryEmpty(categoryMastery) {
  if (!categoryMastery || Object.keys(categoryMastery).length === 0) return true;
  return Object.values(categoryMastery).every(c => (c.total || 0) === 0);
}

// ── Homepage Mastery Teaser ───────────────────────────────

async function loadMasteryTeaser() {
  const teaserEl = document.getElementById('mastery-teaser');
  if (!teaserEl || typeof auth === 'undefined') return;

  auth.onAuthStateChanged(async user => {
    if (!user) { teaserEl.style.display = 'none'; return; }
    try {
      const userRef = db.collection('users').doc(user.uid);
      const snap    = await userRef.get();
      const data    = snap.data() || {};
      let cm        = data.categoryMastery || {};
      let score     = data.masteryScore || 0;

      // Auto-seed if mastery is empty but categoryStats exists
      if (isMasteryEmpty(cm) && data.categoryStats) {
        cm    = await seedMasteryFromStats(userRef, data.categoryStats);
        score = computeMasteryScore(cm);
      }

      const scoreEl = document.getElementById('mastery-teaser-score');
      const pillsEl = document.getElementById('mastery-teaser-pills');

      if (scoreEl) scoreEl.textContent = score.toLocaleString() || '0';

      if (pillsEl) {
        pillsEl.innerHTML = ALL_CATEGORIES.map(cat => {
          const s    = cm[cat] || { correct: 0, total: 0 };
          const tier = computeTier(s.correct, s.total);
          const meta = CAT_META[cat] || { color: '#f0c040' };
          return `
            <div class="mt-pill" title="${cat}: ${tier.name}" style="border-color:${tier.color}44">
              <span class="mt-pill-icon" style="color:${tier.color}">${tier.icon}</span>
              <span class="mt-pill-cat"  style="color:${meta.color}">${cat.replace('Music/Movies', 'Music').replace('Science & Nature', 'Science')}</span>
              <span class="mt-pill-tier" style="color:${tier.color}">${tier.name}</span>
            </div>`;
        }).join('');
      }

      teaserEl.style.display = 'block';
    } catch (err) {
      teaserEl.style.display = 'none';
    }
  });
}

// ── Boot ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('mastery-grid'))   loadMasteryPage();
  if (document.getElementById('mastery-teaser')) loadMasteryTeaser();
});
