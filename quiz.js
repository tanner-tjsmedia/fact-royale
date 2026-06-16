/* ===========================
   FACT ROYALE — Quiz Logic
   =========================== */

// ── Fun Facts ──────────────────────────────────────────
const FUN_FACTS = [
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "Oxford University is older than the Aztec Empire.",
  "A day on Venus is longer than a year on Venus.",
  "The shortest war in history lasted 38–45 minutes: the Anglo-Zanzibar War of 1896.",
  "Scotland's national animal is the unicorn.",
  "Nintendo was founded in 1889 — originally as a playing card company.",
  "The Eiffel Tower grows about 6 inches taller in summer due to thermal expansion.",
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "Bananas are berries, but strawberries are not.",
  "The inventor of the Pringles can is buried in one.",
  "Wombats are the only animals known to produce cube-shaped droppings.",
  "A bolt of lightning is five times hotter than the surface of the Sun.",
  "Octopuses have three hearts, nine brains, and blue blood.",
  "There are more possible games of chess than atoms in the observable universe.",
  "Alaska is simultaneously the westernmost and easternmost state in the US.",
  "The Great Wall of China is not visible from space with the naked eye — that's a persistent myth.",
  "The first known computer bug was a real bug: a moth found in a Harvard relay in 1947.",
  "The Hawaiian alphabet has only 13 letters.",
  "The average person will walk roughly 100,000 miles in their lifetime — about four trips around the Earth.",
  "Sharks are older than trees. Sharks have existed for ~450 million years; trees for ~350 million.",
  "A group of flamingos is called a flamboyance.",
  "The word 'quiz' has no agreed-upon origin — its etymology is genuinely unknown.",
  "Humans share about 60% of their DNA with bananas.",
  "Marie Curie's notebooks are still radioactive and stored in lead-lined boxes. Visitors must sign a waiver to view them.",
  "The total weight of all ants on Earth is roughly comparable to the total weight of all humans.",
];

function getRandomFunFact() {
  return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
}

// ── State ──────────────────────────────────────────────
let questions    = [];
let currentIndex = 0;
let score        = 0;
let answered     = false;
let categoryScores = {}; // { "History": {correct:0, total:0}, ... }
let todayKey     = '';   // "2026-06-13"

// ── Helpers ────────────────────────────────────────────

function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getCategoryClass(category) {
  const c = category.toLowerCase();
  if (c.includes('history'))            return 'cat-history';
  if (c.includes('sport'))             return 'cat-sports';
  if (c.includes('music') || c.includes('movie')) return 'cat-music';
  return 'cat-default';
}

function formatDate(key) {
  const [yyyy, mm, dd] = key.split('-');
  const d = new Date(yyyy, mm - 1, dd);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Screens ────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Streak ─────────────────────────────────────────────

function getStreak() {
  return parseInt(localStorage.getItem('fr_streak') || '0');
}

function getLastPlayed() {
  return localStorage.getItem('fr_lastPlayed') || '';
}

function saveResult(finalScore) {
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const lastPlayed = getLastPlayed();
  let streak = getStreak();

  if (lastPlayed === yesterday) {
    streak += 1;
  } else if (lastPlayed !== todayKey) {
    streak = 1;
  }

  localStorage.setItem('fr_streak',       streak);
  localStorage.setItem('fr_lastPlayed',   todayKey);
  localStorage.setItem('fr_lastScore',    `${finalScore}/${questions.length}`);
  localStorage.setItem('fr_categoryScores', JSON.stringify(categoryScores));

  return streak;
}

function alreadyPlayedToday() {
  return getLastPlayed() === todayKey;
}

// ── Landing Screen ─────────────────────────────────────

function setupLanding(data) {
  document.getElementById('landing-date').textContent   = formatDate(todayKey);

  const streak = getStreak();
  const streakEl = document.getElementById('landing-streak');
  streakEl.textContent = streak > 0 ? `🔥 ${streak} day streak` : 'Start your streak!';

  // Category pills
  const cats = [...new Set(data.questions.map(q => q.category))];
  const pillsEl = document.getElementById('landing-categories');
  pillsEl.innerHTML = cats.map(c =>
    `<span class="pill ${getCategoryClass(c)}">${c}</span>`
  ).join('');

  // Set date on daily card
  const dateCardEl = document.getElementById('landing-date-card');
  if (dateCardEl) dateCardEl.textContent = formatDate(todayKey);

  // Already played today?
  if (alreadyPlayedToday()) {
    ['btn-start-hero', 'btn-start-section'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.getElementById('already-played-msg').style.display = 'block';
    document.getElementById('final-score-replay').textContent =
      `Score: ${localStorage.getItem('fr_lastScore')}`;
  } else {
    ['btn-start-hero', 'btn-start-section'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', startQuiz);
    });
  }

  // Email form — submits to Google Sheets via Apps Script
  const SIGNUP_URL = 'https://script.google.com/macros/s/AKfycbzCboRQs6V2YbKuUTSnGIdMXZIPlmYl2jLZVMnbvapVNlDIOKlQgLmsW1Qqjsc1BkoK/exec';

  const form = document.getElementById('notify-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) return;

      // Submit to Google Apps Script
      // mode: 'no-cors' is required — Google doesn't return CORS headers,
      // so we can't read the response, but the data still saves to your Sheet.
      fetch(SIGNUP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({ email })
      });

      // Show confirmation immediately (optimistic — submission is reliable)
      form.style.display = 'none';
      document.getElementById('notify-confirm').style.display = 'block';
    });
  }
}

// ── Quiz ───────────────────────────────────────────────

