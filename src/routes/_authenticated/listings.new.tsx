import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { INDIAN_LOCATION_SUGGESTIONS } from "@/lib/indian-cities";

type RoomType = Database["public"]["Enums"]["room_type"];
type Furnishing = Database["public"]["Enums"]["furnishing"];

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({
    meta: [
      { title: "List a room — Roomly" },
      { name: "description", content: "Create a new room listing on Roomly with photos, rent, room type, and availability." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/listings/new" }],
  }),
  component: NewListing,
});

function NewListing() {
  const { user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("18000");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomType, setRoomType] = useState<RoomType>("private");
  const [furnishing, setFurnishing] = useState<Furnishing>("furnished");
  const [photos, setPhotos] = useState("");
  const [busy, setBusy] = useState(false);

  if (primaryRole !== "owner" && primaryRole !== "admin") {
    return <div className="text-sm text-muted-foreground">Only owners can create listings.</div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const photoArr = photos.split("\n").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("listings").insert({
      owner_id: user.id,
      title: title.trim(),
      description: desc.trim() || null,
      location: location.trim(),
      rent_monthly: parseInt(rent),
      available_from: date,
      room_type: roomType,
      furnishing,
      photos: photoArr,
    }).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Listing published");
    navigate({ to: "/listings/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New listing</CardTitle>
          <CardDescription>Tenants will see this in browse with their personal compatibility score.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t">Title</Label>
              <Input id="t" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunny private room near the park" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l">Location</Label>
              <Input id="l" required maxLength={120} list="indian-locations" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" />
              <datalist id="indian-locations">
                {INDIAN_LOCATION_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="r">Rent (₹ / month)</Label>
                <Input id="r" type="number" min={0} required value={rent} onChange={(e) => setRent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d">Available from</Label>
                <Input id="d" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Room type</Label>
                <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private room</SelectItem>
                    <SelectItem value="shared">Shared room</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="entire_place">Entire place</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Furnishing</Label>
                <Select value={furnishing} onValueChange={(v) => setFurnishing(v as Furnishing)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="furnished">Furnished</SelectItem>
                    <SelectItem value="semi_furnished">Semi-furnished</SelectItem>
                    <SelectItem value="unfurnished">Unfurnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" maxLength={2000} rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Tell us about the place, the building, the household." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">Photo URLs (one per line, optional)</Label>
              <Textarea id="ph" rows={3} value={photos} onChange={(e) => setPhotos(e.target.value)} placeholder="https://…" />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish listing"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
