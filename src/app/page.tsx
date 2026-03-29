"use client";

import { useMemo, useState } from "react";
import { detectLanguage } from "@/lib/language";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReviewMode, ReviewResponse } from "@/lib/reviewSchema";

const MODES: Array<{ value: ReviewMode; label: string }> = [
  { value: "faang", label: "FAANG Interviewer" },
  { value: "senior", label: "Senior Dev" },
  { value: "toxic", label: "Toxic Reviewer" },
];

const SAMPLE = `function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) return [i, j];\n    }\n  }\n  return [];\n}`;

function categoryRows(review: ReviewResponse | null) {
  if (!review) {
    return [];
  }

  return [
    ["Code Quality", review.categories.codeQuality],
    ["Readability", review.categories.readability],
    ["Efficiency", review.categories.efficiency],
    ["Maintainability", review.categories.maintainability],
  ] as const;
}

export default function Home() {
  const [code, setCode] = useState(SAMPLE);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>("faang");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  async function copyShareLink(path: string) {
    const absolute = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(absolute);
  }


  const categories = useMemo(() => categoryRows(review), [review]);
  const language = useMemo(() => detectLanguage(fileName, code), [fileName, code]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 250_000) {
      setError("File too large. Please upload a source file under 250KB.");
      return;
    }

    const text = await file.text();
    setCode(text);
    setFileName(file.name);
    setError(null);
    setReview(null);
  }

  function onCodeChange(nextCode: string) {
    setCode(nextCode);
    if (!fileName) {
      return;
    }
    setFileName(null);
  }

  async function runReview() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode, language }),
      });

      const data = (await res.json()) as ReviewResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Review failed");
      }

      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-top">
          <h1>Judge My Code</h1>
          <ThemeToggle />
        </div>
        <p>
          Paste code, choose a mode, and get a brutally honest score with
          practical fixes.
        </p>
      </section>

      <section className="card">
        <textarea
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Paste your code here"
        />

        <div className="controls">
          <label className="mode">
            Upload File
            <input
              type="file"
              accept=".ts,.tsx,.js,.jsx,.py,.java,.cs,.go,.rs,.rb,.php,.swift,.kt,.sql,.html,.css,.scss,.json,.yml,.yaml,.sh,.md,.c,.cpp,.cc,.cxx"
              onChange={handleFileUpload}
            />
          </label>

          <label className="mode">
            Review Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ReviewMode)}
            >
              {MODES.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button onClick={runReview} disabled={loading || code.trim().length === 0}>
            {loading ? "Reviewing..." : "Judge It"}
          </button>
        </div>

        <p className="small">
          {fileName ? `Loaded file: ${fileName}` : "Using pasted text"} | Detected language: {language}
        </p>
      </section>

      {error && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <p className="warn"><strong>Error:</strong> {error}</p>
        </section>
      )}

      {review && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <p className="rating">{review.rating}/10</p>
          <h2>{review.headline}</h2>
          <p>{review.brutalHonesty}</p>

          <h3>Score Breakdown</h3>
          <div className="grid">
            {categories.map(([name, value]) => (
              <article key={name} className="card" style={{ padding: "0.7rem" }}>
                <strong>{name}</strong>
                <p className="small">{value.score}/10</p>
                <p className="small">{value.comment}</p>
              </article>
            ))}
          </div>

          {review.moderated && (
            <p className="ok small">Moderation adjusted tone before displaying this review.</p>
          )}

          <div className="controls" style={{ marginTop: "1rem" }}>
            <a className="pill" href={review.sharePath} target="_blank" rel="noreferrer">
              Open Permalink
            </a>
            <button type="button" onClick={() => copyShareLink(review.sharePath)}>
              Copy Share Link
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
