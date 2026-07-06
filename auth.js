/* =====================================================
   FACT ROYALE — Auth, Leaderboard & Stats
   Requires: firebase-config.js loaded first
   ===================================================== */

// ── Auth State ─────────────────────────────────────────
let currentUser = null;

// ── Archive Feature ────────────────────────────────────
const ARCHIVE_FREE_DAYS = 7;

// ── Auth State Listener ────────────────────────────────
auth.onAuthStateChanged(user => {
  currentUser = user;
  updateNavForAuth(user);
  loadLeaderboard();

  const statsSection = document.getElementById('personal-stats-section');
  const lbCta        = document.getElementById('lb-cta');
  const statsName    = document.getElementById('stats-username');

  if (user) {
    if (statsSection) statsSection.style.display = 'block';
    if (lbCta)        lbCta.style.display        = 'none';
    if (statsName)    statsName.textContent       = user.displayName || user.email.split('@')[0];
    loadPersonalStats(user.uid);
    // Offer push notifications (soft prompt — only shows if not yet decided)
    if (typeof initNotifications === 'function') initNotifications(user);
    // Hide returning visitor banner if they just signed in
    const rvBanner = document.getElementById('returning-visitor-banner');
    if (rvBanner) rvBanner.style.display = 'none';
    // Firestore-based landing sync + catch-up section
    // getCompletedDates handles backfill for pre-feature players automatically
    getCompletedDates(user.uid).then(completedDates => {
      const todayStr = getTodayKeyForAuth();
      // Don't override archive landing pages with daily "View My Results" state
      const isOnArchivePage = new URLSearchParams(window.location.search).has('date');
      // Fallback: if Firestore says they played today but localStorage is stale,
      // re-sync the landing page buttons to "View Results" state
      if (!isOnArchivePage && completedDates.includes(todayStr) && typeof syncLandingAlreadyPlayed === 'function') {
        syncLandingAlreadyPlayed();
      }
      if (typeof populateCatchUpOnLanding === 'function') populateCatchUpOnLanding();

      // Auto-start archive quiz when navigated here via catch-up quick-play link (?autostart=1)
      if (window.fr_autoStart && typeof startArchiveQuiz === 'function') {
        window.fr_autoStart = false;
        startArchiveQuiz();
      }
    }).catch(() => {
      if (typeof populateCatchUpOnLanding === 'function') populateCatchUpOnLanding();
    });
  } else {
    if (statsSection) statsSection.style.display = 'none';
    if (lbCta)        lbCta.style.display        = 'block';
    renderPersonalStatsEmpty();
    checkReturningVisitorBanner();
  }
});

// ── Nav Auth UI ────────────────────────────────────────
function updateNavForAuth(user) {
  const signInBtn = document.getElementById('nav-signin-btn');
  const userMenu  = document.getElementById('nav-user-menu');
  const userName  = document.getElementById('nav-user-name');
  if (!signInBtn) return;

  if (user) {
    signInBtn.style.display = 'none';
    userMenu.style.display  = 'flex';
    userName.textContent    = user.displayName || user.email.split('@')[0];
  } else {
    signInBtn.style.display = 'inline-block';
    userMenu.style.display  = 'none';
  }
}

// ── Modal Controls ─────────────────────────────────────
function openAuthModal(tab) {
  tab = tab || 'login';
  document.getElementById('auth-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  switchAuthTab(tab);
  clearAuthErrors();
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  const loginForm  = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const tabLogin   = document.getElementById('tab-login');
  const tabSignup  = document.getElementById('tab-signup');

  if (tab === 'signup') {
    loginForm.style.display  = 'none';
    signupForm.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabSignup.classList.add('active');
  } else {
    loginForm.style.display  = 'flex';
    signupForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  }
  clearAuthErrors();
}

function clearAuthErrors() {
  ['login-error', 'signup-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ── Email Login ────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = e.target.querySelector('button[type="submit"]');

  btn.textContent = 'Signing in…';
  btn.disabled    = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err.code);
    btn.textContent     = 'Sign In';
    btn.disabled        = false;
  }
});

// ── Log signup to Google Sheet ─────────────────────────
// Fires on new account creation (email or Google).
// Uses the same Apps Script endpoint as the notify form.
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbzCboRQs6V2YbKuUTSnGIdMXZIPlmYl2jLZVMnbvapVNlDIOKlQgLmsW1Qqjsc1BkoK/exec';

