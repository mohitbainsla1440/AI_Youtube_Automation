# AI YouTube Automation

A production-ready AI SaaS mobile app (Expo / React Native) that automates end-to-end YouTube video creation — from topic input to published video.

---

## Features

| Feature | Description |
|---------|-------------|
| Script Generation | GPT-4o generates hooks, intro, body, CTA in 5 tones |
| Voiceover | ElevenLabs V3 multilingual voices with emotion control |
| Stock Visuals | Pexels + Pixabay auto-matched to script scenes |
| AI Thumbnails | DALL·E 3 generates A/B/C variants |
| Auto Subtitles | Whisper-generated SRT burned into video |
| Video Editor | Timeline editor — reorder scenes, swap clips, adjust voice |
| YouTube Upload | Auto-upload with SEO title, description, tags, thumbnail |
| Scheduler | Queue & schedule daily auto-posting |
| Multi-channel | Manage unlimited YouTube channels |
| Analytics | Views, CTR, watch time from YouTube Data API |
| Subscriptions | Free / Pro / Enterprise via Stripe |

---

## Tech Stack

- **Frontend**: Expo 51 + React Native, Expo Router (file-based), NativeWind (Tailwind)
- **State**: Zustand + MMKV (persistent settings)
- **Data Fetching**: TanStack Query + Axios with auto token refresh
- **Auth**: Google OAuth via expo-auth-session
- **Payments**: Stripe React Native SDK
- **AI**: OpenAI GPT-4o, ElevenLabs V3, DALL·E 3, Whisper
- **Video APIs**: Pexels, Pixabay, Runway ML
- **Backend**: Node.js REST API (separate repo) + Python video microservice

---

## Project Structure

```
AI_Youtube_Automation/
├── app/
│   ├── _layout.tsx              # Root layout (QueryClient, Stripe, Toast)
│   ├── auth/
│   │   ├── _layout.tsx          # Redirect to app if authenticated
│   │   └── login.tsx            # Google OAuth login screen
│   └── (app)/
│       ├── _layout.tsx          # Tab navigator
│       ├── index.tsx            # Dashboard
│       ├── create/
│       │   ├── index.tsx        # Wizard Step 1: Topic + tone + template
│       │   ├── script.tsx       # Wizard Step 2: Review & edit script
│       │   ├── voice.tsx        # Wizard Step 3: Voice selection
│       │   └── preview.tsx      # Wizard Step 4+5: Thumbnail + publish
│       ├── editor/
│       │   └── [id].tsx         # Timeline video editor
│       ├── channels/
│       │   └── index.tsx        # YouTube channel manager
│       ├── analytics.tsx        # Analytics dashboard
│       └── settings/
│           └── index.tsx        # API keys, subscription, preferences
├── src/
│   ├── components/
│   │   ├── ui/                  # Button, Card, Badge, Input, Select, etc.
│   │   └── dashboard/           # VideoCard
│   ├── services/
│   │   ├── api.ts               # Axios client with auto token refresh + retry
│   │   ├── scriptService.ts     # OpenAI script generation
│   │   ├── voiceService.ts      # ElevenLabs voiceover
│   │   ├── videoService.ts      # Video pipeline + stock footage
│   │   ├── thumbnailService.ts  # DALL·E thumbnail generation
│   │   ├── youtubeService.ts    # YouTube Data API + OAuth
│   │   └── stripeService.ts     # Stripe subscriptions
│   ├── store/
│   │   ├── authStore.ts         # User auth state (Zustand)
│   │   ├── videoStore.ts        # Video projects + creation wizard
│   │   ├── channelStore.ts      # YouTube channels + analytics
│   │   └── settingsStore.ts     # API keys + preferences (MMKV)
│   ├── hooks/
│   │   ├── useVideoCreation.ts  # Pipeline polling hook
│   │   ├── useYouTubeUpload.ts  # Upload progress hook
│   │   ├── useAnalytics.ts      # Analytics data hook
│   │   ├── usePlanGate.ts       # Feature gating by subscription plan
│   │   └── useDebounce.ts       # Debounce input/callback
│   ├── types/index.ts           # All TypeScript types
│   └── utils/
│       ├── constants.ts         # Colors, tones, languages, templates, plans
│       ├── helpers.ts           # Formatters, SRT generator, retry util
│       └── logger.ts            # Structured logger with log levels
├── .env.example                 # Required environment variables
├── app.json                     # Expo config
├── babel.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Setup

### 1. Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS / Android)

### 2. Clone & install

```bash
git clone https://github.com/your-org/ai-youtube-automation.git
cd AI_Youtube_Automation
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in your Google OAuth client IDs and Stripe publishable key
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client IDs for:
   - Web (for `expo-auth-session` token exchange)
   - iOS (bundle ID: `com.aiyoutube.automation`)
   - Android (package: `com.aiyoutube.automation`)
