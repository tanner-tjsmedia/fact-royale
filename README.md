# ♛ Fact Royale

Daily trivia. Every answer teaches you something.

---

## Project Structure

```
fact-royale/
├── index.html          ← Main app (landing, quiz, results screens)
├── style.css           ← All styling
├── quiz.js             ← Quiz logic, scoring, streak tracking
├── questions/
│   └── YYYY-MM-DD.json ← One file per day (e.g. 2026-06-13.json)
└── README.md
```

---

## How to Add a New Daily Quiz

1. Create a new file in `/questions/` named with today's date:
   ```
   questions/2026-06-14.json
   ```

2. Follow this format for each question:

```json
{
  "date": "2026-06-14",
  "questions": [
    {
      "category": "History",
      "question": "Your question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "2-3 sentences explaining the correct answer.",
      "memory_hook": "A phrase or trick to help the player remember this fact."
    }
  ]
}
```

**Rules:**
- `answer` must exactly match one of the strings in `options`
- Aim for 10 questions per day (mix of categories)
- `memory_hook` is optional but encouraged — it's the learning differentiator
- Categories currently supported: `History`, `Sports`, `Music/Movies`

---

## How to Deploy to GitHub Pages (Free Hosting)

### First time setup

1. Open **Git Bash** in the `fact-royale` folder:
   ```bash
   git init
   git add .
   git commit -m "Initial build"
   ```

2. Go to [github.com](https://github.com) → **New repository** → name it `fact-royale` → Public → Create

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/fact-royale.git
   git branch -M main
   git push -u origin main
   ```

4. In GitHub: go to **Settings → Pages → Source → Deploy from branch → main / root** → Save

5. Your site goes live at:
   ```
   https://YOUR_USERNAME.github.io/fact-royale/
   ```
   (Takes ~1-2 minutes to appear)

### Adding new daily questions

```bash
# After creating the new JSON file in questions/
git add questions/2026-06-14.json
git commit -m "Add quiz for June 14"
git push
```

GitHub Pages auto-deploys on every push.

---

## How the Quiz Works

- On load, the app looks for `questions/YYYY-MM-DD.json` matching today's date
- If no file exists, it shows a "No quiz today" screen
- Players get one question at a time with 4 multiple-choice options
- Wrong answers reveal: ✗ what the correct answer was + explanation + memory hook
- Correct answers reveal: ✓ + the explanation (learning reinforcement either way)
- Streak tracking persists via `localStorage` (no login required)
- Results screen shows score, per-category breakdown, and a shareable text block

---

## Roadmap (Future Phases)

- [ ] User accounts + persistent mastery tracking
- [ ] Category mastery scores and leaderboards
- [ ] Community competition mode
- [ ] AI-assisted question generation pipeline
- [ ] Multiplayer / live lobby mode
- [ ] Mobile app (iOS/Android)
- [ ] B2B package (custom branded quizzes for bars, teams, events)
