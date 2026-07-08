# Campus Circular Agent

Turns messy college notices (WhatsApp screenshots, notice-board photos, scanned PDFs) into structured reminders automatically — no manual data entry, no calendar linking. Forward a notice to a WhatsApp number, get a structured reminder back, and see it on a live dashboard.

## How it works

1. Student forwards a notice photo/PDF to a WhatsApp number (Twilio Sandbox).
2. Twilio webhook hits the backend with the media URL.
3. Backend downloads the file and sends it to Gemini's multimodal API for structured extraction (title, category, date, action required, urgency).
4. Result is saved to MongoDB and an instant WhatsApp confirmation is sent back — no manual "confirm to add" step.
5. Student views all reminders, categorized and sorted, on the React dashboard.
6. A daily cron job sends a WhatsApp nudge for anything due in the next 48 hours.

## Tech stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Twilio WhatsApp API, Gemini API, node-cron
- **Frontend:** React (Vite)

---

## Part 1: Local Setup

### Prerequisites
- Node.js 18+
- A MongoDB Atlas account (free tier is fine)
- A Gemini API key: https://aistudio.google.com/apikey
- A Twilio account (free trial works): https://www.twilio.com/try-twilio

### 1. Get a MongoDB Atlas connection string
Create a free cluster, add a database user, whitelist your IP (or `0.0.0.0/0` for development), and copy the connection string.

### 2. Set up Twilio WhatsApp Sandbox
1. In the Twilio Console, go to **Messaging → Try it out → Send a WhatsApp message**.
2. Follow the instructions to join your sandbox (you'll send a code like `join <two-words>` to the Twilio sandbox number from your own WhatsApp).
3. Note your **Account SID**, **Auth Token**, and the sandbox WhatsApp number (usually `whatsapp:+14155238886`).
4. This sandbox is for development/demo only — fine for your placement portfolio and interview demo.

### 3. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# now fill in .env with your MongoDB URI, Gemini key, and Twilio credentials
npm run dev
```
Backend runs on `http://localhost:5000`.

### 4. Expose your local backend for Twilio's webhook (development only)
Twilio needs a public URL to send webhooks to. Use a tunneling tool like ngrok:
```bash
ngrok http 5000
```
Copy the `https://...ngrok-free.app` URL it gives you.

### 5. Configure the Twilio webhook
In the Twilio Console sandbox settings, set **"When a message comes in"** to:
```
https://<your-ngrok-url>/api/webhook/whatsapp
```
Method: `HTTP POST`.

### 6. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL should point to http://localhost:5000/api for local dev
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 7. Test it
Send a photo of any notice (or a test image with a date/deadline in it) to your Twilio sandbox WhatsApp number. You should get a confirmation reply, and the reminder should appear on the dashboard when you enter your phone number.

---

## Part 2: Push to GitHub

From the root `campus-circular-agent` folder:

```bash
git init
git add .
git commit -m "Initial commit: Campus Circular Agent"
git branch -M main
git remote add origin https://github.com/Ananya2305k/campus-circular-agent.git
git push -u origin main
```

(Create the empty repo on GitHub first via "New repository" — don't initialize it with a README there, since you already have one.)

**Important:** `.env` files are already in `.gitignore` for both frontend and backend — never commit real API keys or Twilio credentials.

---

## Part 3: Deployment

### Backend → Render
1. Go to https://render.com → New → Web Service → connect your GitHub repo.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all variables from `.env.example` under Render's Environment settings (with your real values).
6. Deploy. Copy the resulting URL, e.g. `https://campus-circular-agent.onrender.com`.

### Update Twilio webhook to the live backend
In Twilio sandbox settings, change the webhook URL to:
```
https://campus-circular-agent.onrender.com/api/webhook/whatsapp
```

### Frontend → Vercel
1. Go to https://vercel.com → New Project → import your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable `VITE_API_URL` = `https://campus-circular-agent.onrender.com/api`.
4. Deploy.

### Update backend CORS
In Render's environment variables for the backend, set `FRONTEND_URL` to your deployed Vercel URL (e.g. `https://campus-circular-agent.vercel.app`), then redeploy the backend so CORS allows requests from it.

---

## Notes / known limitations (good to mention honestly in interviews)

- Uses Twilio's **WhatsApp Sandbox**, which is free for development but requires each tester to join the sandbox first (`join <code>`). A production WhatsApp Business API would remove that step but requires business verification.
- Dashboard identifies students by phone number only — no OTP/password auth in this MVP. A natural next step would be adding JWT-based auth like in your other projects.
- If Gemini's extraction confidence is low (blurry photo, handwriting), it still returns its best guess — a future improvement would be flagging low-confidence extractions for manual review instead of silently trusting them.
- Render free tier spins down on inactivity, so the first webhook call after idle time may be slow (a few seconds) — worth knowing before a live demo.
