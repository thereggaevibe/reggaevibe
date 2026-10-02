import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { stationLogoAsset } from "@/lib/site-images";

const stationLogo = stationLogoAsset.url;

const title = "Sign in — Reggae Vibe Radio";
const description =
  "Create a free Reggae Vibe Radio account to vote on tracks and unlock listener analytics and play history reports.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, display_name: name || email.split("@")[0] || "Listener" });
    }
    toast.success("You're in! Start voting.");
    navigate({ to: "/" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }


  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <img src={stationLogo} alt="Reggae Vibe Radio logo" width={72} height={72} className="size-18" />
      <h1 className="mt-4 text-3xl">Join the vibe</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Vote on the tunes playing now and unlock listener analytics.
      </p>

      <div className="panel mt-8 w-full p-5">
        <Button className="w-full" variant="secondary" onClick={google}>
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="grid gap-4 pt-4" onSubmit={signIn}>
              <div className="grid gap-2">
                <Label htmlFor="in-email">Email</Label>
                <Input id="in-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="in-pass">Password</Label>
                <Input id="in-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="grid gap-4 pt-4" onSubmit={signUp}>
              <div className="grid gap-2">
                <Label htmlFor="up-name">Display name</Label>
                <Input id="up-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-email">Email</Label>
                <Input id="up-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-pass">Password</Label>
                <Input
                  id="up-pass"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create account"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
