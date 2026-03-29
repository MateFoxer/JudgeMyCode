import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReviewById } from "@/lib/reviewStore";

type PageParams = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const item = await getReviewById(id);

  if (!item) {
    return {
      title: "Review Not Found | Judge My Code",
    };
  }

  return {
    title: `${item.review.rating}/10 - ${item.review.headline} | Judge My Code`,
    description: item.review.brutalHonesty,
  };
}

export default async function SharedReviewPage({ params }: PageParams) {
  const { id } = await params;
  const item = await getReviewById(id);

  if (!item) {
    notFound();
  }

  const review = item.review;

  return (
    <main>
      <section className="hero">
        <div className="hero-top">
          <h1>Shared Code Review</h1>
        </div>
        <p>
          Review #{id} in {review.mode.toUpperCase()} mode.
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
        <p className="rating">{review.rating}/10</p>
        <h2>{review.headline}</h2>
        <p>{review.brutalHonesty}</p>

        <h3>Score Breakdown</h3>
        <div className="grid">
          <article className="card" style={{ padding: "0.7rem" }}>
            <strong>Code Quality</strong>
            <p className="small">{review.categories.codeQuality.score}/10</p>
            <p className="small">{review.categories.codeQuality.comment}</p>
          </article>
          <article className="card" style={{ padding: "0.7rem" }}>
            <strong>Readability</strong>
            <p className="small">{review.categories.readability.score}/10</p>
            <p className="small">{review.categories.readability.comment}</p>
          </article>
          <article className="card" style={{ padding: "0.7rem" }}>
            <strong>Efficiency</strong>
            <p className="small">{review.categories.efficiency.score}/10</p>
            <p className="small">{review.categories.efficiency.comment}</p>
          </article>
          <article className="card" style={{ padding: "0.7rem" }}>
            <strong>Maintainability</strong>
            <p className="small">{review.categories.maintainability.score}/10</p>
            <p className="small">{review.categories.maintainability.comment}</p>
          </article>
        </div>

        <p className="small" style={{ marginTop: "1rem" }}>
          Detected language: {item.language ?? "unknown"}
        </p>
        <p className="small">Created at: {new Date(item.createdAt).toLocaleString()}</p>

        <p style={{ marginTop: "1rem" }}>
          <Link href="/">Create your own review</Link>
        </p>
      </section>
    </main>
  );
}
