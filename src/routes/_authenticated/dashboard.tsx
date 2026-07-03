import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Search, MessagesSquare, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Roomly" },
      { name: "description", content: "Your Roomly dashboard with listings, interest requests, and active chats." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/dashboard" }],
  }),
  component: Dashboard,
});

interface Stats {
  listings: number;
  interestsIn: number;
  interestsOut: number;
  acceptedChats: number;
}

function Dashboard() {
  const { profile, primaryRole, user } = useAuth();
  const [stats, setStats] = useState<Stats>({ listings: 0, interestsIn: 0, interestsOut: 0, acceptedChats: 0 });
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [listings, interestsIn, interestsOut, accepted, tp] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("interests").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("interests").select("id", { count: "exact", head: true }).eq("tenant_id", user.id),
        supabase.from("interests").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`tenant_id.eq.${user.id},owner_id.eq.${user.id}`),
        supabase.from("tenant_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);
      setStats({
        listings: listings.count ?? 0,
        interestsIn: interestsIn.count ?? 0,
        interestsOut: interestsOut.count ?? 0,
        acceptedChats: accepted.count ?? 0,
      });
      setHasProfile(!!tp.data);
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Hi, {profile?.display_name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-sm text-muted-foreground">
            You're signed in as <Badge variant="secondary">{primaryRole}</Badge>
          </p>
        </div>
      </div>

      {primaryRole === "tenant" && hasProfile === false && (
        <Card className="border-warning/50 bg-warning/10">
          <CardHeader>
            <CardTitle className="text-base">Finish setting up your profile</CardTitle>
            <CardDescription>Tell us your preferred location and budget so we can rank listings for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/profile"><Button size="sm">Complete profile</Button></Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryRole !== "tenant" && (
          <StatCard label="My listings" value={stats.listings} icon={Home} />
        )}
        <StatCard label="Interests received" value={stats.interestsIn} icon={MessagesSquare} />
        <StatCard label="Interests sent" value={stats.interestsOut} icon={Search} />
        <StatCard label="Active conversations" value={stats.acceptedChats} icon={MessagesSquare} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(primaryRole === "owner" || primaryRole === "admin") && (
          <ActionCard title="List a new room" body="Post details and photos. Tenants will be matched by compatibility." to="/listings/new" icon={Plus} />
        )}
        {(primaryRole === "tenant" || primaryRole === "admin") && (
          <ActionCard title="Browse rooms" body="Filter by location and budget. See your match score on each." to="/browse" icon={Search} />
        )}
        <ActionCard title="Open interests" body="Review interests, accept matches, and start chatting." to="/interests" icon={MessagesSquare} />
        {primaryRole === "tenant" && (
          <ActionCard title="My tenant profile" body="Adjust budget, location, and move-in date." to="/profile" icon={UserCog} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, body, to, icon: Icon }: { title: string; body: string; to: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2"><Icon className="size-4 text-primary" /><CardTitle className="text-base">{title}</CardTitle></div>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link to={to}><Button size="sm" variant="outline">Open</Button></Link>
      </CardContent>
    </Card>
  );
}
