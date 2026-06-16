# Firebase Setup — Fact Royale

Follow these steps once. Takes about 10 minutes.

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Create a project"**
3. Name it `fact-royale`
4. Disable Google Analytics (not needed for now) → **Create project**

---

## Step 2 — Add a Web App

1. In your project, click the **</>** (Web) icon
2. Register app name: `Fact Royale Web`
3. **Do NOT check** "Firebase Hosting" (you're staying on GitHub Pages)
4. Click **Register app**
5. You'll see a config block like this — **copy the whole thing**:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fact-royale-xxxxx.firebaseapp.com",
  projectId: "fact-royale-xxxxx",
  storageBucket: "fact-royale-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

6. Open `firebase-config.js` in VS Code and paste those values in

---

## Step 3 — Enable Authentication

1. Left sidebar → **Build → Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → set support email → Save
4. Under **Settings → Authorized domains**, add your custom domain once you have it (e.g. `factroyal.com`)

---

## Step 4 — Set Up Firestore Database

1. Left sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Production mode** → Next
4. Select a location (us-east1 is fine) → **Enable**
5. Once it loads, click the **Rules** tab
6. Replace everything with these rules and click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /scores/{scoreId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == request.resource.data.uid;
    }

    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

---

## Step 5 — Create the Leaderboard Index

Firestore needs an index to sort leaderboard queries efficiently.

1. Still in Firestore, click the **Indexes** tab
2. Click **Create index**
3. Collection ID: `scores`
4. Add fields:
   - `date` — Ascending
   - `score` — Descending
5. Click **Create** — takes 1-2 minutes to build

> Alternatively: when you first play a quiz while logged in, Firebase will show a link in the browser console that auto-creates the index. Click it.

---

## Step 6 — Push to GitHub

After pasting your config keys into `firebase-config.js`, push:

```bash
cd ~/Desktop/fact-royale
git add .
git commit -m "Add Firebase auth, leaderboard, and personal stats"
git push origin main
```

---

## Step 7 — Custom Domain (once you have it)

After buying your domain from Cloudflare or Porkbun:

**GitHub Pages side:**
1. In your GitHub repo → Settings → Pages
2. Under "Custom domain", type your domain → Save
3. This creates a `CNAME` file in your repo automatically

**Domain registrar side (Cloudflare):**
1. DNS → Add record:
   - Type: `CNAME`
   - Name: `www`
   - Target: `tanner-tjsmedia.github.io`
2. Add four A records (for apex domain):
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. Enable HTTPS in GitHub Pages settings after DNS propagates (~10 min)

**Domain registrar side (Porkbun):**
Same records, just in Porkbun's DNS management panel.

**After domain is live:**
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add your new domain so Google sign-in works on it

---

## What's Already Built

Once your Firebase config keys are pasted in and pushed:

- **Leaderboard** — shows today's top 10 scores, live, on the homepage
- **Auth modal** — Sign In / Create Account / Google one-tap, accessible from the nav
- **Score submission** — automatically fires when a logged-in user finishes a quiz
- **Personal stats** — games played, current streak, best streak, accuracy %, best score, category breakdown bars — visible on the homepage when logged in
- **User profiles** — stored in Firestore, private to each user
