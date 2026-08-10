# Contributing

Thanks for taking the time to contribute to Universal Downloader.

## Getting Started

1. Fork the repository and clone your fork.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make your changes.
4. Verify your changes (see below).
5. Commit with a clear message and open a pull request against `master`.

## Development Setup

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Code Style and Checks

- Python: keep functions small, use descriptive names, and ensure every Python
  file compiles: `python -m py_compile backend/*.py *.py`.
- Frontend: run the linter before submitting: `cd frontend && npm run lint`.
- CI runs both checks plus `npm run build`; make sure your branch is green.

## What to Include in a PR

- A description of the problem and the change.
- Reference any related issue.
- For behavior changes, note the impact on existing functionality.

## Security Issues

Do not open a public issue for security problems. Report via the GitHub
Security Advisory process described in [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