function logSignupToSheet(email, displayName, firstName, lastName, source) {
  fetch(SHEET_URL, {
    method: 'POST',
    mode:   'no-cors',
    body:   new URLSearchParams({ email, name: displayName, firstName, lastName, source })
  }).catch(() => {}); // fire-and-forget, never block the signup flow
}

// ── Email Sign Up ──────────────────────────────────────
document.getElementById('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('signup-firstname').value.trim();
  const lastName  = document.getElementById('signup-lastname').value.trim();
  const name      = document.getElementById('signup-name').value.trim();
  const email     = document.getElementById('signup-email').value.trim();
  const password  = document.getElementById('signup-password').value;
  const errorEl   = document.getElementById('signup-error');
  const btn       = e.target.querySelector('button[type="submit"]');

  if (!firstName)          { errorEl.textContent = 'Please enter your first name.'; return; }
  if (!lastName)           { errorEl.textContent = 'Please enter your last name.'; return; }
  if (!name)               { errorEl.textContent = 'Please enter a display name.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }

  btn.textContent = 'Creating account…';
  btn.disabled    = true;

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await createUserProfile(cred.user, name, firstName, lastName);
    logSignupToSheet(email, name, firstName, lastName, 'account');
    closeAuthModal();
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err.code);
    btn.textContent     = 'Create Account';
    btn.disabled        = false;
  }
});

// ── Google Sign-In ─────────────────────────────────────
document.getElementById('btn-google-signin').addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const cred = await auth.signInWithPopup(provider);
    const profileRef = db.collection('users').doc(cred.user.uid);
    const snap = await profileRef.get();
    if (!snap.exists) {
      const fullName  = cred.user.displayName || '';
      const parts     = fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName  = parts.slice(1).join(' ') || '';
      await createUserProfile(cred.user, fullName, firstName, lastName);
      logSignupToSheet(cred.user.email, fullName, firstName, lastName, 'google');
    }
    closeAuthModal();
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      console.error('Google sign-in error:', err);
    }
  }
});

// ── Sign Out ───────────────────────────────────────────
document.getElementById('btn-signout').addEventListener('click', async () => {
  await auth.signOut();
});

// ── Create User Profile in Firestore ──────────────────
async function createUserProfile(user, displayName, firstName, lastName) {
  const name = displayName || user.displayName || 'Player';
  await db.collection('users').doc(user.uid).set({
    displayName: name,
    firstName:   firstName || '',
    lastName:    lastName  || '',
    email: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    stats: {
      gamesPlayed:        0,
      questionsAnswered:  0,
      questionsCorrect:   0,
      currentStreak:      0,
      longestStreak:      0,
      lastPlayedDate:     '',
      bestScore:          0,
      bestScoreDate:      ''
    },
    categoryStats: {
      'History':      { played: 0, correct: 0 },
      'Sports':       { played: 0, correct: 0 },
      'Music/Movies': { played: 0, correct: 0 }
    }
  });
}

// ── Get completed quiz dates for a user ────────────────
// If completedDates is empty (pre-feature users), infers played dates
// from currentStreak + lastPlayedDate and backfills Firestore automatically.
async function getCompletedDates(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return [];

    const data    = snap.data();
    let completed = data.completedDates || [];

    // Backfill from streak data whenever streak-inferred dates are missing.
    // This runs even if completedDates has some entries (e.g. only today was
    // written via arrayUnion but historical streak dates were never recorded).
    if (data.stats && data.stats.lastPlayedDate && data.stats.currentStreak > 0) {
      const lastDate = data.stats.lastPlayedDate;
      const streak   = Math.min(data.stats.currentStreak, 60); // cap at 60
      const inferred = [];

      for (let i = 0; i < streak; i++) {
        const d = new Date(lastDate + 'T00:00:00');
        d.setDate(d.getDate() - i);
        const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        inferred.push(dk);
      }

      // Only write back if any inferred dates are actually missing
      const missing = inferred.filter(dk => !completed.includes(dk));
      if (missing.length > 0) {
        // Merge locally so the UI reflects the correct state immediately
        completed = [...new Set([...completed, ...inferred])];
        // Write back to Firestore (fire-and-forget)
        db.collection('users').doc(uid).update({
          completedDates: firebase.firestore.FieldValue.arrayUnion(...inferred)
        }).catch(e => console.warn('completedDates backfill failed:', e));
      }
    }

    return completed;
  } catch (err) {
    console.error('getCompletedDates error:', err);
    return [];
  }
}

