import yt_dlp
import os
import uuid
import asyncio
import shutil
import threading
import time
import traceback

# ─── FFmpeg Detection ─────────────────────────────────────────────────

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_FFMPEG_BUNDLED = os.path.join(_BACKEND_DIR, 'ffmpeg-master-latest-win64-gpl', 'bin')
_FFMPEG_EXE = os.path.join(_FFMPEG_BUNDLED, 'ffmpeg.exe')

if os.path.isfile(_FFMPEG_EXE):
    FFMPEG_LOCATION = _FFMPEG_BUNDLED
    print(f"[downloader] Using bundled FFmpeg: {FFMPEG_LOCATION}")
elif shutil.which('ffmpeg'):
    FFMPEG_LOCATION = os.path.dirname(shutil.which('ffmpeg'))
    print(f"[downloader] Using system FFmpeg: {FFMPEG_LOCATION}")
else:
    FFMPEG_LOCATION = None
    print("[downloader] WARNING: FFmpeg not found! Audio merging will not work.")

HAS_FFMPEG = FFMPEG_LOCATION is not None

# Only 2 concurrent yt-dlp+FFmpeg processes at a time (Windows file lock prevention).
# threading.Semaphore because _run() executes inside asyncio.to_thread().
_DL_SEM = threading.Semaphore(2)


def _base_opts() -> dict:
    """Return a fresh copy of base yt-dlp options (never mutate the global)."""
    opts = {
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'extract_flat': False,
        'noplaylist': True,
        'socket_timeout': 30,
        'retries': 3,           # yt-dlp internal HTTP retries
        'fragment_retries': 5,  # retry individual DASH/HLS fragments
        'extractor_args': {
            'youtube': {
                # Force yt-dlp to impersonate iOS/Android mobile clients.
                # The normal Web client is actively blocked on datacenter IPs (like Render)
                # returning "Sign in to confirm you're not a bot". Mobile clients bypass this.
                'player_client': ['ios', 'android']
            }
        }
    }
    if FFMPEG_LOCATION:
        opts['ffmpeg_location'] = FFMPEG_LOCATION
    return opts


# ─── Platform Detection ───────────────────────────────────────────────

def detect_platform(url: str) -> dict:
    url_lower = url.lower()
    if any(d in url_lower for d in ['youtube.com', 'youtu.be']):
        return {"platform": "youtube", "type": "short" if '/shorts/' in url_lower else "video"}
    elif 'facebook.com' in url_lower or 'fb.watch' in url_lower or 'fb.com' in url_lower:
        return {"platform": "facebook", "type": "reel" if '/reel' in url_lower else "video"}
    elif 'instagram.com' in url_lower:
        return {"platform": "instagram", "type": "reel" if '/reel' in url_lower else "post"}
    else:
        return {"platform": "other", "type": "video"}


# ─── Format Building ──────────────────────────────────────────────────

def _best_stream_size(info: dict, kind: str = 'video') -> int:
    best = 0
    for f in info.get('formats', []):
        fs = f.get('filesize') or f.get('filesize_approx') or 0
        if kind == 'video' and f.get('vcodec', 'none') != 'none':
            best = max(best, fs)
        elif kind == 'audio' and f.get('acodec', 'none') != 'none':
            best = max(best, fs)
    return best

