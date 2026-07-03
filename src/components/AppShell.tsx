import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Heart,
  Home,
  LogOut,
  Plus,
  Search,
  MessagesSquare,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, link, read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setNotifs(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => setNotifs((prev) => [payload.new as Notification, ...prev]),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: Home, show: true },
    {
      to: "/browse",
      label: "Browse",
      icon: Search,
      show: primaryRole === "tenant" || primaryRole === "admin",
    },
    {
      to: "/wishlist",
      label: "Wishlist",
      icon: Heart,
      show: primaryRole === "tenant" || primaryRole === "admin",
    },
    {
      to: "/listings/new",
      label: "List a room",
      icon: Plus,
      show: primaryRole === "owner" || primaryRole === "admin",
    },
    { to: "/interests", label: "Interests", icon: MessagesSquare, show: true },
    { to: "/profile", label: "My profile", icon: UserIcon, show: primaryRole === "tenant" },
    { to: "/admin", label: "Admin", icon: ShieldCheck, show: primaryRole === "admin" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Home className="size-5 text-primary" /> Roomly
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks
              .filter((n) => n.show)
              .map((n) => {
                const active = pathname === n.to || pathname.startsWith(n.to + "/");
                return (
                  <Link key={n.to} to={n.to}>
                    <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5">
                      <n.icon className="size-4" /> {n.label}
                    </Button>
                  </Link>
                );
              })}
          </nav>
          <div className="flex items-center gap-2">
            <DropdownMenu
              onOpenChange={(o) => {
                if (!o && unread) markAllRead();
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>
                  Notifications {unread > 0 && <Badge variant="secondary">{unread} new</Badge>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                )}
                {notifs.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-0.5"
                    onClick={() => n.link && navigate({ to: n.link })}
                  >
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden text-sm sm:inline">{profile?.display_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="text-sm">{profile?.display_name}</div>
                  <div className="text-xs text-muted-foreground">{primaryRole}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {navLinks
            .filter((n) => n.show)
            .map((n) => (
              <Link key={n.to} to={n.to}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <n.icon className="size-4" /> {n.label}
                </Button>
              </Link>
            ))}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
