# Judge My Code

Paste code, pick a review mode, and get a brutally honest breakdown with practical fixes.

![Judge My Code preview](https://image.thum.io/get/width/1400/noanimate/https://judge-my-code.vercel.app/)

[Live App](https://judge-my-code.vercel.app/) · [Report an Issue](../../issues)

## Highlights

- Three review personas: FAANG Interviewer, Senior Developer, Toxic Reviewer
- Smart language detection from uploaded files and syntax heuristics
- Structured scoring for quality, readability, efficiency, and maintainability
- Shareable review pages at `/r/[id]`
- Schema-validated API responses with moderation safeguards
- Gemini-powered analysis through a secure server route

## Tech Stack

- Next.js App Router
- TypeScript
- Zod validation
- Gemini API

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Create `.env.local` (optional if you want live Gemini responses).

```bash
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.0-flash
```

3. Run the development server.

```bash
npm run dev
```

4. Open `http://localhost:3000`.

If `GEMINI_API_KEY` is missing, the app can fall back to deterministic mock reviews.

## Deployment

- Production: https://judge-my-code.vercel.app/
- Platform: Vercel

## Project Structure

```text
src/
	app/
		api/review/route.ts     # review generation endpoint
		r/[id]/page.tsx         # shareable review page
		page.tsx                # main UI
	components/
		ThemeToggle.tsx
	lib/
		providers.ts            # LLM provider integration
		prompts.ts              # persona prompts
		reviewSchema.ts         # request/response schemas
		reviewStore.ts          # local persistence and runtime fallback
```

## Notes

- Gemini calls run on the server so API keys stay out of the client.
- Local development persists reviews in `data/reviews.json`.
- In serverless environments, persistence behavior depends on runtime storage constraints.
