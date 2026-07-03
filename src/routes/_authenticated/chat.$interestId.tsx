import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { notifyCounterpart } from "@/lib/notifications.functions";
import { getCounterpartDisplayName } from "@/lib/profiles.functions";

export const Route = createFileRoute("/_authenticated/chat/$interestId")({
  head: () => ({
    meta: [
      { title: "Chat — Roomly" },
      { name: "description", content: "Real-time chat with your matched tenant or owner on Roomly." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Chat,
});

interface Message { id: string; sender_id: string; body: string; created_at: string }
interface InterestCtx {
  id: string;
  status: string;
  tenant_id: string;
  owner_id: string;
  listing_id: string;
  listings: { title: string } | null;
}

function Chat() {
  const { interestId } = Route.useParams();
  const { user } = useAuth();
  const [ctx, setCtx] = useState<InterestCtx | null>(null);
  const [otherName, setOtherName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: i } = await supabase.from("interests").select("*, listings:listing_id (title)").eq("id", interestId).maybeSingle();
      if (!i) { setLoading(false); return; }
      setCtx(i as InterestCtx);
      try {
        const res = await getCounterpartDisplayName({ data: { interestId } });
        setOtherName(res.displayName);
      } catch { setOtherName(""); }
      const { data: ms } = await supabase.from("messages").select("*").eq("interest_id", interestId).order("created_at");
      setMessages(ms ?? []);
      setLoading(false);
    })();
    const ch = supabase
      .channel(`chat-${interestId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `interest_id=eq.${interestId}` },
        (payload) => setMessages((p) => [...p, payload.new as Message]),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [interestId, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ctx || !text.trim()) return;
    const body = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("messages").insert({ interest_id: interestId, sender_id: user.id, body });
    if (error) return toast.error(error.message);
    const otherId = ctx.tenant_id === user.id ? ctx.owner_id : ctx.tenant_id;
    try {
      await notifyCounterpart({
        data: {
          targetUserId: otherId,
          type: "message",
          title: "New message",
          body: body.slice(0, 80),
          link: `/chat/${interestId}`,
        },
      });
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!ctx) return <div>Conversation not found.</div>;
  if (ctx.status !== "accepted") return (
    <div className="space-y-3">
      <Link to="/interests" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-3" /> Interests</Link>
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Chat opens once the interest is accepted.</CardContent></Card>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <Link to="/interests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> Back</Link>
        <div className="text-sm">
          <span className="font-medium">{otherName}</span>
          <span className="text-muted-foreground"> · {ctx.listings?.title}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && <div className="text-center text-sm text-muted-foreground">Say hi 👋</div>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.body}
                <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border pt-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message…" autoFocus />
        <Button type="submit" disabled={!text.trim()}><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