// ── Submit Score to Firestore ──────────────────────────
// Called from quiz.js at the end of showResults()
// isArchive = true: mastery credit only, skip streak + leaderboard
async function submitScoreToFirebase(score, total, categoryScores, dateKey, isArchive = false) {
  if (!currentUser) return;

  const uid         = currentUser.uid;
  const displayName = currentUser.displayName || currentUser.email.split('@')[0];

  try {
    // Always: record this play in quizHistory subcollection
    await db.collection('users').doc(uid)
      .collection('quizHistory').doc(dateKey).set({
        date:      dateKey,
        score,
        total,
        pct:       Math.round((score / total) * 100),
        isArchive: !!isArchive,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        categories: categoryScores
      });

    // Always: mark this date as completed (prevents replaying)
    await db.collection('users').doc(uid).update({
      completedDates: firebase.firestore.FieldValue.arrayUnion(dateKey)
    });

    // Fetch user doc (needed for both paths)
    const userRef  = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;

    const data  = userSnap.data();
    const stats = data.stats || {};

    // Accumulate category stats (both daily and archive)
    const catStats = data.categoryStats || {};
    Object.entries(categoryScores).forEach(([cat, s]) => {
      if (!catStats[cat]) catStats[cat] = { played: 0, correct: 0 };
      catStats[cat].played  += s.total;
      catStats[cat].correct += s.correct;
    });

    const totalAnswered = Object.values(categoryScores).reduce((n, s) => n + s.total,   0);
    const totalCorrect  = Object.values(categoryScores).reduce((n, s) => n + s.correct, 0);

    if (isArchive) {
      // Archive path: mastery stats only, skip streak + leaderboard
      await userRef.update({
        'stats.gamesPlayed':       firebase.firestore.FieldValue.increment(1),
        'stats.questionsAnswered': firebase.firestore.FieldValue.increment(totalAnswered),
        'stats.questionsCorrect':  firebase.firestore.FieldValue.increment(totalCorrect),
        'categoryStats':           catStats
      });

      if (typeof updateCategoryMastery === 'function') {
        updateCategoryMastery(categoryScores, dateKey);
      }

      loadPersonalStats(uid);
      return;
    }

    // ── Daily path: full submission ──────────────────────
    // Guard: if we've already recorded this date, skip stat increments
    // (scores.set is idempotent, but increments would stack up)
    if (data.stats && data.stats.lastPlayedDate === dateKey) {
      console.warn('Daily score already recorded for', dateKey, '— skipping re-submit');
      return;
    }

    const scoreDocId = `${uid}_${dateKey}`;
    await db.collection('scores').doc(scoreDocId).set({
      uid,
      displayName,
      score,
      total,
      date:      dateKey,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      categories: categoryScores
    });

    // Streak logic (mirrors localStorage logic in quiz.js)
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    let currentStreak = stats.currentStreak || 0;
    if (stats.lastPlayedDate === yesterday) {
      currentStreak += 1;
    } else if (stats.lastPlayedDate !== dateKey) {
      currentStreak = 1;
    }
    const longestStreak = Math.max(stats.longestStreak || 0, currentStreak);

    const isNewBest = score > (stats.bestScore || 0);

    await userRef.update({
      'stats.gamesPlayed':       firebase.firestore.FieldValue.increment(1),
      'stats.questionsAnswered': firebase.firestore.FieldValue.increment(totalAnswered),
      'stats.questionsCorrect':  firebase.firestore.FieldValue.increment(totalCorrect),
      'stats.currentStreak':     currentStreak,
      'stats.longestStreak':     longestStreak,
      'stats.lastPlayedDate':    dateKey,
      'stats.bestScore':         isNewBest ? score : (stats.bestScore || 0),
      'stats.bestScoreDate':     isNewBest ? dateKey : (stats.bestScoreDate || ''),
      'categoryStats':           catStats
    });

    if (typeof updateCategoryMastery === 'function') {
      updateCategoryMastery(categoryScores, dateKey);
    }

    loadLeaderboard();
    loadPersonalStats(uid);
    calculateAndShowRankPct(score, dateKey);

  } catch (err) {
    console.error('Score submission error:', err);
  }
}

