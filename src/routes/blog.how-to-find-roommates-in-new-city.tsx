import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://roomlyapp.lovable.app/blog/how-to-find-roommates-in-new-city";
const TITLE = "How to find a roommate in a new city — Roomly";
const DESC =
  "A practical guide to finding compatible roommates when you move to a new city: where to look, what to vet for, and how AI compatibility scoring removes the guesswork.";

export const Route = createFileRoute("/blog/how-to-find-roommates-in-new-city")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to find a roommate in a new city",
          description: DESC,
          url: URL,
          author: { "@type": "Organization", name: "Roomly" },
          publisher: { "@type": "Organization", name: "Roomly" },
        }),
      },
    ],
  }),
  component: Post,
});

function Post() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">Home</Link> · Blog
      </nav>
      <article className="prose prose-neutral max-w-none">
        <h1 className="text-4xl font-bold tracking-tight">How to find a roommate in a new city</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Moving to a city where you don't know anyone makes the roommate search feel like a coin
          flip. Here's how to stack the odds in your favor — and how AI-powered compatibility
          scoring (the core of Roomly) cuts the risk down to something manageable.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">1. Start before you arrive</h2>
        <p>
          Begin your search four to six weeks out. Most rooms in busy cities turn over on a
          first-of-the-month cycle, so listings refresh in clusters. Filtering by move-in date and
          budget early gives you time to chat without pressure.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">2. Look in the right places</h2>
        <ul>
          <li>Dedicated flatmate platforms (like Roomly) where every profile includes preferences and a verified identity.</li>
          <li>City-specific subreddits and Facebook groups — slower, but useful for neighborhood feel.</li>
          <li>University and employer housing boards, even after graduation.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold">3. Vet for compatibility, not just price</h2>
        <p>
          The biggest source of roommate regret is mismatched habits: sleep schedule, cleanliness,
          guests, noise, pets. A profile that surfaces these up front saves you a hundred awkward
          messages. On Roomly, every listing comes with a 0–100 compatibility score and a short,
          human reason why — built from both sides' preferences, budget overlap, and location fit.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">4. Always video call before committing</h2>
        <p>
          Photos lie, listings exaggerate, and chat hides red flags. A 10-minute video walkthrough
          of the room — and a quick chat with the existing flatmates — tells you more than a week
          of texting.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">5. Trust the small signals</h2>
        <p>
          Response time, willingness to answer specific questions, and whether they ask about
          <em> you</em> are all data. Good roommates treat the search like a two-way fit, not a
          transaction.
        </p>

        <div className="mt-12 rounded-2xl border border-border bg-muted/40 p-6">
          <h3 className="text-lg font-semibold">Try Roomly</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a profile in a minute and see ranked, AI-scored matches in your new city.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </article>
    </div>
  );
}
