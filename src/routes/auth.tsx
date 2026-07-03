import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Home } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["tenant", "owner"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Roomly" },
      { name: "description", content: "Sign in to Roomly or create a tenant or owner account to start finding compatible rooms and flatmates." },
      { property: "og:title", content: "Sign in or create an account — Roomly" },
      { property: "og:description", content: "Sign in to Roomly or create a tenant or owner account to start finding compatible rooms and flatmates." },
      { property: "og:url", content: "https://roomlyapp.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://roomlyapp.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, primaryRole, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"tenant" | "owner">(search.role ?? "tenant");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && primaryRole) navigate({ to: "/dashboard" });
  }, [loading, user, primaryRole, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Please enter your name");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name.trim(), role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Roomly home" className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold">
          <Home className="size-5 text-primary" aria-hidden /> Roomly
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Email</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2">Password</Label>
                    <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup value={role} onValueChange={(v) => setRole(v as "tenant" | "owner")} className="grid grid-cols-2 gap-2">
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40">
                        <RadioGroupItem value="tenant" /> Tenant
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40">
                        <RadioGroupItem value="owner" /> Owner
                      </Label>
                    </RadioGroup>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
