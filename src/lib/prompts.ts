import type { ReviewMode } from "@/lib/reviewSchema";

const modeDescriptors: Record<ReviewMode, string> = {
  faang: "Act like a FAANG interviewer. Prioritize signal, algorithmic clarity, and tradeoffs.",
  senior: "Act like a senior engineer doing production code review. Focus on maintainability and practical fixes.",
  toxic: "Act like a roast-style reviewer with harsh tone and mild profanity allowed. Never include slurs, hate speech, or personal attacks.",
};

export function buildReviewPrompt(code: string, mode: ReviewMode): string {
  const header = modeDescriptors[mode];
  
  return `${header}

Review the following code. Return valid JSON only with keys:
rating, headline, brutalHonesty, suggestions, categories.

Rules:
- rating: integer 1-10.
- suggestions: 3-6 actionable bullets.
- categories must include codeQuality/readability/efficiency/maintainability; each has score (1-10) and comment.
- no markdown, no prose outside JSON.

Code:\n\n${code}`;
}

export function buildReviewPromptWithLanguage(
  code: string,
  mode: ReviewMode,
  language?: string
): string {
  const header = modeDescriptors[mode];
  const languageLine = language ? `Detected language: ${language}. Tailor the review to this language's conventions.` : "Detected language: unknown. Infer likely language from syntax.";

  return `${header}

Review the following code. Return valid JSON only with keys:
rating, headline, brutalHonesty, suggestions, categories.

Rules:
- rating: integer 1-10.
- suggestions: 3-6 actionable bullets.
- categories must include codeQuality/readability/efficiency/maintainability; each has score (1-10) and comment.
- no markdown, no prose outside JSON.
- ${languageLine}

Code:\n\n${code}`;
}