// ── Seed Players (fill empty leaderboard spots) ────────
// Real players always rank above seeds. Seeds disappear
// automatically as real players join.
const SEED_PLAYERS = [
  { displayName: 'Alex M.',   baseScore: 11 },
  { displayName: 'Jordan K.', baseScore: 10 },
  { displayName: 'Sam R.',    baseScore: 10 },
  { displayName: 'Taylor B.', baseScore:  9 },
  { displayName: 'Morgan C.', baseScore:  9 },
  { displayName: 'Riley P.',  baseScore:  8 },
  { displayName: 'Casey D.',  baseScore:  8 },
  { displayName: 'Drew L.',   baseScore:  7 },
  { displayName: 'Quinn W.',  baseScore:  7 },
  { displayName: 'Avery H.',  baseScore:  6 },
];

function getSeedPlayers(dateKey, count) {
  // Vary scores slightly by date so they look fresh each day
  const hash = dateKey.replace(/-/g, '').split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  return SEED_PLAYERS.slice(0, count).map((s, i) => {
    const variance = ((hash + i * 7) % 3) - 1; // -1, 0, or +1
    // Cap at 11 (never 12/12 — always at least one wrong)
    const score    = Math.min(11, Math.max(5, s.baseScore + variance));
    return { displayName: s.displayName, score, total: 12, uid: `seed_${i}`, isSeed: true };
  });
}

// How many seed players to show based on time of day.
// Seeds trickle in gradually after midnight to make the board
// feel like real activity is building — not instantly full.
function getSeedCap() {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour <  2) return 0;   // midnight–2am:  empty board
  if (hour <  6) return 2;   // 2am–6am:       2 seeds
  if (hour <  9) return 4;   // 6am–9am:       4 seeds
  if (hour < 12) return 6;   // 9am–noon:      6 seeds
  if (hour < 15) return 8;   // noon–3pm:      8 seeds
  return 10;                  // 3pm onwards:   full board
}

// ── Load Leaderboard ───────────────────────────────────
async function loadLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  if (!listEl) return;

  listEl.innerHTML = '<p class="lb-loading">Loading scores…</p>';

  try {
    const todayStr = getTodayKeyForAuth();
    const snap = await db.collection('scores')
      .where('date', '==', todayStr)
      .orderBy('score', 'desc')
      .limit(10)
      .get();

    const realScores = [];
    snap.forEach(doc => realScores.push(doc.data()));

    // Pad with seeds up to the time-of-day cap
    const seedCap     = getSeedCap();
    const seedsNeeded = Math.max(0, Math.min(seedCap, 10) - realScores.length);
    const seeds       = getSeedPlayers(todayStr, seedsNeeded);
    const allScores   = [...realScores, ...seeds]
      .sort((a, b) => b.score - a.score);  // ensure correct rank order

    renderLeaderboard(allScores, realScores.length);
  } catch (err) {
    console.error('Leaderboard load error:', err);
    listEl.innerHTML = '<p class="lb-empty">Leaderboard unavailable. Check back soon.</p>';
  }
}

