import { NextResponse } from "next/server";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/limits";
import { generateReview } from "@/lib/providers";
import { checkRateLimit, getClientKey, type RateLimitDecision } from "@/lib/rateLimit";
import { saveReview } from "@/lib/reviewStore";
import {
  reviewCoreSchema,
  reviewRequestSchema,
  reviewResponseSchema,
} from "@/lib/reviewSchema";

const DISALLOWED = ["slur", "hate", "kill yourself"];

function buildRateLimitHeaders(decision: RateLimitDecision) {
  return {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(decision.resetAtEpochSeconds),
    "Retry-After": String(decision.retryAfterSeconds),
  };
}

function moderateText(input: string): { text: string; blocked: boolean } {
  const lowered = input.toLowerCase();
  const blocked = DISALLOWED.some((term) => lowered.includes(term));
  if (!blocked) {
    return { text: input, blocked: false };
  }
  return {
    text: "Tone softened by moderation policy. Focus on technical issues, not personal attacks.",
    blocked: true,
  };
}

export async function POST(request: Request) {
  const decision = await checkRateLimit(getClientKey(request));
  const rateLimitHeaders = buildRateLimitHeaders(decision);

  if (!decision.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large." },
      { status: 413, headers: rateLimitHeaders }
    );
  }

  try {
    const body = await request.json();
    const parsed = reviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const { code, mode, language } = parsed.data;
    const raw = await generateReview(code, mode, language);

    const moderatedHonesty = moderateText(raw.payload.brutalHonesty);
    const moderatedSuggestions = raw.payload.suggestions.map((s) =>
      moderateText(s).text
    );

    const normalized = {
      ...raw.payload,
      brutalHonesty: moderatedHonesty.text,
      suggestions: moderatedSuggestions,
      mode,
      provider: raw.provider,
      moderated: moderatedHonesty.blocked,
      createdAt: new Date().toISOString(),
    };

    const validatedCore = reviewCoreSchema.safeParse(normalized);
    if (!validatedCore.success) {
      return NextResponse.json(
        { error: "Invalid model output", details: validatedCore.error.flatten() },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    const persisted = await saveReview({
      review: validatedCore.data,
      code,
      language,
    });

    const responsePayload = {
      ...validatedCore.data,
      reviewId: persisted.id,
      sharePath: persisted.sharePath,
    };

    const validatedResponse = reviewResponseSchema.safeParse(responsePayload);
    if (!validatedResponse.success) {
      return NextResponse.json(
        { error: "Failed to persist review", details: validatedResponse.error.flatten() },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(validatedResponse.data, { headers: rateLimitHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate review";
    return NextResponse.json({ error: message }, { status: 500, headers: rateLimitHeaders });
  }
}
