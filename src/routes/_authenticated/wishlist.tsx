import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardListing, getListingRating } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Heart, Search, SlidersHorizontal, Star } from "lucide-react";
import { toast } from "sonner";


type WishlistListing = ListingCardListing & { created_at: string };




export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — Roomly" },
      { name: "description", content: "Your saved Roomly listings with search, availability, rating, and sort filters." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/wishlist" }],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { user } = useAuth();
  const [listings, setListings] = useState<WishlistListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleQuery, setTitleQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [minRating, setMinRating] = useState("any");
  const [sort, setSort] = useState("newest");

  const loadWishlist = async () => {
    if (!user) return;
    setLoading(true);
    const { data: wishRows } = await supabase
      .from("wishlists")
      .select("listing_id")
      .eq("user_id", user.id);
    const ids = (wishRows ?? []).map((w) => w.listing_id);
    if (ids.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }
    const { data: ls } = await supabase
      .from("listings")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setListings((ls ?? []) as WishlistListing[]);
    setLoading(false);
  };

  useEffect(() => {
    loadWishlist();
  }, [user]);

  const daysUntil = (availableFrom: string) =>
    Math.max(0, Math.round((new Date(availableFrom).getTime() - Date.now()) / 86400000));

  const filtered = useMemo(() => {
    const q = titleQuery.trim().toLowerCase();
    const min = minRating === "any" ? 0 : parseFloat(minRating);
    const result = listings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q) && !l.location.toLowerCase().includes(q)) {
        return false;
      }
      const days = daysUntil(l.available_from);
      if (availability === "now" && days > 0) return false;
      if (availability === "soon" && (days <= 0 || days > 30)) return false;
      if (availability === "later" && days <= 30) return false;
      if (minRating !== "any") {
        const { rating } = getListingRating(l.id);
        if (parseFloat(rating) < min) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      switch (sort) {
        case "rating_desc": {
          return parseFloat(getListingRating(b.id).rating) - parseFloat(getListingRating(a.id).rating);
        }
        case "available_soon": {
          return new Date(a.available_from).getTime() - new Date(b.available_from).getTime();
        }
        case "price_asc": {
          return a.rent_monthly - b.rent_monthly;
        }
        case "price_desc": {
          return b.rent_monthly - a.rent_monthly;
        }
        case "newest":
        default: {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      }
    });
  }, [listings, titleQuery, availability, minRating, sort]);

  const remove = async (listingId: string) => {
    if (!user) return;
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) {
      toast.error(error.message);
      await loadWishlist();
    } else {
      toast.success("Removed from wishlist");
    }
  };

  const hasFilters = titleQuery || availability !== "all" || minRating !== "any" || sort !== "newest";

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Wishlist</h1>
        <p className="text-sm text-muted-foreground">Rooms you have saved.</p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-16 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">No saved listings yet</p>
            <p className="text-sm text-muted-foreground">
              Browse rooms and tap the heart to save your favorites.
            </p>
          </div>
          <Link to="/browse">
            <Button className="gap-1.5">
              <Search className="size-4" /> Browse rooms
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label htmlFor="wishlist-search" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Search className="size-3.5" /> Search title or location
                </Label>
                <Input
                  id="wishlist-search"
                  placeholder="e.g. sunny 1 BHK, Koramangala…"
                  value={titleQuery}
                  onChange={(e) => setTitleQuery(e.target.value)}
                />
              </div>
              <div className="min-w-[160px] flex-1 space-y-1.5">
                <Label htmlFor="wishlist-availability" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <SlidersHorizontal className="size-3.5" /> Availability
                </Label>
                <Select value={availability} onValueChange={setAvailability}>
                  <SelectTrigger id="wishlist-availability">
                    <SelectValue placeholder="All availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All availability</SelectItem>
                    <SelectItem value="now">Available now</SelectItem>
                    <SelectItem value="soon">Available within 30 days</SelectItem>
                    <SelectItem value="later">Available later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px] flex-1 space-y-1.5">
                <Label htmlFor="wishlist-rating" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Star className="size-3.5" /> Min rating
                </Label>
                <Select value={minRating} onValueChange={setMinRating}>
                  <SelectTrigger id="wishlist-rating">
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any rating</SelectItem>
                    <SelectItem value="4.5">4.5+</SelectItem>
                    <SelectItem value="4.7">4.7+</SelectItem>
                    <SelectItem value="4.9">4.9+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px] flex-1 space-y-1.5">
                <Label htmlFor="wishlist-sort" className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ArrowUpDown className="size-3.5" /> Sort by
                </Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger id="wishlist-sort">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="rating_desc">Highest rating</SelectItem>
                    <SelectItem value="available_soon">Available soon</SelectItem>
                    <SelectItem value="price_asc">Price: low to high</SelectItem>
                    <SelectItem value="price_desc">Price: high to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setTitleQuery("");
                    setAvailability("all");
                    setMinRating("any");
                    setSort("newest");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              No saved listings match your filters.
              {hasFilters && (
                <button
                  onClick={() => {
                    setTitleQuery("");
                    setAvailability("all");
                    setMinRating("any");
                    setSort("newest");
                  }}
                  className="ml-1 inline font-medium text-primary underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} liked={true} onToggleLike={() => remove(l.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

