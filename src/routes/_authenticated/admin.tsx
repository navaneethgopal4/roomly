import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listRecentProfilesForAdmin } from "@/lib/profiles.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Roomly" },
      { name: "description", content: "Admin dashboard for managing Roomly users, listings, interests, and messages." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/admin" }],
  }),
  component: Admin,
});

function Admin() {
  const { primaryRole } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; created_at: string }>>([]);
  const [listings, setListings] = useState<Array<{ id: string; title: string; status: string; rent_monthly: number; location: string }>>([]);
  const [counts, setCounts] = useState({ interests: 0, messages: 0 });

  useEffect(() => {
    if (primaryRole !== "admin") return;
    (async () => {
      const [u, { data: l }, { count: ic }, { count: mc }] = await Promise.all([
        listRecentProfilesForAdmin({ data: { limit: 50 } }).catch(() => []),
        supabase.from("listings").select("id, title, status, rent_monthly, location").order("created_at", { ascending: false }).limit(50),
        supabase.from("interests").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);
      setUsers(u ?? []);
      setListings(l ?? []);
      setCounts({ interests: ic ?? 0, messages: mc ?? 0 });
    })();
  }, [primaryRole]);

  if (primaryRole !== "admin") {
    return <div className="text-sm text-muted-foreground">Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Users" v={users.length} />
        <Stat label="Listings" v={listings.length} />
        <Stat label="Interests" v={counts.interests} />
        <Stat label="Messages" v={counts.messages} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent users</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}><TableCell>{u.display_name}</TableCell><TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent listings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Location</TableHead><TableHead>Rent</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id}><TableCell>{l.title}</TableCell><TableCell className="text-muted-foreground">{l.location}</TableCell><TableCell>₹{l.rent_monthly.toLocaleString("en-IN")}</TableCell><TableCell>{l.status === "filled" ? <Badge variant="destructive">Filled</Badge> : <Badge>Active</Badge>}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{v}</div>
    </CardContent></Card>
  );
}
