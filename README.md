# Lock-In · Anti-Procrastination & Collaborative Study Platform

Lock-In is a full-stack web application designed to help students overcome passive scrolling and procrastination through strict study-to-break ratio timers, a Manifest V3 browser distraction shield, cognitive warm-up mini-games, real-time WebRTC study rooms, and gamified companion progression.

---

## Core Capabilities

1. **Strict Study-to-Break Focus Engine (`/focus`)**
   - Supports **Classic Pomodoro (25m/5m)**, **Deep Work (50m/10m)**, and **Ultradian Flow (90m/15m)** presets using wall-clock completion timestamps (`Date.now() + duration`) for zero background-tab drift.
   - **Multi-Sensor Procrastination Nudge System (`useProcrastinationSensors`)**: Monitors tab visibility (`visibilitychange`), window focus (`blur`), top-edge exit intent (`mouseleave`), and mobile gyroscope tilt (`deviceorientation` > $35^\circ$) during active study blocks.
   - **Synthesized Web Audio (`src/lib/sound.ts`)**: Real-time oscillator-based audio cues (`AudioContext`) requiring zero external audio assets.

2. **Hard App Distraction Shield (`src/lib/app-blocking.ts` & `src/lib/zip.ts`)**
   - Compiles a downloadable **Manifest V3 Chrome/Edge Extension (`lockin-extension.zip`)** directly in the browser using a custom CRC-32 / PKZIP binary builder.
   - Dynamically arms `chrome.declarativeNetRequest` rules only when `running === true && phase === "study" && endTime > Date.now()`, automatically unlocking restricted sites during breaks or when idle.

3. **Collaborative WebRTC Study Rooms (`/rooms` & `/rooms/$roomId`)**
   - **Triple-Transport Real-Time Mesh (`src/lib/rooms.ts`)**: Combines **Firebase Firestore `onSnapshot` listeners**, **Trystero Nostr WebRTC DataChannels**, and **HTML5 `BroadcastChannel`** for synchronized group timers, participant heartbeats, goal tracking, and live chat.
   - **Peer-to-Peer Video & Audio (`src/components/VideoRoom.tsx`)**: Streams live webcam and microphone tracks via Trystero and a direct `RTCPeerConnection` mesh signaled over Firestore (`rooms/{roomId}/signals`) and `BroadcastChannel`.

4. **Cognitive Brain Warm-Up Games (`/warmup`)**
   - Four 45–60 second mini-games to prime working memory and spatial focus before studying: **Wordle Jumble** (multi-row anagrams), **NumPuz** ($3\times 3$ and $4\times 4$ sliding tile puzzles with guaranteed-solvable random walks), **Arrow Puzzle Challenge** (ray-casting escape maze), and **Connect Dots** (*Flow Free*–style pipe routing).

5. **Gamification, Mindful Reflection & Analytics (`/`, `/checkin`, `/reports`)**
   - **Focus Companion (`src/components/VirtualPet.tsx`)**: Earns XP (`+20 XP` per task) and Happiness from tasks and study blocks, leveling up every `100 XP`.
   - **Streaks, Points & Milestone Badges (`src/lib/store.ts`)**: Tracks idempotent daily streaks (`calculateNextStreak`), Focus Points, and unlocks achievement badges (`First Step`, `On a Roll`, `Locked In`, `3-Day Streak`).
   - **Daily Reflections & 7-Day Reports**: Morning/evening energy check-ins (`1–5` scale) and post-Pomodoro quality/difficulty ratings visualized in 7-day consistency charts.

---

## Tech Stack

- **Frontend Framework**: React 19 + TypeScript (`~6.0`) + Vite 8
- **Routing**: TanStack Router (`@tanstack/react-router`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide Icons
- **State Management**: React `useSyncExternalStore` with offline-first `localStorage` + Cloud Firestore dual-write persistence
- **Backend & Real-Time Sync**: Firebase Authentication, Cloud Firestore (`onSnapshot`), Trystero (`trystero/nostr`), native WebRTC (`RTCPeerConnection`), and `BroadcastChannel`

---

## Getting Started & Reproducibility

### 1. Prerequisites
- **Node.js** `>= 20.x` and **npm** `>= 10.x`

### 2. Installation
```bash
npm install
```

### 3. Environment Variables (Optional Override)
The project includes a pre-configured Firebase connection for immediate grading and testing. To point the application to your own Firebase project, copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
And populate your `VITE_FIREBASE_*` keys. Firestore security rules are provided in `firestore.rules`.

### 4. Run Development Server
```bash
npm run dev
```

### 5. Production Build & Type Verification
```bash
npm run build
```

### 6. Linting & Automated Tests
```bash
npm run lint
npm test
```

---

## Installing the Hard App Distraction Shield (Chrome / Edge Extension)

1. Open the app and navigate to **Focus** (`/focus`) or any **Study Room** (`/rooms/$roomId`).
2. Select the distracting websites/apps you want to lock during study blocks and click **Download Extension (`.zip`)**.
3. Extract `lockin-extension.zip` to a folder on your computer.
4. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode** in the top-right corner, click **Load unpacked**, and select the extracted folder.

---

## Repository Structure

```text
├── .env.example                        # Environment variable template for Firebase config
├── firestore.rules                     # Cloud Firestore security rules for users & rooms
├── package.json                        # Scripts (dev, build, lint, test) and dependencies
├── tests/
│   └── lockin.test.mjs                 # Node.js automated verification suite (npm test)
└── src/
    ├── __root.tsx                      # Root layout & global extension shield sync listener
    ├── index.tsx                       # Dashboard (Hero, StatCards, TaskBoard, VirtualPet, Badges)
    ├── focus.tsx                       # Solo Focus Timer, ratio presets & distraction shield
    ├── warmup.tsx                      # 4 Cognitive Warm-Up Games (Wordle, NumPuz, Arrow, Dots)
    ├── rooms.index.tsx                 # Study Rooms lobby & profile editor
    ├── rooms.$roomId.tsx               # Live collaborative Study Room (Timer, Video, Goals, Chat)
    ├── checkin.tsx                     # Morning & Evening Mindful Energy Reflection
    ├── reports.tsx                     # 7-Day Focus Consistency & Mood Trend Analytics
    ├── login.tsx / register.tsx        # Firebase Email/Password Authentication pages
    ├── components/
    │   ├── AppNav.tsx                  # Responsive navigation bar, streak/points pills & theme toggle
    │   ├── TaskBoard.tsx               # Task CRUD, priority badges & status filters
    │   ├── VideoRoom.tsx               # WebRTC P2P video/audio grid (Trystero + Firestore/BC Mesh)
    │   ├── VirtualPet.tsx              # Gamified Focus Companion ("Sparky")
    │   ├── HardBlockSelector.tsx       # Distraction domain selector & extension ZIP trigger
    │   └── ProcrastinationNudgeModal.tsx # Full-screen accountability alert modal
    └── lib/
        ├── store.ts                    # Global store (useSyncExternalStore + localStorage + Firestore)
        ├── rooms.ts                    # Triple-transport room synchronization engine
        ├── app-blocking.ts             # Manifest V3 extension compiler & cross-tab shield sync
        ├── useProcrastinationSensors.ts# Shared multi-sensor off-task detection hook
        ├── sound.ts                    # Web Audio API synthesized chimes & alerts
        ├── zip.ts                      # Pure TypeScript CRC-32 & PKZIP binary generator
        ├── firebase.ts                 # Firebase Auth & Firestore initialization
        └── __tests__/
            └── lockin.test.ts          # TypeScript unit verification suite
```
