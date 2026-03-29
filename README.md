# Judge My Code

Initial MVP implementation for a web app that reviews code in three modes:
- FAANG interviewer
- Senior dev
- Toxic reviewer

Current implementation includes:
- Next.js App Router + TypeScript setup
- Code input + mode selector UI
- File upload support for common source extensions
- Automatic language detection from file extension and syntax heuristics
- `/api/review` endpoint with schema validation
- Gemini provider integration with mock fallback (`gemini`, `mock`)
- Local JSON persistence for generated reviews (`data/reviews.json`)
- Shareable permalink pages at `/r/[id]`
- Baseline moderation pass for disallowed terms

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Optional: set environment variables in `.env.local`:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

3. Start development server:

```bash
npm run dev
```

If `GEMINI_API_KEY` is not set, the app falls back to deterministic mock reviews.

## Notes

- Gemini is called from the server route to keep API keys out of the browser.
- Persistence and permalink pages are implemented; screenshot export is still pending.