function renderLeaderboard(scores, realCount) {
  const listEl  = document.getElementById('leaderboard-list');
  const countEl = document.getElementById('leaderboard-count');
  if (!listEl) return;

  realCount = realCount || 0;

  if (countEl) {
    const totalShown = scores.length;
    const seedsShown = totalShown - realCount;
    if (realCount === 0 && seedsShown === 0) {
      countEl.textContent = 'Be the first on the board!';
    } else if (realCount >= 10) {
      countEl.textContent = `${realCount} players today`;
    } else {
      countEl.textContent = '';
    }
  }

  const medals  = [
    `<span class="fr-icon fr-icon-lg" style="color:#FFD700">${ICONS.medals.gold}</span>`,
    `<span class="fr-icon fr-icon-lg" style="color:#C0C0C0">${ICONS.medals.silver}</span>`,
    `<span class="fr-icon fr-icon-lg" style="color:#CD7F32">${ICONS.medals.bronze}</span>`,
  ];
  const userUid = currentUser ? currentUser.uid : null;

  listEl.innerHTML = scores.map((s, i) => {
    const isYou  = userUid && s.uid === userUid;
    const isSeed = !!s.isSeed;
    const rank   = i < 3 ? medals[i] : `#${i + 1}`;
    const pct    = Math.round((s.score / s.total) * 100);
    return `
      <div class="lb-row${isYou ? ' lb-row-you' : ''}${isSeed ? ' lb-row-seed' : ''}">
        <span class="lb-rank">${rank}</span>
        <span class="lb-name"><span class="lb-name-text">${escapeHtml(s.displayName)}</span>${isYou ? '<span class="lb-you-tag">You</span>' : ''}</span>
        <span class="lb-score">${s.score}<span class="lb-total">/${s.total}</span></span>
        <span class="lb-pct">${pct}%</span>
      </div>`;
  }).join('');

  // Anonymous user extras: ghost entry + sign-up CTA
  if (!currentUser) {
    const todayStr  = getTodayKeyForAuth();
    const lastScore = localStorage.getItem('fr_lastScore');
    const lastPlayed = localStorage.getItem('fr_lastPlayed');

    // Ghost row — only if they played today
    if (lastScore && lastPlayed === todayStr) {
      const scoreNum = lastScore.split('/')[0];
      const ghost    = document.createElement('div');
      ghost.className = 'lb-row lb-row-ghost';
      ghost.innerHTML = `
        <span class="lb-rank">🔒</span>
        <span class="lb-name">You <span class="lb-ghost-tag">unranked</span></span>
        <span class="lb-score">${scoreNum}<span class="lb-total">/${lastScore.split('/')[1] || 12}</span></span>
        <span class="lb-ghost-action">Claim your spot →</span>`;
      ghost.addEventListener('click', () => openAuthModal('signup'));
      listEl.appendChild(ghost);
    }

    // CTA below the board
    const cta = document.createElement('div');
    cta.className = 'lb-anon-cta';
    cta.innerHTML = `<button class="lb-anon-btn">Sign up to appear on the board →</button>`;
    cta.querySelector('button').addEventListener('click', () => openAuthModal('signup'));
    listEl.appendChild(cta);
  }
}

// ── Streak Banner ──────────────────────────────────────
function streakLabel(n) {
  if (n >= 100) return `${n}-day streak — Triple digits. You're a Fact Royale legend.`;
  if (n >= 51)  return `${n}-day streak — Elite territory.`;
  if (n === 50) return `50-day streak — Most people never make it here.`;
  if (n >= 31)  return `${n}-day streak — You're a regular now.`;
  if (n === 30) return `30-day streak — One full month. That's real dedication.`;
  if (n === 21) return `21-day streak — Three weeks solid.`;
  if (n >= 22)  return `${n}-day streak — Almost a month. Don't blow it now.`;
  if (n >= 15)  return `${n}-day streak — Halfway to a month.`;
  if (n === 14) return `14-day streak — Two weeks straight. Rare.`;
  if (n >= 11)  return `${n}-day streak — Pushing toward two weeks.`;
  if (n === 10) return `10-day streak — Double digits. You're serious about this.`;
  if (n >=  8)  return `${n}-day streak — Still going. Most people quit by now.`;
  if (n ===  7) return `7-day streak — One week down. Don't stop now.`;
  if (n >=  4)  return `${n}-day streak — You're building something.`;
  if (n >=  2)  return `${n}-day streak. Nice start. Keep going.`;
  return `Day 1. The streak starts now!`;
}

function updateStreakBanner(streak, alreadyPlayed, streakBroken) {
  const banner  = document.getElementById('streak-banner');
  const textEl  = document.getElementById('streak-banner-text');
  const btnEl   = document.getElementById('streak-banner-btn');
  if (!banner || !textEl) return;

  // Broken streak — show recovery message instead
  if (streakBroken) {
    textEl.textContent  = `You missed a day. Streak reset. Let's build it back up starting today!`;
    btnEl.style.display = 'inline-block';
    btnEl.textContent   = 'Play Now →';
    btnEl.onclick       = () => document.getElementById('btn-start-hero')?.click();
    banner.className    = 'streak-banner streak-banner-broken';
    banner.style.display = 'flex';
    return;
  }

  if (streak < 1) return;

  if (alreadyPlayed) {
    textEl.textContent  = `${streakLabel(streak)} Secured for today. See you tomorrow!`;
    btnEl.style.display = 'none';
    banner.className    = 'streak-banner streak-banner-safe';
  } else {
    textEl.textContent  = `${streakLabel(streak)} Play today to keep it alive.`;
    btnEl.style.display = 'inline-block';
    btnEl.textContent   = 'Play Now →';
    btnEl.onclick       = () => document.getElementById('btn-start-hero')?.click();
    banner.className    = 'streak-banner streak-banner-active';
  }
  banner.style.display = 'flex';
}

