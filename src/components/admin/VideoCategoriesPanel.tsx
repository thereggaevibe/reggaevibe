import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parsePlaylistId, slugifyCategory, videoCategoriesQuery } from "@/lib/video-categories-queries";

/** Control Room panel for the video categories shown on the Visuals page. */
export function VideoCategoriesPanel() {
  const qc = useQueryClient();
  const { data } = useQuery(videoCategoriesQuery(false));
  const [name, setName] = useState("");
  const [playlist, setPlaylist] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["video-categories"] });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const playlistId = parsePlaylistId(playlist);
    if (!name.trim() || !playlistId) {
      toast.error("Add a category name and a YouTube playlist link or ID");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("video_categories").insert({
      name: name.trim(),
      slug: slugifyCategory(name),
      playlist_id: playlistId,
      sort_order: (data?.length ?? 0) * 10,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not save the category");
      return;
    }
    toast.success("Video category added");
    setName("");
    setPlaylist("");
    refresh();
  }

  type CategoryPatch = { name?: string; playlist_id?: string; is_active?: boolean; sort_order?: number };

  async function update(id: string, patch: CategoryPatch) {
    const { error } = await supabase.from("video_categories").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message || "Could not update the category");
      return;
    }
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("video_categories").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the category");
      return;
    }
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={create} className="panel grid h-max gap-4 p-5">
        <h2 className="text-lg">Add a video category</h2>
        <div className="grid gap-2">
          <Label htmlFor="vc-name">Category name</Label>
          <Input id="vc-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Festival Highlights" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vc-playlist">YouTube playlist link or ID</Label>
          <Input
            id="vc-playlist"
            value={playlist}
            onChange={(event) => setPlaylist(event.target.value)}
            placeholder="https://www.youtube.com/playlist?list=PL…"
          />
          <p className="text-xs text-muted-foreground">Videos in this playlist show up under the category on the Visuals page.</p>
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add category"}</Button>
      </form>

      <div className="panel grid h-max gap-3 p-5">
        <h2 className="text-lg">Categories</h2>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">No video categories yet.</p>
        ) : (
          <ul className="grid gap-3">
            {data.map((category) => (
              <li key={category.id} className="grid gap-2 rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={category.name}
                    onBlur={(event) =>
                      event.target.value.trim() &&
                      event.target.value !== category.name &&
                      update(category.id, { name: event.target.value.trim() })
                    }
                    className="h-9"
                  />
                  <Button variant="ghost" size="icon" aria-label={`Delete ${category.name}`} onClick={() => remove(category.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Input
                  defaultValue={category.playlist_id}
                  onBlur={(event) => {
                    const next = parsePlaylistId(event.target.value);
                    if (next && next !== category.playlist_id) update(category.id, { playlist_id: next });
                  }}
                  className="h-9 font-mono text-xs"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={category.is_active} onCheckedChange={(checked) => update(category.id, { is_active: checked })} />
                    Visible on site
                  </label>
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    Order
                    <Input
                      type="number"
                      defaultValue={category.sort_order}
                      onBlur={(event) => update(category.id, { sort_order: Number(event.target.value) || 0 })}
                      className="h-8 w-20"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
