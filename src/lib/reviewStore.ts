import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { reviewCoreSchema, type ReviewCore } from "@/lib/reviewSchema";

export type StoredReview = {
  id: string;
  review: ReviewCore;
  code: string;
  language?: string;
  fileName?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "reviews.json");

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, "[]", "utf8");
  }
}

async function readStore(): Promise<StoredReview[]> {
  await ensureStore();
  const raw = await readFile(STORE_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as StoredReview[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(data: StoredReview[]): Promise<void> {
  await ensureStore();
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function saveReview(input: {
  review: ReviewCore;
  code: string;
  language?: string;
  fileName?: string;
}): Promise<{ id: string; sharePath: string }> {
  const validated = reviewCoreSchema.parse(input.review);
  const all = await readStore();

  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const entry: StoredReview = {
    id,
    review: validated,
    code: input.code,
    language: input.language,
    fileName: input.fileName,
    createdAt: new Date().toISOString(),
  };

  all.unshift(entry);
  if (all.length > 500) {
    all.length = 500;
  }

  await writeStore(all);
  return { id, sharePath: `/r/${id}` };
}

export async function getReviewById(id: string): Promise<StoredReview | null> {
  const all = await readStore();
  const found = all.find((item) => item.id === id);
  return found ?? null;
}