// ── Rank Percentage ────────────────────────────────────
async function calculateAndShowRankPct(userScore, todayStr) {
  try {
    const snap = await db.collection('scores')
      .where('date', '==', todayStr)
      .get();

    const realScores = [];
    snap.forEach(doc => realScores.push(doc.data().score));

    // Include seeds so percentage is meaningful from day one
    const seedCap     = getSeedCap();
    const seedsNeeded = Math.max(0, Math.min(seedCap, 10) - realScores.length);
    const seeds       = getSeedPlayers(todayStr, seedsNeeded);
    const allScores   = [...realScores, ...seeds.map(s => s.score)];

    if (allScores.length < 2) return; // only them, no stat to show

    const beaten = allScores.filter(s => s < userScore).length;
    const tied   = allScores.filter(s => s === userScore).length - 1; // exclude themselves
    const pct    = Math.round(((beaten + tied * 0.5) / allScores.length) * 100);

    const wrapEl = document.getElementById('results-rank-wrap');
    const pctEl  = document.getElementById('results-rank-pct');
    if (!wrapEl || !pctEl) return;

    if (pct === 100) {
      pctEl.textContent = '👑 Top score of the day!';
    } else if (pct === 0) {
      pctEl.textContent = 'Room to grow. Come back tomorrow!';
    } else {
      pctEl.textContent = `You beat ${pct}% of today's players`;
    }
    wrapEl.style.display = 'block';
  } catch (err) {
    console.error('Rank pct error:', err);
  }
}

// ── Load Personal Stats ────────────────────────────────
async function loadPersonalStats(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) renderPersonalStats(snap.data());
  } catch (err) {
    console.error('Personal stats error:', err);
  }
}

function renderPersonalStats(data) {
  const stats = data.stats        || {};
  const cats  = data.categoryStats || {};

  const todayKey = typeof getTodayKey === 'function' ? getTodayKey() : getTodayKeyForAuth();

  // ── Cross-device sync: write Firestore streak into localStorage ──────
  // Only overwrite localStorage when Firestore has a NEWER date — never let
  // a stale Firestore read (e.g. right after an async daily write) clobber
  // a more recent localStorage value from the same session.
  const fsLastPlayed = stats.lastPlayedDate || '';
  const lsLastPlayed = localStorage.getItem('fr_lastPlayed') || '';
  if (fsLastPlayed > lsLastPlayed) {
    localStorage.setItem('fr_lastPlayed', fsLastPlayed);
    localStorage.setItem('fr_streak',     String(stats.currentStreak || 0));
  }

  // ── Effective last-played date: max of Firestore + localStorage ───────
  // submitScoreToFirebase is fire-and-forget; when an archive play triggers
  // loadPersonalStats the daily write may not have committed to Firestore yet.
  // Taking the max date prevents a false "streak reset" banner.
  const effectiveLastPlayed = lsLastPlayed > fsLastPlayed ? lsLastPlayed : fsLastPlayed;
  const lsStreak = parseInt(localStorage.getItem('fr_streak') || '0');
  const effectiveStreak = Math.max(stats.currentStreak || 0, lsStreak);

  // ── Refresh hero badge with authoritative streak ──────────────────────
  // setupLanding() runs before auth resolves so it reads stale localStorage.
  // Overwrite it here once we have the real number.
  const heroBadge = document.getElementById('landing-streak');
  if (heroBadge) {
    heroBadge.innerHTML = effectiveStreak > 0 ? `<span class="fr-icon fr-icon-sm" style="color:var(--gold,#d4af37)">${ICONS.flame}</span> ${effectiveStreak} day streak` : 'Start your streak!';
  }

  // ── Streak break detection ────────────────────────────────────────────
  // If effectiveLastPlayed is neither today nor yesterday, they missed a day.
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const hasPlayedBefore = !!effectiveLastPlayed;
  const streakBroken = hasPlayedBefore &&
                       effectiveLastPlayed !== todayKey &&
                       effectiveLastPlayed !== yesterday &&
                       (stats.longestStreak || 0) > 1;

  const alreadyPlayed = effectiveLastPlayed === todayKey;
  updateStreakBanner(effectiveStreak, alreadyPlayed, streakBroken);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('stat-games',      stats.gamesPlayed   || 0);
  set('stat-streak',     stats.currentStreak || 0);
  set('stat-longest',    stats.longestStreak || 0);
  set('stat-best-score', stats.bestScore != null ? `${stats.bestScore}` : '—');

  const accuracy = stats.questionsAnswered
    ? `${Math.round((stats.questionsCorrect / stats.questionsAnswered) * 100)}%`
    : '—';
  set('stat-accuracy', accuracy);

  // Category bars
  const catsEl = document.getElementById('stat-categories');
  if (!catsEl) return;

  catsEl.innerHTML = Object.entries(cats).map(([cat, s]) => {
    const pct        = s.played ? Math.round((s.correct / s.played) * 100) : 0;
    const colorClass = cat.toLowerCase().includes('history')   ? 'cat-history'
                     : cat.toLowerCase().includes('sport')     ? 'cat-sports'
                     : cat.toLowerCase().includes('geography') ? 'cat-geography'
                     : cat.toLowerCase().includes('science')   ? 'cat-science'
                     : 'cat-music';
    const barColor   = cat.toLowerCase().includes('history')   ? 'var(--history)'
                     : cat.toLowerCase().includes('sport')     ? 'var(--sports)'
                     : cat.toLowerCase().includes('geography') ? 'var(--geography)'
                     : cat.toLowerCase().includes('science')   ? 'var(--science)'
                     : 'var(--music)';
    return `
      <div class="stat-cat-row">
        <div class="stat-cat-header">
          <span class="pill ${colorClass}">${cat}</span>
          <span class="stat-cat-pct">${s.correct}/${s.played} &nbsp;·&nbsp; ${pct}%</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct}%; background:${barColor};"></div>
        </div>
      </div>`;
  }).join('');
}

