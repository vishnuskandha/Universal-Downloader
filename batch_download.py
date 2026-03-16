#!/usr/bin/env python3
"""
Batch downloader for multiple URLs.
Usage: python batch_download.py URLs.txt
or pipe: echo -e "url1\nurl2" | python batch_download.py -
"""

import sys
import os
import asyncio
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from downloader import analyze_url, download_video
from telegram_sender import send_video

def pick_best_format(formats):
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
        print(msg.encode('ascii', errors='replace').decode('ascii'))

async def process_url(url: str, idx: int):
    safe_print(f"\n[{idx}] Processing: {url}")
    try:
        info = analyze_url(url)
        if not info:
            safe_print(f"[{idx}] ERROR: Could not analyze URL")
            return

        title = info.get('title', 'Video')
        safe_print(f"[{idx}] Title: {title}")
        formats = info.get('formats', [])
        selected = pick_best_format(formats)
        if not selected:
            safe_print(f"[{idx}] ERROR: No suitable format")
            return

        filepath = await download_video(url, selected['formatId'], 'downloads')
        safe_print(f"[{idx}] Downloaded: {filepath}")

        caption = f"<b>{idx}. {title}</b>\n<a href='{url}'>Source</a>"
        sent = await send_video(filepath, caption)
        if sent:
            safe_print(f"[{idx}] Sent to Telegram")
        else:
            safe_print(f"[{idx}] Telegram send failed (skipped)")

    except Exception as e:
        safe_print(f"[{idx}] ERROR: {e}")

async def main():
    parser = argparse.ArgumentParser(description='Batch download videos from a list')
    parser.add_argument('file', nargs='?', type=argparse.FileType('r'), default=sys.stdin,
                        help='File with one URL per line, or - for stdin')
    args = parser.parse_args()

    urls = []
    for line in args.file:
        line = line.strip()
        if line and not line.startswith('#'):
            urls.append(line)

    if not urls:
        safe_print("No URLs provided.")
        return

    safe_print(f"Found {len(urls)} URLs to process")
    for idx, url in enumerate(urls, start=1):
        await process_url(url, idx)

    safe_print("\nAll done.")

if __name__ == '__main__':
    asyncio.run(main())
