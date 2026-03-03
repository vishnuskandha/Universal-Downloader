# 🟢 Universal Downloader

A modern, premium video and audio downloader with a hacker-aesthetic UI. Download media from **YouTube** and **Facebook** — including videos, shorts, reels, and audio — all from one place.

**Built by [Vishnu Skandha](https://vishnuskandhagithubio.vercel.app/)**

---

## ✨ Features

### 🎬 Multi-Platform Support
| Platform     | Content Types     | Capabilities                       |
|--------------|-------------------|-------------------------------------|
| **YouTube**  | Videos, Shorts    | Up to 4K, audio extraction (MP3)   |
| **Facebook** | Videos, Reels     | Best available quality + audio     |

### 🖥 Frontend
- **FaultyTerminal** — WebGL-powered matrix background with mouse reactivity
- **Glassmorphism UI** — Frosted glass cards, inputs, and buttons with fluid rounded corners
- **Framer Motion** — Smooth page animations, staggered reveals, and micro-interactions
- **SpotlightCard** — Cursor-following glow effect on cards
- **ProfileCard** — Interactive 3D tilt card with glow effects (bottom-right corner)
- **Mode Toggle** — Switch between **Single** and **Batch** download modes
- **Batch Mode** — Paste multiple URLs, download all with concurrency pool (3 workers) and auto-retry
- **Clipboard Paste** — One-click paste button in URL input
- **Platform Badges** — Color-coded dots (YouTube red, Facebook blue, Instagram pink)
- **Fluid Progress Bar** — Animated glowing progress bar during downloads
- **Auto-dismiss** — Success banner disappears after 4 seconds
- **Responsive** — Works on desktop, tablet, and **mobile** (access via local network)
- **Green unified theme** — All UI colors matched to the terminal background tint

### ⚙ Backend
- **Platform Detection** — Automatic URL routing to YouTube/Facebook-specific logic
- **Smart Format Selection** — Uses yt-dlp format strings (`bestvideo+bestaudio/best`) for maximum quality
- **FFmpeg Integration** — Bundled FFmpeg binary for video+audio merging and MP3 extraction
- **AAC Audio Re-encoding** — Ensures all downloaded videos have universally compatible audio (not Opus)
- **Playlist Protection** — Automatically extracts single video from playlist URLs (`noplaylist: true`)
- **File Size Estimation** — Approximate file sizes shown before download
- **Retry with Backoff** — 3 automatic retry attempts with progressive delay on download failures
- **Concurrency Control** — Threading semaphore limits concurrent FFmpeg processes (prevents Windows file locks)
- **Unicode-safe Filenames** — Strips emoji/non-ASCII from HTTP headers to prevent encoding crashes
- **Rate Limiting** — 60 requests/minute per IP
- **Timeout Protection** — 45s analyze timeout, 5min download timeout
- **Auto Cleanup** — Temp files deleted after download completion

---

## 🛠 Tech Stack

| Layer        | Technology                                                   |
|--------------|--------------------------------------------------------------|
| **Frontend** | React 18, Vite, Tailwind CSS v4, Framer Motion, ogl (WebGL) |
| **Backend**  | Python, FastAPI, yt-dlp, FFmpeg                              |
| **Styling**  | Glassmorphism CSS, Bricolage Grotesque, custom animations    |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **FFmpeg** (bundled in `backend/ffmpeg-master-latest-win64-gpl/bin/`)

### One-Click Start (Windows)

```bash
# Double-click or run:
start_dev.bat
```

This launches both the backend (FastAPI on port 8000) and frontend (Vite on port 5173) simultaneously.

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

### 📱 Access from Phone

The frontend is configured with `host: true` so it's accessible from any device on the same network:

1. Start both backend and frontend
2. Find your PC's IP (`ipconfig` on Windows)
3. Open `http://<YOUR-IP>:5173` on your phone
4. Set `VITE_API_URL=http://<YOUR-IP>:8000` in `frontend/.env` for the API

---

## 📁 Project Structure

```
video-downloader/
├── start_dev.bat              # One-click startup script (Windows)
├── docker-compose.yml         # Docker configuration
├── README.md
│
├── backend/
│   ├── main.py                # FastAPI app, endpoints, rate limiting, filename sanitization
│   ├── downloader.py          # yt-dlp wrapper: analyze, download, retry, FFmpeg control
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile
│   └── ffmpeg-.../bin/        # Bundled FFmpeg binary
│
└── frontend/
    ├── index.html             # Entry HTML with Google Fonts
    ├── vite.config.js         # Vite config (host: true for network access)
    ├── postcss.config.js      # Tailwind CSS v4 PostCSS config
    ├── package.json
    │
    └── src/
        ├── main.jsx           # React entry point
        ├── App.jsx            # Main application component
        ├── api.js             # API client (analyze + download + blob error parsing)
        ├── index.css          # Tailwind v4 theme + glassmorphism + custom scrollbars
        │
        └── components/
            ├── FaultyTerminal.jsx  # WebGL matrix background (ogl)
            ├── FaultyTerminal.css  # Terminal styles
            ├── SpotlightCard.jsx   # Cursor-glow glassmorphism card
            ├── BatchMode.jsx       # Multi-URL batch download with concurrency pool
            ├── ProfileCard.jsx     # Interactive 3D tilt card component
            └── ProfileCard.css     # ProfileCard styles + animations
```

---

## 🔌 API Endpoints

### `POST /api/analyze`
Analyze a URL and return available formats.

**Request:**
```json
{ "url": "https://youtube.com/watch?v=..." }
```

**Response:**
```json
{
  "platform": "youtube",
  "contentType": "video",
  "title": "Video Title",
  "thumbnailUrl": "https://...",
  "durationSeconds": 180,
  "formats": [
    {
      "formatId": "bestvideo+bestaudio/best",
      "ext": "mp4",
      "resolution": "1080p",
      "fps": 60,
      "filesize": 52428800,
      "hasVideo": true,
      "hasAudio": true,
      "label": "Best Quality Video + Audio"
    }
  ]
}
```

### `POST /api/download`
Download media in the selected format.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=...",
  "formatId": "bestvideo+bestaudio/best",
  "title": "Video Title"
}
```

**Response:** Binary file download (MP4/MP3) with `Content-Disposition` header.

---

## 🎨 Design System

### Color Palette (Green Terminal Theme)
| Token       | Hex       | Usage                                      |
|-------------|-----------|---------------------------------------------|
| `brand-50`  | `#f0fdf4` | Lightest accent                             |
| `brand-100` | `#dcfce7` | Light accent                                |
| `brand-300` | `#86efac` | Selection highlight                         |
| `brand-400` | `#A7EF9E` | Primary accent (matches terminal tint)      |
| `brand-500` | `#4ade80` | Buttons, active states                      |
| `brand-600` | `#22c55e` | Hover states                                |
| `dark-900`  | `#0f172a` | Deep background                             |
| `dark-800`  | `#1e293b` | Card backgrounds                            |

