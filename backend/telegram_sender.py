"""
Telegram video sender module.
Usage: from telegram_sender import send_video; await send_video(filepath)
"""

import os
from telegram import Bot
from telegram.constants import ParseMode
from telegram.error import TelegramError
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")  # can be user ID or group/channel ID

if not BOT_TOKEN or not CHAT_ID:
    print("[telegram] WARNING: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Sending disabled.")

bot = Bot(token=BOT_TOKEN) if BOT_TOKEN else None

async def send_video(filepath: str, caption: str = ""):
    if not bot or not CHAT_ID:
        print("[telegram] Skippingsend: bot not configured")
        return False
    try:
        with open(filepath, 'rb') as f:
            await bot.send_video(
                chat_id=CHAT_ID,
                video=f,
                caption=caption,
                parse_mode=ParseMode.HTML,
                disable_notification=True
            )
        print(f"[telegram] Video sent to chat {CHAT_ID}")
        return True
    except TelegramError as e:
        print(f"[telegram] ERROR: {e}")
        return False
