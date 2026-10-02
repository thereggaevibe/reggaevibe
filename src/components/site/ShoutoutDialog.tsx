import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendShoutout } from "@/lib/shoutouts.functions";

export function ShoutoutDialog() {
  const submit = useServerFn(sendShoutout);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ sender_name: "", sender_email: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await submit({ data: form });
      if (res.ok) {
        toast.success("Shoutout sent to the studio!");
        setForm({ sender_name: "", sender_email: "", message: "" });
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Please check your details and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="group gap-0">
          <Megaphone />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:max-w-28 group-hover:pl-2 group-hover:opacity-100">
            Shoutout
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a shoutout</DialogTitle>
          <DialogDescription>
            Your message lands in the studio inbox and gets read on air. Keep it irie.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="so-name">Your name</Label>
            <Input
              id="so-name"
              required
              minLength={2}
              maxLength={80}
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-email">Email (optional)</Label>
            <Input
              id="so-email"
              type="email"
              value={form.sender_email}
              onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-msg">Message</Label>
            <Textarea
              id="so-msg"
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send shoutout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
