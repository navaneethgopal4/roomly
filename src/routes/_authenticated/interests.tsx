import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessagesSquare } from "lucide-react";
import { notifyCounterpart } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/interests")({
  head: () => ({
    meta: [
      { title: "Interests — Roomly" },
      { name: "description", content: "Review received and sent interest requests, accept matches, and open chats." },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/interests" }],
  }),
  component: Interests,
});

interface InterestRow {
  id: string;
  status: string;
  score: number | null;
  message: string | null;
  created_at: string;
  listing_id: string;
  tenant_id: string;
  owner_id: string;
  listings: { title: string; location: string; rent_monthly: number; status: string } | null;
  tenant: { display_name: string } | null;
  owner: { display_name: string } | null;
}

function Interests() {
  const { user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<InterestRow[]>([]);
  const [outgoing, setOutgoing] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const baseSelect = "*, listings:listing_id (title, location, rent_monthly, status)";
    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase.from("interests").select(baseSelect).eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("interests").select(baseSelect).eq("tenant_id", user.id).order("created_at", { ascending: false }),
    ]);
    // hydrate display names separately to avoid PostgREST embed ambiguity
    const ids = new Set<string>();
    (inc ?? []).forEach((r) => ids.add(r.tenant_id));
    (out ?? []).forEach((r) => ids.add(r.owner_id));
    let names: Record<string, string> = {};
    if (ids.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", Array.from(ids));
      names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name]));
    }
    setIncoming((inc ?? []).map((r) => ({ ...r, tenant: { display_name: names[r.tenant_id] ?? "" }, owner: null } as InterestRow)));
    setOutgoing((out ?? []).map((r) => ({ ...r, owner: { display_name: names[r.owner_id] ?? "" }, tenant: null } as InterestRow)));
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`interests-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "interests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateStatus = async (i: InterestRow, status: "accepted" | "declined") => {
    const { error } = await supabase.from("interests").update({ status }).eq("id", i.id);
    if (error) return toast.error(error.message);
    try {
      await notifyCounterpart({
        data: {
          targetUserId: i.tenant_id,
          type: `interest_${status}`,
          title: status === "accepted" ? "Interest accepted 🎉" : "Interest declined",
          body: `Your interest in "${i.listings?.title ?? "a listing"}" was ${status}.`,
          link: status === "accepted" ? `/chat/${i.id}` : `/listings/${i.listing_id}`,
        },
      });
    } catch (e) { console.error(e); }
    toast.success(`Marked ${status}`);
    load();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const defaultTab = primaryRole === "tenant" ? "out" : "in";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Interests</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="in">Received ({incoming.length})</TabsTrigger>
          <TabsTrigger value="out">Sent ({outgoing.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="space-y-3 pt-4">
          {incoming.length === 0 && <p className="text-sm text-muted-foreground">No interests received yet.</p>}
          {incoming.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{i.listings?.title ?? "Listing"}</div>
                  <div className="text-xs text-muted-foreground">From {i.tenant?.display_name || "tenant"} · {new Date(i.created_at).toLocaleDateString()}</div>
                  {i.message && <p className="mt-1 text-sm text-muted-foreground">“{i.message}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  {i.score != null && <Badge variant={i.score >= 80 ? "default" : "secondary"}>{i.score}/100</Badge>}
                  <StatusBadge status={i.status} />
                  {i.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(i, "accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(i, "declined")}>Decline</Button>
                    </>
                  )}
                  {i.status === "accepted" && (
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/chat/$interestId", params: { interestId: i.id } })} className="gap-1"><MessagesSquare className="size-4" /> Chat</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="out" className="space-y-3 pt-4">
          {outgoing.length === 0 && <p className="text-sm text-muted-foreground">You haven't sent any interests yet.</p>}
          {outgoing.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{i.listings?.title ?? "Listing"}</div>
                  <div className="text-xs text-muted-foreground">To {i.owner?.display_name || "owner"} · {new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {i.score != null && <Badge variant="secondary">{i.score}/100</Badge>}
                  <StatusBadge status={i.status} />
                  {i.status === "accepted" && (
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/chat/$interestId", params: { interestId: i.id } })} className="gap-1"><MessagesSquare className="size-4" /> Chat</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge>Accepted</Badge>;
  if (status === "declined") return <Badge variant="destructive">Declined</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}
