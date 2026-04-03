from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time
import asyncio
import shutil
import re
import traceback
import threading
from starlette.background import BackgroundTask

from downloader import analyze_url, download_video

app = FastAPI(title="Video Downloader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # so browser can read filename
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_downloads")

class AnalyzeRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    formatId: str
    title: str = ""

rate_limits = {}
rate_limits_lock = threading.Lock()

def check_rate_limit(request: Request):
    client = request.client
    ip = client.host if client else "unknown"
    now = time.time()
    with rate_limits_lock:
        if ip not in rate_limits:
            rate_limits[ip] = []
        rate_limits[ip] = [t for t in rate_limits[ip] if now - t < 60]
        if len(rate_limits[ip]) >= 60:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        rate_limits[ip].append(now)

def safe_filename(title: str, ext: str) -> str:
    if not title:
        return f"download.{ext}"
    # Strip non-ASCII (emoji, CJK, etc.) — HTTP headers are latin-1 only
    safe = re.sub(r'[\\/*?:"<>|]', '', title)
    safe = safe.encode('ascii', 'ignore').decode('ascii')
    safe = safe.strip().replace(' ', '_')[:80]
    if not safe:
        safe = 'download'
    return f"{safe}.{ext}"

def cleanup_job_dir(job_dir: str):
    import time as _time
    _time.sleep(1)
    try:
        shutil.rmtree(job_dir, ignore_errors=True)
    except Exception:
        pass

MIME_MAP = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mkv": "video/x-matroska",
    "mp3": "audio/mpeg",
    "m4a": "audio/mp4",
    "ogg": "audio/ogg",
}

@app.post("/api/analyze")
async def api_analyze(req: AnalyzeRequest, request: Request):
    check_rate_limit(request)
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")
    try:
        data = await asyncio.wait_for(
            asyncio.to_thread(analyze_url, req.url),
            timeout=45
        )
        if not data:
            raise HTTPException(status_code=400, detail="Could not extract metadata from this URL")
        return data
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Analysis timed out. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[api] Analyze error for {req.url[:60]}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Could not analyze the provided URL.")

@app.post("/api/download")
async def api_download(req: DownloadRequest, request: Request):
    check_rate_limit(request)
    if not req.url or not req.formatId:
        raise HTTPException(status_code=400, detail="URL and formatId are required")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        filepath = await asyncio.wait_for(
            download_video(req.url, req.formatId, TEMP_DIR),
            timeout=300
        )

        ext = os.path.splitext(filepath)[1].lstrip('.') or "bin"
        mime = MIME_MAP.get(ext, "application/octet-stream")
        friendly_name = safe_filename(req.title, ext)

        job_dir = os.path.dirname(filepath)

        return FileResponse(
            path=filepath,
            media_type=mime,
            filename=friendly_name,
            background=BackgroundTask(cleanup_job_dir, job_dir),
            headers={
                "Content-Disposition": f'attachment; filename="{friendly_name}"'
            }
        )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Download timed out (5 min limit). Try a lower quality.")
    except Exception as e:
        print(f"[api] Download error for {req.url[:60]}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Download failed. Please try again.")
