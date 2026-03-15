#!/usr/bin/env python3
"""
CLI for Universal Downloader backend functions.
Usage: python cli_download.py <youtube_url>
Example: python cli_download.py https://youtube.com/shorts/QKJK1VWTzmw?si=O8i38Pr3-fU9LPmh
"""

import sys
import os
import asyncio
import argparse

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from downloader import analyze_url, download_video
from telegram_sender import send_video

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'downloads')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def pick_best_format(formats):
    """Pick the best combined video+audio format (prefer H.264/AAC in MP4)."""
    for f in formats:
        if f.get('hasVideo') and f.get('hasAudio') and f.get('ext') == 'mp4':
            return f
    for f in formats:
        if f.get('hasVideo') and f.get('hasAudio'):
            return f
    return formats[0] if formats else None

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        # Replace non-ASCII with ? to fit Windows console encoding
        print(msg.encode('ascii', errors='replace').decode('ascii'))

async def main():
    parser = argparse.ArgumentParser(description='Download a YouTube/Facebook/Instagram video via CLI')
    parser.add_argument('url', help='Video URL to download')
    args = parser.parse_args()

    safe_print(f"[cli] Analyzing URL: {args.url}")
    try:
        info = analyze_url(args.url)
        if not info:
            safe_print("[cli] ERROR: Could not extract metadata from this URL")
            sys.exit(1)

        safe_print(f"[cli] Title: {info.get('title')}")
        safe_print(f"[cli] Platform: {info.get('platform')}, Type: {info.get('contentType')}")
        safe_print(f"[cli] Duration: {info.get('durationSeconds')} seconds")
        safe_print(f"[cli] Thumbnail: {info.get('thumbnailUrl')}")
        safe_print("[cli] Available formats:")

        formats = info.get('formats', [])
        for i, f in enumerate(formats):
            size_mb = (f.get('filesize') or 0) / (1024*1024) if f.get('filesize') else '?'
            safe_print(f"  {i+1}. {f.get('label')} ({f.get('ext')}, {f.get('resolution')}, {f.get('fps')}fps) ~{size_mb:.1f}MB")

        selected = pick_best_format(formats)
        if not selected:
            safe_print("[cli] ERROR: No suitable format found")
            sys.exit(1)

        safe_print(f"[cli] Selected format: {selected.get('label')} (formatId: {selected.get('formatId')})")
        safe_print(f"[cli] Downloading to: {OUTPUT_DIR}")

        filepath = await download_video(args.url, selected['formatId'], OUTPUT_DIR)
        safe_print(f"[cli] Download complete: {filepath}")
        safe_print(f"[cli] File size: {os.path.getsize(filepath) / (1024*1024):.1f} MB")

        # Send to Telegram
        safe_print("[cli] Sending to Telegram...")
        title = info.get('title', 'Video')
        caption = f"<b>Downloaded:</b> {title}\n<a href='{args.url}'>Source</a>"
        sent = await send_video(filepath, caption)
        if sent:
            safe_print("[cli] Sent to Telegram successfully")
        else:
            safe_print("[cli] Telegram send skipped or failed (check bot config)")

    except Exception as e:
        safe_print(f"[cli] ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())