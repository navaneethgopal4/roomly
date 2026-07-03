import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Search, Globe, Menu, User } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Roomly — Find rooms & flatmates that actually match" },
      { name: "description", content: "AI-powered compatibility scoring, real-time chat, and a clean way to list or find a room or flatmate you'll actually get along with." },
      { property: "og:title", content: "Roomly — Find rooms & flatmates that actually match" },
      { property: "og:description", content: "AI-powered compatibility scoring, real-time chat, and a clean way to list or find a room or flatmate you'll actually get along with." },
      { property: "og:url", content: "https://roomlyapp.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Roomly",
          url: "https://roomlyapp.lovable.app/",
          description: "Find rooms and flatmates with AI-powered compatibility scoring and real-time chat.",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading, primaryRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && primaryRole) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, primaryRole, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1.5 text-primary">
            <svg viewBox="0 0 32 32" className="size-8 fill-current" aria-hidden>
              <path d="M16 1C7.7 1 1 7.7 1 16s6.7 15 15 15 15-6.7 15-15S24.3 1 16 1zm0 4c1.7 0 3.1 1.1 3.7 2.7l4.6 11.6c.8 2 .3 4.3-1.3 5.8a5 5 0 0 1-3.5 1.4 5 5 0 0 1-3.5-1.4L16 24l-.1.1A5 5 0 0 1 12.4 26a5 5 0 0 1-3.5-1.4c-1.6-1.5-2.1-3.8-1.3-5.8L12.3 7.7A4 4 0 0 1 16 5z"/>
            </svg>
            <span className="text-xl font-bold tracking-tight">roomly</span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <button className="rounded-full px-4 py-2 text-sm font-medium hover:bg-muted">Stays</button>
            <button className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Flatmates</button>
            <button className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Experiences</button>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/auth" search={{ mode: "signup", role: "owner" } as never} className="hidden rounded-full px-4 py-2 text-sm font-medium hover:bg-muted sm:inline-block">
              List your room
            </Link>
            <button type="button" aria-label="Change language and region" className="hidden rounded-full p-2 hover:bg-muted sm:inline-flex"><Globe className="size-4" aria-hidden /></button>
            <Link to="/auth" aria-label="Open account menu" className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 shadow-pill hover:shadow-card">
              <Menu className="size-4" aria-hidden />
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-background"><User className="size-4" aria-hidden /></span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero with search pill */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 text-center">
            <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
              Not just a room. <span className="text-primary">The right room.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              AI-powered compatibility for rooms, flatmates and the life in between.
            </p>

            {/* Airbnb-like search pill */}
            <div className="mx-auto mt-10 flex max-w-3xl items-center divide-x divide-border rounded-full border border-border bg-card shadow-pill">
              <div className="flex-1 px-6 py-3 text-left hover:rounded-l-full hover:bg-muted">
                <div className="text-xs font-semibold">Where</div>
                <div className="text-sm text-muted-foreground">Search destinations</div>
              </div>
              <div className="flex-1 px-6 py-3 text-left hover:bg-muted">
                <div className="text-xs font-semibold">Move-in</div>
                <div className="text-sm text-muted-foreground">Add date</div>
              </div>
              <div className="flex-1 px-6 py-3 text-left hover:bg-muted">
                <div className="text-xs font-semibold">Budget</div>
                <div className="text-sm text-muted-foreground">Any price</div>
              </div>
              <div className="px-2">
                <Link to="/auth" search={{ mode: "signup", role: "tenant" } as never}>
                  <Button size="lg" className="h-12 gap-2 rounded-full px-5 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Search className="size-4" /> Search
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link to="/auth" search={{ mode: "signup", role: "tenant" } as never} className="text-muted-foreground underline-offset-4 hover:underline">I'm looking for a room</Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/auth" search={{ mode: "signup", role: "owner" } as never} className="text-muted-foreground underline-offset-4 hover:underline">I have a room to rent</Link>
            </div>
          </div>
        </section>

        {/* Category strip */}
        <section className="border-y border-border bg-background">
          <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-6 py-4 text-xs font-medium text-muted-foreground">
            {["Trending", "Near me", "PG stays", "1 BHK", "Pet-friendly", "Sunny", "Coliving", "Furnished", "Long stays", "Shared flats"].map((c, i) => (
              <button key={c} className={`shrink-0 border-b-2 pb-3 transition ${i === 0 ? "border-foreground text-foreground" : "border-transparent hover:border-border hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Featured grid mock */}
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              { t: "Sunlit studio in Indiranagar", l: "Bengaluru", p: 22000, r: 4.92, img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800" },
              { t: "Cozy PG near metro", l: "Powai, Mumbai", p: 18500, r: 4.88, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800" },
              { t: "1 BHK with skyline views", l: "Gurugram", p: 27000, r: 4.95, img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800" },
              { t: "Quiet suite, near IT park", l: "HITEC City, Hyderabad", p: 16000, r: 4.81, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800" },
              { t: "Modern coliving, fast wifi", l: "Koramangala, Bengaluru", p: 21000, r: 4.9, img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800" },
              { t: "Bright bedroom, parkside", l: "Salt Lake, Kolkata", p: 14500, r: 4.87, img: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800" },
              { t: "Designer flat, CP nearby", l: "New Delhi", p: 32000, r: 4.93, img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800" },
              { t: "Furnished room, balcony", l: "Kothrud, Pune", p: 15500, r: 4.84, img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800" },
            ].map((card) => (
              <Link key={card.t} to="/auth" className="group block">
                <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                  <img src={card.img} alt={card.t} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{card.l}</div>
                    <div className="truncate text-sm text-muted-foreground">{card.t}</div>
                    <div className="mt-1 text-sm"><span className="font-semibold">₹{card.p.toLocaleString("en-IN")}</span> <span className="text-muted-foreground">/ month</span></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <span aria-hidden>★</span> {card.r}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Value props */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
            {[
              { icon: Search, title: "Search like you live", body: "Filter by what actually matters: budget, location, vibe." },
              { icon: Sparkles, title: "AI compatibility", body: "Every match gets a 0–100 score with a short, human reason why." },
              { icon: MessageSquare, title: "Chat in real time", body: "Get accepted, then chat instantly. No more inbox limbo." },
            ].map((f) => (
              <div key={f.title}>
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><f.icon className="size-5" /></div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Roomly, Inc.</span>
          <span>Designed with care · Inspired by the home you'll love.</span>
        </div>
      </footer>
    </div>
  );
}
