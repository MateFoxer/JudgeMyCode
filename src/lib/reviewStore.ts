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
let fileStoreAvailable: boolean | null = null;
let memoryStore: StoredReview[] = [];

async function ensureStore(): Promise<boolean> {
  try {
    await mkdir(DATA_DIR, { recursive: true });

    try {
      await readFile(STORE_FILE, "utf8");
    } catch {
      await writeFile(STORE_FILE, "[]", "utf8");
    }

    fileStoreAvailable = true;
    return true;
  } catch {
    fileStoreAvailable = false;
    return false;
  }
}

async function readStore(): Promise<StoredReview[]> {
  if (fileStoreAvailable !== false) {
    const available = await ensureStore();
    if (available) {
      const raw = await readFile(STORE_FILE, "utf8");

      try {
        const parsed = JSON.parse(raw) as StoredReview[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }

  if (memoryStore.length > 0) {
    return memoryStore;
  }

  // Serverless runtimes can ship data/reviews.json as read-only. Load it if present.
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredReview[];
    memoryStore = Array.isArray(parsed) ? parsed : [];
  } catch {
    memoryStore = [];
  }

  return memoryStore;
}

async function writeStore(data: StoredReview[]): Promise<void> {
  if (fileStoreAvailable !== false) {
    const available = await ensureStore();
    if (available) {
      await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
      return;
    }
  }

  memoryStore = data;
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
