import { buildReviewPromptWithLanguage } from "@/lib/prompts";
import type {
  ReviewCore,
  ReviewMode,
} from "@/lib/reviewSchema";

export type ProviderName = "gemini";
type ProviderPayload = Omit<ReviewCore, "mode" | "provider" | "createdAt" | "moderated">;

function parseGeminiJson(raw: string): ProviderPayload | null {
  const trimmed = raw.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFences) as ProviderPayload;
  } catch {
    return null;
  }
}

async function callGeminiProvider(prompt: string, code: string, mode: ReviewMode): Promise<ProviderPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = parseGeminiJson(content);
  if (!parsed) {
    throw new Error("Gemini returned invalid JSON for review payload");
  }
  return parsed;
}

export async function generateReview(
  code: string,
  mode: ReviewMode,
  language?: string
): Promise<{ provider: ProviderName; payload: ProviderPayload }> {
  const prompt = buildReviewPromptWithLanguage(code, mode, language);

  const payload = await callGeminiProvider(prompt, code, mode);
  return { provider: "gemini", payload };
}