function startQuiz() {
  currentIndex = 0;
  score        = 0;
  answered     = false;
  categoryScores = {};

  // Init category score trackers
  questions.forEach(q => {
    if (!categoryScores[q.category]) {
      categoryScores[q.category] = { correct: 0, total: 0 };
    }
    categoryScores[q.category].total++;
  });

  showScreen('screen-quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentIndex];
  answered = false;

  // Progress
  const pct = (currentIndex / questions.length) * 100;
  document.getElementById('progress-bar').style.width  = `${pct}%`;
  document.getElementById('progress-text').textContent = `${currentIndex + 1} / ${questions.length}`;

  // Streak in header
  const streak = getStreak();
  document.getElementById('quiz-streak').textContent = streak > 0 ? `🔥 ${streak}` : '';

  // Category tag
  const catEl = document.getElementById('q-category');
  catEl.textContent  = q.category;
  catEl.className    = `category-tag ${getCategoryClass(q.category)}`;

  // Question
  document.getElementById('q-text').textContent = q.question;

  // Options — shuffle them each render
  const opts   = shuffle(q.options);
  const grid   = document.getElementById('options-grid');
  grid.innerHTML = '';

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, q));
    grid.appendChild(btn);
  });

  // Hide feedback
  document.getElementById('feedback-box').style.display = 'none';
}

function handleAnswer(selected, q) {
  if (answered) return;
  answered = true;

  const isCorrect = selected === q.answer;

  // Highlight all option buttons
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) {
      btn.classList.add('correct');
    } else if (btn.textContent === selected && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  // Track score
  if (isCorrect) {
    score++;
    categoryScores[q.category].correct++;
  }

  // Feedback
  const feedbackBox    = document.getElementById('feedback-box');
  const feedbackResult = document.getElementById('feedback-result');
  const explanation    = document.getElementById('feedback-explanation');
  const hookBox        = document.getElementById('memory-hook');
  const hookText       = document.getElementById('hook-text');

  feedbackResult.textContent = isCorrect ? '✓ Correct!' : `✗ The answer was: ${q.answer}`;
  feedbackResult.className   = `feedback-result ${isCorrect ? 'correct' : 'wrong'}`;
  explanation.textContent    = q.explanation;

  if (q.memory_hook) {
    hookText.textContent        = q.memory_hook;
    hookBox.style.display       = 'block';
  } else {
    hookBox.style.display = 'none';
  }

  feedbackBox.style.display = 'block';

  // Wire up Next button
  const btnNext = document.getElementById('btn-next');
  const isLast  = currentIndex === questions.length - 1;
  btnNext.textContent = isLast ? 'See Results →' : 'Next Question →';

  btnNext.onclick = () => {
    currentIndex++;
    if (currentIndex >= questions.length) {
      showResults();
    } else {
      renderQuestion();
    }
  };
}

// ── Results ────────────────────────────────────────────

function showResults() {
  const streak = saveResult(score);

  // Submit to Firebase if user is logged in (auth.js handles the guard)
  if (typeof submitScoreToFirebase === 'function') {
    submitScoreToFirebase(score, questions.length, categoryScores, todayKey);
  }

  showScreen('screen-results');

  // Title
  const pct = score / questions.length;
  let title = 'Nice effort!';
  if (pct === 1)        title = 'Perfect Score! 👑';
  else if (pct >= 0.8)  title = 'Royale performance!';
  else if (pct >= 0.6)  title = 'Solid showing!';
  else if (pct >= 0.4)  title = 'Room to grow — keep playing!';
  document.getElementById('results-title').textContent = title;

  // Score display
  document.getElementById('score-display').innerHTML =
    `${score}<span> / ${questions.length}</span>`;

  // Category breakdown
  const breakdown = document.getElementById('category-breakdown');
  breakdown.innerHTML = '';
  Object.entries(categoryScores).forEach(([cat, s]) => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    row.innerHTML = `
      <span class="breakdown-label">${cat}</span>
      <span class="breakdown-score">${s.correct} / ${s.total}</span>
    `;
    breakdown.appendChild(row);
  });

  // Streak
  if (streak > 1) {
    const streakRow = document.createElement('div');
    streakRow.className = 'breakdown-row';
    streakRow.innerHTML = `
      <span class="breakdown-label">🔥 Streak</span>
      <span class="breakdown-score">${streak} days</span>
    `;
    breakdown.appendChild(streakRow);
  }

  // Fun fact
  document.getElementById('fun-fact-text').textContent = getRandomFunFact();

  // Share
  document.getElementById('btn-share').onclick = shareScore;

  // Home button
  document.getElementById('btn-home').onclick = () => {
    showScreen('screen-landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof loadLeaderboard === 'function') loadLeaderboard();
  };
}

function shareScore() {
  const catLines = Object.entries(categoryScores)
    .map(([cat, s]) => `  ${cat}: ${s.correct}/${s.total}`)
    .join('\n');

  const text =
`♛ Fact Royale — ${formatDate(todayKey)}
Score: ${score}/${questions.length}

${catLines}

Play at fact-royale.com`;

  navigator.clipboard.writeText(text).then(() => {
    document.getElementById('share-confirm').style.display = 'block';
    setTimeout(() => {
      document.getElementById('share-confirm').style.display = 'none';
    }, 2500);
  }).catch(() => {
    alert(text); // Fallback if clipboard blocked
  });
}

// ── Boot ───────────────────────────────────────────────

async function init() {
  todayKey = getTodayKey();

  try {
    const res  = await fetch(`questions/${todayKey}.json`);
    if (!res.ok) throw new Error('No quiz file');
    const data = await res.json();

    questions = shuffle(data.questions);
    setupLanding(data);
    showScreen('screen-landing');
  } catch (e) {
    showScreen('screen-noquiz');
  }
}

document.addEventListener('DOMContentLoaded', init);
