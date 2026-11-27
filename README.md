# QR Studio

Generate, scan and save QR codes. Firebase Firestore for storage, deployed on Vercel. Made by Adarsh.

## Features
- Generate QR from GR No, Name, Centre
- Watermark "Made by Adarsh" in the QR image background and footer
- Scan with camera or upload an image
- Download as PNG
- Live saved list (Firestore). Works without a database too (offline mode)

## 1. Firebase setup
1. Firebase Console → create project → Build → **Firestore Database** → Create (production mode).
2. Rules tab → paste the content of `firestore.rules` → Publish.
3. Project settings → General → Your apps → add a **Web app** → copy the config values.

## 2. Push to GitHub
```bash
git init
git add .
git commit -m "QR Studio"
git branch -M main
git remote add origin https://github.com/<your-username>/qr-studio.git
git push -u origin main
```

## 3. Deploy on Vercel
1. Vercel → Add New → Project → import the GitHub repo (Vite is auto-detected).
2. Settings → **Environment Variables**, add all six:

| Name | Firebase config key |
|---|---|
| `VITE_FIREBASE_API_KEY` | apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | authDomain |
| `VITE_FIREBASE_PROJECT_ID` | projectId |
| `VITE_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `VITE_FIREBASE_APP_ID` | appId |

3. Deploy. If you add variables after the first deploy, click **Redeploy**.

## Local run
```bash
cp .env.example .env   # fill the values
npm install
npm run dev
```

## Notes
- Camera scanning needs HTTPS (Vercel gives it) or localhost.
- The included rules are open (anyone can read, create, delete). Fine for a small private tool; add Firebase Auth before sharing the link widely.