4. Enable: **YouTube Data API v3**, **Google People API**
5. Add `aiyoutube://` as an authorized redirect URI

### 5. Start the app

```bash
npx expo start
# Scan QR code with Expo Go
```

### 6. Add API Keys in app

Open the app → **Settings** → **API Keys** and enter:

| Key | Where to get |
|-----|-------------|
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| ElevenLabs | [elevenlabs.io/api](https://elevenlabs.io/api) |
| Pexels | [pexels.com/api](https://www.pexels.com/api/) |
| Pixabay | [pixabay.com/api/docs](https://pixabay.com/api/docs/) |
| Runway ML | [runwayml.com](https://runwayml.com) |

---

## Example Workflow

```
User inputs: "10 mind-blowing facts about black holes"
     ↓
[Script Service]  GPT-4o → hook + intro + 10 body points + CTA
     ↓
[Voice Service]   ElevenLabs V3 → MP3 voiceover (~5 min)
     ↓
[Visual Service]  Pexels/Pixabay → 10 matched stock clips
     ↓
[Subtitle Service] Whisper → SRT captions → burned into video
     ↓
[Render Service]  FFmpeg → final MP4 (1080p)
     ↓
[Thumbnail]       DALL·E 3 → 3 thumbnail variants (A/B/C)
     ↓
[Upload Service]  YouTube Data API → published with SEO metadata
     ↓
Video live on YouTube ✅
```

---

## Subscription Plans

| | Free | Pro ($29/mo) | Enterprise ($99/mo) |
|--|------|-------------|---------------------|
| Videos/month | 3 | 30 | Unlimited |
| Max duration | 5 min | 15 min | 60 min |
| Channels | 1 | 3 | Unlimited |
| Auto scheduling | ✗ | ✓ | ✓ |
| Bulk creation | ✗ | ✓ | ✓ |
| AI Avatars | ✗ | ✗ | ✓ |
| Analytics | ✗ | ✓ | ✓ |

---

## Backend API (Required)

This app requires a backend server. The API contract follows REST with JWT auth.

Key endpoints consumed by the app:

```
POST /auth/google          — Exchange Google token
GET  /auth/me              — Get current user
POST /scripts/generate     — Generate script (proxies OpenAI)
POST /voice/generate       — Start voiceover job (proxies ElevenLabs)
POST /videos               — Create project
POST /videos/:id/pipeline/start  — Start full generation pipeline
GET  /videos/:id/pipeline/status — Poll pipeline status
POST /youtube/upload       — Upload to YouTube
GET  /youtube/channels     — List connected channels
GET  /youtube/channels/:id/analytics — Get analytics
POST /billing/subscribe    — Create Stripe subscription
```

---

## Performance Optimisations

- **MMKV** for settings (10× faster than AsyncStorage)
- **TanStack Query** with 30s stale time reduces redundant fetches
- **Axios retry** with exponential back-off (3 attempts, 2× multiplier)
- **Pipeline polling** every 5s with 1hr timeout
- **Zustand** for zero-boilerplate reactive state
- **FlashList** for virtualised video lists
- **Parallel thumbnail generation** — 3 DALL·E requests fired concurrently

---

## License

MIT
