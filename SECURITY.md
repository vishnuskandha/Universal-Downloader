# Security Policy

## Reporting a Vulnerability

Please report security issues privately. Do not open a public issue for
security problems.

Open a GitHub Security Advisory at:

https://github.com/vishnuskandha/Universal-Downloader/security/advisories/new

Reports are acknowledged within 5 business days.

## Supported Versions

| Version  | Supported |
| -------- | --------- |
| master   | Yes       |

## Security Notes

- **Secrets**: The Telegram bot token and chat ID must be provided through the
  `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables (or a
  git-ignored `backend/.env`). Never commit these values.
- **SSRF protection**: The API only accepts `http`/`https` URLs and rejects
  hosts that resolve to private, loopback, link-local, or reserved address
  space, including cloud metadata endpoints.
- **TLS verification**: Enabled by default. If your network requires the legacy
  certificate-verification bypass, set `YTDLP_NO_CHECK_CERTIFICATE=1`.
- **Rate limiting**: Requests are limited to 60 per minute per IP. The
  in-memory limiter is per-process; when scaling to multiple instances, replace
  it with a shared store (for example Redis).
- **CORS**: The API currently allows all origins. This is acceptable for a
  public tool but will be abused as a bandwidth relay; restrict origins to
  trusted frontends if you self-host for private use.
- **Content**: Only download media you have the right to download, and respect
  the Terms of Service of the source platform.

## Responsible Disclosure

- Verify the issue against the latest `master`.
- Include the affected endpoints/files and a minimal reproduction.
- Allow time for a fix before public disclosure.
