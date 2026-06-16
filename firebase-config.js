/* =====================================================
   FACT ROYALE — Firebase Configuration
   =====================================================
   1. Go to https://console.firebase.google.com
   2. Create a project called "fact-royale"
   3. Project Settings → Your Apps → Add Web App
   4. Copy the config object and paste the values below
   ===================================================== */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBIsusWIMcFpGKeZeP3CemHikOizby2Zro",
  authDomain:        "fact-royale.firebaseapp.com",
  projectId:         "fact-royale",
  storageBucket:     "fact-royale.firebasestorage.app",
  messagingSenderId: "79646023605",
  appId:             "1:79646023605:web:7693871d043af940fd03fc"
};

firebase.initializeApp(FIREBASE_CONFIG);

const auth = firebase.auth();
const db   = firebase.firestore();


/* =====================================================
   FIRESTORE SECURITY RULES
   =====================================================
   In the Firebase Console → Firestore → Rules tab,
   replace the default rules with these:

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // Leaderboard scores — anyone can read, only the owner can write
       match /scores/{scoreId} {
         allow read: if true;
         allow write: if request.auth != null
                      && request.auth.uid == request.resource.data.uid;
       }

       // User profiles — only the user can read or write their own
       match /users/{userId} {
         allow read, write: if request.auth != null
                            && request.auth.uid == userId;
       }
     }
   }
   ===================================================== */
