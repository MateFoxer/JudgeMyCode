import { z } from "zod";

export const reviewModeSchema = z.enum(["faang", "senior", "toxic"]);

export type ReviewMode = z.infer<typeof reviewModeSchema>;

export const reviewRequestSchema = z.object({
  code: z.string().min(1).max(20000),
  mode: reviewModeSchema,
  language: z.string().min(1).max(40).optional(),
});

const scoreCommentSchema = z.object({
  score: z.number().int().min(1).max(10),
  comment: z.string().min(1),
});

export const providerPayloadSchema = z.object({
  rating: z.number().int().min(1).max(10),
  headline: z.string().min(3).max(80),
  brutalHonesty: z.string().min(10).max(500),
  suggestions: z.array(z.string().min(3)).min(3).max(6),
  categories: z.object({
    codeQuality: scoreCommentSchema,
    readability: scoreCommentSchema,
    efficiency: scoreCommentSchema,
    maintainability: scoreCommentSchema,
  }),
});

export const reviewCoreSchema = z.object({
  ...providerPayloadSchema.shape,
  mode: reviewModeSchema,
  provider: z.enum(["gemini"]),
  moderated: z.boolean().default(false),
  createdAt: z.string(),
});

export const reviewResponseSchema = reviewCoreSchema.extend({
  reviewId: z.string().min(6).max(64),
  sharePath: z.string().min(4),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewCore = z.infer<typeof reviewCoreSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
