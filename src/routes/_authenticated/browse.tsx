import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { useServerFn } from "@tanstack/react-start";
import { computeCompatibility } from "@/lib/compatibility.functions";
import { toast } from "sonner";
import { INDIAN_LOCATION_SUGGESTIONS } from "@/lib/indian-cities";

export const Route = createFileRoute("/_authenticated/browse")({
  head: () => ({
    meta: [
      { title: "Browse rooms — Roomly" },
      { name: "description", content: "Browse available rooms and rank them by AI compatibility based on your tenant profile." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/browse" }],
  }),
  component: Browse,
});

interface Listing {
  id: string;
  title: string;
  location: string;
  rent_monthly: number;
  available_from: string;
  room_type: string;
  furnishing: string;
  description: string | null;
  photos: unknown;
  owner_id: string;
  status?: string;
}

interface Score {
  score: number;
  explanation: string;
  source: string;
}

function Browse() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [filterLoc, setFilterLoc] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const compute = useServerFn(computeCompatibility);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ls }, { data: tp }, { data: existingScores }, { data: wl }] =
        await Promise.all([
          supabase
            .from("listings")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false }),
          supabase.from("tenant_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("compatibility_scores")
            .select("listing_id, score, explanation, source")
            .eq("tenant_id", user.id),
          supabase.from("wishlists").select("listing_id").eq("user_id", user.id),
        ]);
      setListings(ls ?? []);
      setHasProfile(!!tp);
      const sm: Record<string, Score> = {};
      for (const s of existingScores ?? [])
        sm[s.listing_id] = { score: s.score, explanation: s.explanation, source: s.source };
      setScores(sm);
      setWishlist(new Set((wl ?? []).map((w) => w.listing_id)));
      setLoading(false);
    })();
  }, [user]);

  const toggleWishlist = async (listingId: string) => {
    if (!user) return;
    const isLiked = wishlist.has(listingId);
    // Optimistic update
    setWishlist((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
    const { error } = isLiked
      ? await supabase.from("wishlists").delete().eq("user_id", user.id).eq("listing_id", listingId)
      : await supabase.from("wishlists").insert({ user_id: user.id, listing_id: listingId });
    if (error) {
      // Revert on failure
      setWishlist((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
      toast.error(error.message);
    }
  };

  const filtered = useMemo(() => {
    // Split on commas / whitespace so "Koramangala, Bengaluru" matches
    // listings that mention either token (e.g. "Koramangala 4th Block" or
    // "HSR Layout, Bengaluru"). Ignore short noise tokens.
    const tokens = filterLoc
      .toLowerCase()
      .split(/[,/]|\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);
    return listings.filter((l) => {
      if (tokens.length) {
        const hay = l.location.toLowerCase();
        if (!tokens.some((t) => hay.includes(t))) return false;
      }
      if (maxRent && l.rent_monthly > parseInt(maxRent)) return false;
      return true;
    });
  }, [listings, filterLoc, maxRent]);

  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => (scores[b.id]?.score ?? -1) - (scores[a.id]?.score ?? -1));
  }, [filtered, scores]);

  const scoreAll = async () => {
    if (!hasProfile) return toast.error("Create your tenant profile first");
    setScoring(true);
    const toScore = filtered.filter((l) => !scores[l.id]);
    let done = 0;
    for (const l of toScore) {
      try {
        const r = await compute({ data: { listingId: l.id } });
        setScores((p) => ({ ...p, [l.id]: r }));
        done++;
      } catch (e) {
        console.error(e);
      }
    }
    setScoring(false);
    toast.success(`Scored ${done} listing${done === 1 ? "" : "s"}`);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Browse rooms</h1>
          <p className="text-sm text-muted-foreground">
            Rank by AI compatibility based on your profile.
          </p>
        </div>
        <Button onClick={scoreAll} disabled={scoring} className="gap-1.5">
          <Sparkles className="size-4" /> {scoring ? "Scoring…" : "Score with AI"}
        </Button>
      </div>

      {hasProfile === false && (
        <Card className="border-warning/50 bg-warning/10">
          <CardHeader>
            <CardTitle className="text-base">Add your tenant profile to unlock scoring</CardTitle>
            <CardDescription>We need your preferred location and budget.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile">
              <Button size="sm">Set up profile</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">Filters</h2>
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fl">Location contains</Label>
              <Input
                id="fl"
                placeholder="e.g. Koramangala"
                list="indian-locations-browse"
                value={filterLoc}
                onChange={(e) => setFilterLoc(e.target.value)}
              />
              <datalist id="indian-locations-browse">
                {INDIAN_LOCATION_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mr">Max rent</Label>
              <Input
                id="mr"
                type="number"
                min={0}
                placeholder="No limit"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="listings-heading">
        <h2 id="listings-heading" className="sr-only">Listings</h2>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ranked.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground">
              No listings match your filters.
            </div>
          )}
          {ranked.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              score={scores[l.id]}
              liked={wishlist.has(l.id)}
              onToggleLike={() => toggleWishlist(l.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
