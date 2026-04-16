<h1 align="center">🎬 AI YouTube Automation</h1>

<p align="center">
  <img src="icon.png" alt="AI YouTube Automation Logo" width="120" />
</p>

<p align="center">
  🚀 End-to-end AI-powered YouTube video creation app  
  <br/>
  From idea → script → voice → video → upload — fully automated
</p>

---

## ✨ Overview

AI YouTube Automation is a **production-ready AI SaaS mobile app** built with Expo & React Native that automates the complete YouTube content pipeline.

👉 Just enter a topic — the app handles everything:
- Script writing  
- Voice generation  
- Visuals  
- Editing  
- Thumbnail  
- Upload  

---

## 🔥 Features

| Feature | Description |
|--------|------------|
| 🧠 Script Generation | GPT-4o creates engaging scripts (hook, intro, body, CTA) |
| 🎙 Voiceover | ElevenLabs multilingual AI voices with emotion |
| 🎥 Stock Visuals | Auto-fetch visuals from Pexels & Pixabay |
| 🖼 AI Thumbnails | Generate high-converting thumbnails (A/B testing) |
| 📝 Subtitles | Auto captions via Whisper (SRT + burn-in) |
| ✂️ Video Editor | Timeline-based editing inside app |
| 📤 YouTube Upload | Auto upload with SEO metadata |
| ⏰ Scheduler | Schedule daily/weekly posts |
| 📊 Analytics | CTR, watch time, views tracking |
| 💳 Monetization | Stripe subscriptions (Free / Pro / Enterprise) |

---

## 📸 Screenshots (Coming Soon)

<!-- Add screenshots here -->
<!-- ![App Screenshot](assets/screenshot1.png) -->

---

## 🛠 Tech Stack

### 📱 Frontend
- Expo 51 + React Native  
- Expo Router (file-based navigation)  
- NativeWind (Tailwind CSS)  

### ⚙️ State & Data
- Zustand + MMKV (fast storage)  
- TanStack Query + Axios  

### 🔐 Auth & Payments
- Google OAuth (expo-auth-session)  
- Stripe React Native SDK  

### 🤖 AI & APIs
- OpenAI GPT-4o (script generation)  
- ElevenLabs (voice AI)  
- DALL·E 3 (thumbnails)  
- Whisper (subtitles)  
- Pexels + Pixabay (visuals)  
- Runway ML (video AI)  

### 🖥 Backend
- Node.js REST API  
- Python video processing microservice  

---

## 📂 Project Structure

AI_Youtube_Automation/
├── app/                # Expo Router screens
├── src/                # Components, services, hooks, store
├── assets/             # Images, icons
├── .env.example
├── app.json
├── package.json

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
git clone https://github.com/your-org/ai-youtube-automation.git
cd AI_Youtube_Automation
npm install
```

---

### 2. Setup environment

```bash
cp .env.example .env
```

Add your keys:
- Google OAuth
- Stripe
- API endpoints

---

### 3. Start app

```bash
npx expo start
```

Scan QR with Expo Go 📱

---

## 🔑 API Keys Required

| Service | Link |
|--------|------|
| OpenAI | https://platform.openai.com/api-keys |
| ElevenLabs | https://elevenlabs.io/api |
| Pexels | https://www.pexels.com/api/ |
| Pixabay | https://pixabay.com/api/docs |
| Runway ML | https://runwayml.com |

---

## ⚙️ Example Workflow

Topic Input
   ↓
GPT-4o → Script
   ↓
ElevenLabs → Voice
   ↓
Stock APIs → Visuals
   ↓
Whisper → Subtitles
   ↓
FFmpeg → Final Video
   ↓
YouTube API → Upload 🚀

---

## 💰 Subscription Plans

| Plan | Free | Pro | Enterprise |
|------|------|-----|-----------|
| Videos/month | 3 | 30 | Unlimited |
| Duration | 5 min | 15 min | 60 min |
| Channels | 1 | 3 | Unlimited |
| Analytics | ❌ | ✅ | ✅ |

---

## ⚠️ Disclaimer

This project is for **educational and SaaS demonstration purposes**.  
YouTube automation should follow platform policies and content guidelines.

---

## 📜 Author

Mohit Bainsla

---

## 🙌 Contributing

Pull requests are welcome!  
For major changes, please open an issue first.

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