function renderPersonalStatsEmpty() {
  ['stat-games','stat-streak','stat-longest','stat-accuracy','stat-best-score'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
  const catsEl = document.getElementById('stat-categories');
  if (catsEl) catsEl.innerHTML = '';
}

// ── Returning Visitor Banner ───────────────────────────
function checkReturningVisitorBanner() {
  const lastPlayed = localStorage.getItem('fr_lastPlayed');
  const streak     = parseInt(localStorage.getItem('fr_streak') || '0');
  if (!lastPlayed || streak < 1) return; // first-time visitor, skip

  const banner  = document.getElementById('returning-visitor-banner');
  const textEl  = document.getElementById('returning-visitor-text');
  const btnEl   = document.getElementById('returning-visitor-btn');
  if (!banner || !textEl) return;

  const todayStr = getTodayKeyForAuth();

  if (lastPlayed === todayStr) {
    textEl.textContent = `Nice work. You played today, but your ${streak}-day streak only lives on this device. Create an account to protect it.`;
  } else {
    textEl.textContent = `You're on a ${streak}-day streak. Sign up so it's never lost to a browser clear.`;
  }

  if (btnEl) btnEl.addEventListener('click', () => openAuthModal('signup'));
  banner.style.display = 'flex';
}

// ── Helpers ────────────────────────────────────────────
function getTodayKeyForAuth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/email-already-in-use':   'That email is already registered. Try signing in.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user':   'Sign-in cancelled.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/unauthorized-domain':    'Domain not authorized. Check Firebase Auth settings.',
    'auth/operation-not-allowed':  'Email sign-up is not enabled. Check Firebase Auth providers.',
    'auth/configuration-not-found':'Firebase configuration error. Check project setup.'
  };
  return map[code] || `Error: ${code}`;
}

// ── Wire Up Modal Controls ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-close')
    .addEventListener('click', closeAuthModal);

  // Click outside modal card to close
  document.getElementById('auth-modal')
    .addEventListener('click', e => {
      if (e.target === document.getElementById('auth-modal')) closeAuthModal();
    });

  document.getElementById('tab-login')
    .addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-signup')
    .addEventListener('click', () => switchAuthTab('signup'));

  document.getElementById('nav-signin-btn')
    .addEventListener('click', () => openAuthModal('login'));

  // Leaderboard CTA buttons (may be multiple)
  document.querySelectorAll('.lb-signup-btn')
    .forEach(btn => btn.addEventListener('click', () => openAuthModal('signup')));
});
