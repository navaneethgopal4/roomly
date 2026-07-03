import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, BedDouble, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { computeCompatibility } from "@/lib/compatibility.functions";
import { notifyCounterpart } from "@/lib/notifications.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/listings/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("listings")
      .select("id, title, description, location, rent_monthly, available_from, photos")
      .eq("id", params.id)
      .maybeSingle();
    return { listing: data };
  },
  head: ({ params, loaderData }) => {
    const l = loaderData?.listing;
    const title = l?.title ? `${l.title} — Roomly` : "Listing — Roomly";
    const desc = l
      ? `${l.title} in ${l.location} for ₹${l.rent_monthly}/mo. ${(l.description ?? "").slice(0, 110)}`.trim().slice(0, 160)
      : "Room listing on Roomly with AI compatibility scoring and real-time chat.";
    const url = `https://roomlyapp.lovable.app/listings/${params.id}`;
    const photo = Array.isArray(l?.photos) ? (l!.photos as string[])[0] : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(photo ? [{ property: "og:image", content: photo }] : []),
        { name: "robots", content: "noindex, follow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: l
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: l.title,
                description: l.description ?? undefined,
                image: photo,
                offers: {
                  "@type": "Offer",
                  price: l.rent_monthly,
                  priceCurrency: "INR",
                  availability: "https://schema.org/InStock",
                  url,
                },
              }),
            },
          ]
        : [],
    };
  },
  component: ListingDetail,
});

interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location: string;
  rent_monthly: number;
  available_from: string;
  room_type: string;
  furnishing: string;
  photos: unknown;
  status: string;
  created_at: string;
}

function ListingDetail() {
  const { id } = Route.useParams();
  const { user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const compute = useServerFn(computeCompatibility);
  const [listing, setListing] = useState<Listing | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [score, setScore] = useState<{ score: number; explanation: string; source: string } | null>(null);
  const [interest, setInterest] = useState<{ id: string; status: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      if (!l) { setLoading(false); return; }
      setListing(l);
      const { data: o } = await supabase.from("profiles").select("display_name").eq("id", l.owner_id).maybeSingle();
      setOwnerName(o?.display_name ?? "");
      if (primaryRole === "tenant" && user.id !== l.owner_id) {
        const { data: s } = await supabase.from("compatibility_scores").select("score, explanation, source").eq("listing_id", id).eq("tenant_id", user.id).maybeSingle();
        if (s) setScore(s);
        const { data: i } = await supabase.from("interests").select("id, status").eq("listing_id", id).eq("tenant_id", user.id).maybeSingle();
        if (i) setInterest(i);
      }
      setLoading(false);
    })();
  }, [id, user, primaryRole]);

  const doScore = async () => {
    setBusy(true);
    try {
      const r = await compute({ data: { listingId: id } });
      setScore(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const sendInterest = async () => {
    if (!user || !listing) return;
    setBusy(true);
    let currentScore = score;
    if (!currentScore) {
      try { currentScore = await compute({ data: { listingId: id } }); setScore(currentScore); } catch (e) { console.error(e); }
    }
    const { data, error } = await supabase.from("interests").insert({
      listing_id: id,
      tenant_id: user.id,
      owner_id: listing.owner_id,
      message: msg.trim() || null,
      score: currentScore?.score ?? null,
    }).select("id, status").single();
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    // Notify the owner; flag high-score
    const isHigh = (currentScore?.score ?? 0) >= 80;
    try {
      await notifyCounterpart({
        data: {
          targetUserId: listing.owner_id,
          type: isHigh ? "interest_high" : "interest",
          title: isHigh ? "⭐ High-match interest" : "New interest",
          body: `${currentScore ? `${currentScore.score}/100 — ` : ""}Someone is interested in "${listing.title}".`,
          link: "/interests",
        },
      });
    } catch (e) { console.error(e); }
    setInterest(data);
    setBusy(false);
    toast.success("Interest sent");
  };

  const toggleFilled = async () => {
    if (!listing) return;
    const next = listing.status === "filled" ? "active" : "filled";
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", listing.id);
    if (error) return toast.error(error.message);
    setListing({ ...listing, status: next });
    toast.success(next === "filled" ? "Marked as filled" : "Re-opened");
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!listing) return <div>Listing not found.</div>;

  const photos = Array.isArray(listing.photos) ? (listing.photos as string[]) : [];
  const isOwner = user?.id === listing.owner_id;

  return (
    <div className="space-y-6">
      <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> Back</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
            {photos[0] ? <img src={photos[0]} alt={listing.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-muted-foreground"><BedDouble className="size-12" /></div>}
          </div>
          {photos.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(1, 4).map((p, i) => <img key={i} src={p} alt={`${listing.title} — photo ${i + 2}`} className="aspect-square rounded-md object-cover" />)}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{listing.location}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="size-4" />Available {new Date(listing.available_from).toLocaleDateString()}</span>
              <Badge variant="outline" className="capitalize">{listing.room_type.replace("_", " ")}</Badge>
              <Badge variant="outline" className="capitalize">{listing.furnishing.replace("_", " ")}</Badge>
              {listing.status === "filled" && <Badge variant="destructive">Filled</Badge>}
            </div>
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{listing.description || "No description provided."}</p>

          <div className="text-xs text-muted-foreground">Listed by {ownerName || "owner"}</div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-5">
              <div className="text-3xl font-semibold">₹{listing.rent_monthly.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              {isOwner ? (
                <Button onClick={toggleFilled} variant={listing.status === "filled" ? "outline" : "default"} className="w-full">
                  {listing.status === "filled" ? "Re-open listing" : "Mark as filled"}
                </Button>
              ) : primaryRole === "tenant" ? (
                <>
                  {score ? (
                    <div className="rounded-md border border-border bg-accent/30 p-3">
                      <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wide text-muted-foreground">Compatibility</span>
                        <Badge>{score.score}/100</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{score.explanation}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">via {score.source === "llm" ? "AI" : "rule fallback"}</p>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={doScore} disabled={busy} className="w-full gap-1.5"><Sparkles className="size-4" /> {busy ? "Scoring…" : "Score this match"}</Button>
                  )}
                  {!interest ? (
                    <div className="space-y-2 pt-2">
                      <Textarea placeholder="Optional note to the owner…" maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} />
                      <Button onClick={sendInterest} disabled={busy || listing.status === "filled"} className="w-full">{listing.status === "filled" ? "Filled" : "Send interest"}</Button>
                    </div>
                  ) : interest.status === "accepted" ? (
                    <Button className="w-full gap-1.5" onClick={() => navigate({ to: "/chat/$interestId", params: { interestId: interest.id } })}>
                      <CheckCircle2 className="size-4" /> Open chat
                    </Button>
                  ) : interest.status === "declined" ? (
                    <Badge variant="destructive" className="w-full justify-center py-2">Owner declined</Badge>
                  ) : (
                    <Badge variant="secondary" className="w-full justify-center py-2">Interest sent — pending</Badge>
                  )}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Only tenants can send interest.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
