import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { INDIAN_LOCATION_SUGGESTIONS } from "@/lib/indian-cities";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Roomly" },
      { name: "description", content: "Manage your tenant profile: preferred location, budget, move-in date, and bio." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loc, setLoc] = useState("");
  const [bMin, setBMin] = useState("500");
  const [bMax, setBMax] = useState("1500");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("tenant_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setLoc(data.preferred_location);
        setBMin(String(data.budget_min));
        setBMax(String(data.budget_max));
        setDate(data.move_in_date);
        setBio(data.bio ?? "");
      }
      setLoading(false);
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const min = parseInt(bMin), max = parseInt(bMax);
    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < min) {
      return toast.error("Invalid budget range");
    }
    setBusy(true);
    const { error } = await supabase.from("tenant_profiles").upsert({
      user_id: user.id,
      preferred_location: loc.trim(),
      budget_min: min,
      budget_max: max,
      move_in_date: date,
      bio: bio.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    // Invalidate any cached scores for this tenant so re-rank uses new prefs
    await supabase.from("compatibility_scores").delete().eq("tenant_id", user.id);
    navigate({ to: "/browse" });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Tenant profile</CardTitle>
          <CardDescription>This is what we use to rank listings and explain matches.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loc">Preferred location</Label>
              <Input id="loc" required maxLength={120} list="indian-locations-profile" placeholder="e.g. Koramangala, Bengaluru" value={loc} onChange={(e) => setLoc(e.target.value)} />
              <datalist id="indian-locations-profile">
                {INDIAN_LOCATION_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bmin">Min budget (₹ / month)</Label>
                <Input id="bmin" type="number" min={0} required value={bMin} onChange={(e) => setBMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bmax">Max budget (₹ / month)</Label>
                <Input id="bmax" type="number" min={0} required value={bMax} onChange={(e) => setBMax(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Move-in date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">About you (optional)</Label>
              <Textarea id="bio" maxLength={500} placeholder="A short intro to share with owners." value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