def _build_formats(info: dict, label_suffix: str, is_short: bool = False):
    video_size = _best_stream_size(info, 'video')
    audio_size = _best_stream_size(info, 'audio')
    best_total = video_size + audio_size if video_size else audio_size

    heights = info.get('formats', [])
    available_heights = sorted(set(
        f.get('height') for f in heights
        if f.get('height') and f.get('vcodec', 'none') != 'none'
    ), reverse=True)

    best_fps = max(
        (f.get('fps') or 0 for f in heights if f.get('vcodec', 'none') != 'none'),
        default=30
    )

    formats = []
    # Prefer H.264 (avc1) for maximum compatibility (WhatsApp, iPhone, all players).
    # Falls back to any codec if H.264 isn't available at that resolution.
    formats.append({
        "formatId": "bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[vcodec^=avc1]+bestaudio/bestvideo+bestaudio/best",
        "ext": "mp4",
        "resolution": f"{available_heights[0]}p" if available_heights else "best",
        "fps": best_fps,
        "filesize": best_total if best_total > 0 else None,
        "hasVideo": True,
        "hasAudio": True,
        "label": f"Best Quality {label_suffix} + Audio (Compatible)",
    })

    for h in available_heights:
        est = 0
        for f in info.get('formats', []):
            if f.get('height') == h and f.get('vcodec', 'none') != 'none':
                est = max(est, f.get('filesize') or f.get('filesize_approx') or 0)
        est += audio_size

        fps_for_h = max(
            (f.get('fps') or 0 for f in heights
             if f.get('height') == h and f.get('vcodec', 'none') != 'none'),
            default=30
        )

        formats.append({
            "formatId": f"bestvideo[vcodec^=avc1][height<={h}]+bestaudio[acodec^=mp4a]/bestvideo[vcodec^=avc1][height<={h}]+bestaudio/bestvideo[height<={h}]+bestaudio/best[height<={h}]",
            "ext": "mp4",
            "resolution": f"{h}p",
            "fps": fps_for_h,
            "filesize": est if est > 0 else None,
            "hasVideo": True,
            "hasAudio": True,
            "label": f"{h}p {label_suffix} + Audio",
        })

    formats.append({
        "formatId": "bestaudio/best",
        "ext": "mp3",
        "resolution": "audio only",
        "fps": None,
        "filesize": audio_size if audio_size > 0 else None,
        "hasVideo": False,
        "hasAudio": True,
        "label": "Audio Only (MP3 320kbps)",
    })

    return formats


# ─── Analyze ──────────────────────────────────────────────────────────

def analyze_url(url: str):
    platform_info = detect_platform(url)
    platform = platform_info["platform"]
    content_type = platform_info["type"]

    label_map = {
        "youtube": "Short" if content_type == "short" else "Video",
        "facebook": "Reel" if content_type == "reel" else "Video",
        "instagram": "Reel" if content_type == "reel" else "Post",
        "other": "Video",
    }
    is_short = platform == "youtube" and content_type == "short"

    with yt_dlp.YoutubeDL(_base_opts()) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            if not info:
                return None
            formats = _build_formats(info, label_map[platform], is_short=is_short)
            return {
                "platform": platform,
                "contentType": content_type,
                "title": info.get('title'),
                "thumbnailUrl": info.get('thumbnail'),
                "durationSeconds": info.get('duration'),
                "formats": formats,
            }
        except Exception as e:
            raise Exception(f"Failed to analyze URL: {e}")


# ─── Download ─────────────────────────────────────────────────────────

MAX_RETRIES = 3
RETRY_DELAY = 3   # seconds between retries

async def download_video(url: str, format_id: str, output_dir: str):
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(output_dir, job_id)
    os.makedirs(job_dir, exist_ok=True)

    output_template = os.path.join(job_dir, f"{job_id}.%(ext)s")

    is_audio_only = (
        'bestaudio' in format_id and 'bestvideo' not in format_id
    )

    opts = _base_opts()

    if is_audio_only:
        opts.update({
            'format': 'bestaudio/best',
            'outtmpl': output_template,
        })
        if HAS_FFMPEG:
            opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }]
    else:
        opts.update({
            'format': format_id,
            'outtmpl': output_template,
        })
        if HAS_FFMPEG:
            opts['merge_output_format'] = 'mp4'
            # Force audio to AAC for universal player support.
            # Key 'merger' targets the FFmpegMergerPP specifically.
            opts['postprocessor_args'] = {
                'merger': ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k']
            }

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            def _run():
                with _DL_SEM:
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        ydl.download([url])

            await asyncio.to_thread(_run)

            # Find the produced file
            for fname in os.listdir(job_dir):
                full = os.path.join(job_dir, fname)
                if os.path.isfile(full) and not fname.endswith(('.part', '.ytdl', '.temp')):
                    return full

            raise FileNotFoundError("Downloaded file not found in job directory")

        except Exception as e:
            last_err = e
            print(f"[downloader] Attempt {attempt}/{MAX_RETRIES} failed for {url[:60]}: {e}")
            if attempt < MAX_RETRIES:
                # Clean up partial files before retry
                for fname in os.listdir(job_dir):
                    try:
                        os.remove(os.path.join(job_dir, fname))
                    except Exception:
                        pass
                await asyncio.sleep(RETRY_DELAY * attempt)  # progressive backoff

    raise Exception(f"Download failed after {MAX_RETRIES} attempts: {last_err}")
