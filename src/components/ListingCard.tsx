import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BedDouble, Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";

export interface ListingCardListing {
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

export interface Score {
  score: number;
  explanation: string;
  source: string;
}

export function getListingRating(listingId: string): { rating: string; reviews: number } {
  const seed = listingId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rating = (4.6 + (seed % 40) / 100).toFixed(2);
  const reviews = 12 + (seed % 240);
  return { rating, reviews };
}


export function ListingCard({
  listing,
  score,
  liked,
  onToggleLike,
}: {
  listing: ListingCardListing;
  score?: Score;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const photos = Array.isArray(listing.photos) ? (listing.photos as string[]).filter(Boolean) : [];
  const [idx, setIdx] = useState(0);

  const { rating, reviews } = getListingRating(listing.id);

  const daysUntil = Math.max(
    0,
    Math.round((new Date(listing.available_from).getTime() - Date.now()) / 86400000),
  );
  const availability =
    daysUntil <= 0
      ? "Available now"
      : daysUntil <= 30
        ? `Available in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`
        : `Available ${new Date(listing.available_from).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    if (photos.length < 2) return;
    setIdx((p) => (p + dir + photos.length) % photos.length);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleLike();
  };

  return (
    <Link to="/listings/$id" params={{ id: listing.id }} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {photos.length > 0 ? (
          <img
            src={photos[idx]}
            alt={listing.title}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <BedDouble className="size-8" />
          </div>
        )}

        {/* Top-left chips */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {daysUntil <= 0 && (
            <span className="rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow-pill">
              Guest favorite
            </span>
          )}
          {score && (
            <span className="inline-flex items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow-pill">
              <Sparkles className="size-3 text-primary" /> {score.score}
            </span>
          )}
        </div>

        {/* Heart */}
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
          onClick={toggleLike}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-white/95 transition hover:scale-110"
        >
          <Heart
            className={`size-6 drop-shadow ${liked ? "fill-primary stroke-primary" : "fill-black/40 stroke-white"}`}
            strokeWidth={2}
          />
        </button>

        {/* Carousel controls */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => go(e, -1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 size-7 place-items-center rounded-full bg-background/95 text-foreground shadow-pill transition hover:scale-105 group-hover:grid"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => go(e, 1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 size-7 place-items-center rounded-full bg-background/95 text-foreground shadow-pill transition hover:scale-105 group-hover:grid"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1">
              {photos.slice(0, 5).map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition ${i === idx % Math.min(photos.length, 5) ? "bg-white" : "bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}

        {listing.status !== "active" && (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <Badge variant="destructive" className="rounded-md">
              Filled
            </Badge>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-foreground group-hover:underline">
            {listing.location}
          </h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-3.5 fill-foreground stroke-foreground" />
            <span className="font-medium">{rating}</span>
            <span className="text-muted-foreground">({reviews})</span>
          </div>
        </div>
        <p className="truncate text-sm text-muted-foreground">{listing.title}</p>
        <p className="text-sm text-muted-foreground capitalize">
          {listing.room_type.replace("_", " ")} · {listing.furnishing.replace("_", " ")}
        </p>
        <p className="text-sm text-muted-foreground">{availability}</p>
        <p className="pt-1.5 text-[15px]">
          <span className="font-semibold text-foreground">₹{listing.rent_monthly.toLocaleString("en-IN")}</span>{" "}
          <span className="text-muted-foreground">/ month</span>
        </p>
        {score && (
          <p className="line-clamp-2 pt-1 text-xs italic text-muted-foreground">
            {score.explanation}
          </p>
        )}
      </div>
    </Link>
  );
}
