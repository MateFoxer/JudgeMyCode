import { NextResponse } from "next/server";
import { generateReview } from "@/lib/providers";
import { saveReview } from "@/lib/reviewStore";
import {
  reviewCoreSchema,
  reviewRequestSchema,
  reviewResponseSchema,
} from "@/lib/reviewSchema";

const DISALLOWED = ["slur", "hate", "kill yourself"];

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
  try {
    const body = await request.json();
    const parsed = reviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
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
        { status: 502 }
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
        { status: 500 }
      );
    }

    return NextResponse.json(validatedResponse.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
