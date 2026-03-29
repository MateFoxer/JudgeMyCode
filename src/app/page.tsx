"use client";

import { useMemo, useRef, useState } from "react";
import { detectLanguage } from "@/lib/language";
import { CODE_MAX_CHARS } from "@/lib/limits";
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
  const audioRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioRef.current) {
      const Ctx = (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctx) {
        return null;
      }
      audioRef.current = new Ctx();
    }

    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume();
    }

    return audioRef.current;
  }

  function playTone(
    frequency: number,
    durationMs: number,
    volume: number,
    type: OscillatorType,
    delayMs = 0
  ) {
    const audio = getAudioContext();
    if (!audio) {
      return;
    }

    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = audio.currentTime + delayMs / 1000;
    const endAt = startAt + durationMs / 1000;

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.01);
  }

  function playUiSound(kind: "tap" | "upload" | "success" | "error" | "copy") {
    switch (kind) {
      case "tap":
        playTone(320, 40, 0.012, "triangle");
        break;
      case "upload":
        playTone(360, 45, 0.011, "triangle");
        playTone(420, 60, 0.01, "sine", 36);
        break;
      case "success":
        playTone(440, 50, 0.013, "sine");
        playTone(560, 85, 0.011, "triangle", 46);
        break;
      case "error":
        playTone(260, 65, 0.011, "sawtooth");
        break;
      case "copy":
        playTone(520, 35, 0.011, "triangle");
        playTone(660, 50, 0.009, "sine", 30);
        break;
      default:
        break;
    }
  }

  async function copyShareLink(path: string) {
    try {
      const absolute = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(absolute);
      playUiSound("copy");
    } catch {
      playUiSound("error");
    }
  }


  const categories = useMemo(() => categoryRows(review), [review]);
  const language = useMemo(() => detectLanguage(fileName, code), [fileName, code]);
  const charCount = code.length;

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 250_000) {
      setError("File too large. Please upload a source file under 250KB.");
      playUiSound("error");
      return;
    }

    const text = await file.text();
    if (text.length > CODE_MAX_CHARS) {
      setError(`Code too long. Please keep it under ${CODE_MAX_CHARS.toLocaleString()} characters.`);
      playUiSound("error");
      return;
    }

    setCode(text);
    setFileName(file.name);
    setError(null);
    setReview(null);
    playUiSound("upload");
  }

  function onCodeChange(nextCode: string) {
    setCode(nextCode);
    if (!fileName) {
      return;
    }
    setFileName(null);
  }

  async function runReview() {
    playUiSound("tap");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode, language }),
      });

      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const waitSeconds = Number.isFinite(retryAfterSeconds)
          ? Math.max(1, Math.ceil(retryAfterSeconds))
          : 60;
        throw new Error(`Too many requests, try again in ${waitSeconds} seconds.`);
      }

      const data = (await res.json()) as ReviewResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Review failed");
      }

      setReview(data);
      playUiSound("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      playUiSound("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-top">
          <h1 className="brand-title">
            <span>Judge</span> <span>My</span> <span className="brand-accent">Code</span>
          </h1>
        </div>
        <p className="hero-kicker">Because your compiler was too kind.</p>
        <p>
          Paste code, choose a mode, and get a brutally honest score.
        </p>
        <div className="hero-links">
          <a
            className="pill"
            href="https://github.com/MateFoxer/JudgeMyCode"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="card">
        <textarea
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          maxLength={CODE_MAX_CHARS}
          placeholder="Paste your code here"
        />

        <div className="controls form-controls">
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
              onChange={(event) => {
                setMode(event.target.value as ReviewMode);
                playUiSound("tap");
              }}
            >
              {MODES.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button onClick={runReview} disabled={loading || code.trim().length === 0 || charCount > CODE_MAX_CHARS}>
            {loading ? "Reviewing..." : "Judge It"}
          </button>
        </div>

        <p className={`small${charCount > CODE_MAX_CHARS * 0.9 ? " warn" : ""}`}>
          {fileName ? `Loaded file: ${fileName}` : "Using pasted text"} | Detected language: {language} | {charCount.toLocaleString()}/{CODE_MAX_CHARS.toLocaleString()} chars
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
