## VRoid AI Companion

<img src="https://images.ctfassets.net/bg7jm93753li/bNkR1CJkBUIdoy3on3GEB/ae1c179c95bfba5dd8fdefcc26ebc5ac/3_________.png">

### Overview

A Next.js + Three.js app that renders a VRM avatar, chats with a Gemini-based backend, and performs audio-driven lip sync with blendshapes and Mixamo-retargeted animations.

### Tech stack
- **Frontend**: Next.js (App Router), React 19, Tailwind CSS 4, @react-three/fiber, @react-three/drei, @pixiv/three-vrm, @react-three/postprocessing, Zustand, Leva
- **Backend**: FastAPI, Google GenAI (Gemini) for text + TTS, Supabase for conversation history, static serving for generated audio

### Project structure
```text
.
├─ app/
│  ├─ page.tsx                 # Landing linking to /chat
│  ├─ chat/page.tsx            # Main demo: chat + 3D avatar with lip sync
│  └─ test-page/page.tsx       # Alternative demo variant
├─ components/
│  ├─ Avatar.jsx               # Loads VRM, plays Mixamo-retargeted clips, lip-syncs
│  ├─ Experience.jsx           # Scene, camera, environment, postprocessing
│  └─ ChatPanel.tsx            # Chat UI, Markdown rendering
├─ hooks/
│  ├─ useAdvanceLipSync.ts     # FFT-based viseme estimation → VRM expressions
│  ├─ useLipSync.ts            # Simpler experimental lip-sync (not primary)
│  └─ useVideoRecognition.ts   # Zustand store (reserved)
├─ utils/
│  ├─ remapMixamoAnimationToVrm.js   # Retarget Mixamo to VRM humanoid bones
│  └─ mixamoVRMRigMap.js             # Mixamo→VRM bone map
├─ constants/
│  └─ index.ts                 # BACKEND_URL, LOCAL_URL, avatars, Google voice list
├─ interfaces/                 # TS models for messages, conversations, visemes
├─ public/
│  └─ models/
│     ├─ *.vrm                 # VRM avatars: Fox Loli, Girl Next Door, Elf, ...
│     └─ animations/*.fbx      # Mixamo clips: Idle, Thinking, Swing, Thriller...
├─ backend/
│  ├─ main.py                  # FastAPI app: /chat, /conversations, /static
│  ├─ requirements.txt         # fastapi, supabase, python-dotenv, google-genai, gTTS
│  └─ static/audio/            # Generated TTS audio (.wav)
└─ next.config.ts, tsconfig.json, eslint.config.mjs, package.json
```

### What it does
- Renders a VRM avatar with environment lighting, bloom, and camera controls via Leva.
- Retargets Mixamo FBX animations to VRM bones (idle, thinking, dancing, etc.).
- Chats via a FastAPI backend that:
  - Reads conversation history from Supabase (`conversations` table)
  - Uses Gemini to generate the reply text
  - Uses Gemini TTS to synthesize audio, saves to `backend/static/audio`, serves at `/static/audio/...`
- The frontend receives `{ reply_text, audio_url }`, updates chat, and triggers lip sync from the audio file URL.

### Key modules
- `components/Avatar.jsx`: Loads VRM via `useGLTF`, optimizes meshes, plays animations, applies lip sync using `useAdvanceLipSync` when `audioUrl` is set. Some avatars are flipped on Y using `AVATAR_LIST_FLIP`.
- `hooks/useAdvanceLipSync.ts`: Web Audio API `AnalyserNode` (FFT 1024) computes energy in frequency bands and maps to VRM expressions `Aa`, `Ee`, `Oh` each frame.
- `utils/remapMixamoAnimationToVrm.js`: Converts Mixamo animation tracks to VRM humanoid nodes, adjusting rotations/positions and hips height.
- `app/chat/page.tsx`:
  - Loads recent history from `GET BACKEND_URL/conversations?limit=10`
  - On send, calls `POST BACKEND_URL/chat` with `{ message, voice_name }`
  - Appends AI reply and sets `audioUrl` for the avatar to lip sync
  - Leva controls: choose avatar from `AVATAR_LIST` and voice from `GOOGLE_VOICE_LIST`

### Environment and configuration
- `constants/index.ts`:
  - `BACKEND_URL`: default `http://localhost:8000`
  - `LOCAL_URL`: default `http://localhost:3000`
  - `AVATAR_LIST`: list of VRM names in `public/models`
  - `GOOGLE_VOICE_LIST`: prebuilt Gemini TTS voice names (e.g., Zephyr, Puck, ...)

- Backend `.env` required:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `GOOGLE_AI_API_KEY`

- Supabase table (suggested schema `conversations`):
  - `id` bigint/autoincrement (pk)
  - `created_at` timestamptz default now()
  - `user_id` text nullable
  - `role` text not null (`user` | `model`)
  - `content` text not null

### Install and run
- Frontend (Node 18+ recommended):
```bash
pnpm install   # or npm install
pnpm dev       # or npm run dev
# App at `http://localhost:3000`, go to `/chat`
```

- Backend (Python 3.10+ recommended):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# set env: SUPABASE_URL, SUPABASE_KEY, GOOGLE_AI_API_KEY
uvicorn main:app --reload --port 8000
# Backend at `http://localhost:8000`
```

### Notes
- Generated audio files are written to `backend/static/audio` and served under `http://localhost:8000/static/audio/<filename>.wav`.
- VRM and FBX assets are bundled under `public/models`. You can add your own `.vrm` and `.fbx` files there and update `AVATAR_LIST` if needed.
- Tailwind CSS classes are used throughout; global styles are in `app/globals.css`.

### NPM scripts
- `dev`: `next dev --turbopack`
- `build`: `next build`
- `start`: `next start`
- `lint`: `next lint`