### Glassmorphism Classes
| Class              | Properties                                   |
|--------------------|----------------------------------------------|
| `.glass-card`      | `blur(24px)`, `border-radius: 28px`          |
| `.glass-input`     | `blur(12px)`, `border-radius: 18px`          |
| `.glass-btn`       | `blur(8px)`, `border-radius: 18px`           |
| `.glass-format-item` | `border-radius: 16px`, green glow on select |
| `.custom-scrollbar`| 4px green-tinted scrollbar                   |

---

## 📋 Dependencies

### Backend (`requirements.txt`)
- `fastapi` — Web framework
- `uvicorn` — ASGI server
- `yt-dlp` — Video extraction engine
- `python-multipart` — Form data handling

### Frontend (`package.json`)
- `react` / `react-dom` — UI framework
- `framer-motion` — Animations
- `lucide-react` — Icons
- `axios` — HTTP client
- `ogl` — WebGL (FaultyTerminal background)
- `clsx` / `tailwind-merge` — Class utilities
- `@tailwindcss/postcss` — Tailwind CSS v4

---

## 📄 License

This project is for personal/educational use. Respect the Terms of Service of all platforms when downloading content.

---

<p align="center">
  <b>Built with 💚 by <a href="https://vishnuskandhagithubio.vercel.app/">Vishnu Skandha</a></b>
</p>
