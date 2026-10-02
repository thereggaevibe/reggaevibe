import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { allStoresQuery, type StoreStatus } from "@/lib/music-queries";
import { listStorePrivateFields } from "@/lib/stores.functions";

export function ArtistStoresPanel() {
  const qc = useQueryClient();
  const { data: stores = [] } = useQuery(allStoresQuery());
  const { data: privateFields = {} } = useQuery({
    queryKey: ["artist-stores", "private-fields"],
    queryFn: () => listStorePrivateFields(),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status?: StoreStatus; commission_pct?: number } }) => {
      const { error } = await supabase.from("artist_stores").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store updated");
      void qc.invalidateQueries({ queryKey: ["artist-stores"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!stores.length) return <p className="text-sm text-muted-foreground">No artists have requested a store yet.</p>;

  return (
    <div className="space-y-3">
      {stores.map((store) => (
        <div key={store.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{store.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {privateFields[store.id]?.payoutEmail ?? "no payout email"} · requested {new Date(store.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={store.status === "approved" ? "default" : "secondary"} className="uppercase">
            {store.status}
          </Badge>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Commission %
            <Input
              type="number"
              min="0"
              max="100"
              key={privateFields[store.id]?.commissionPct ?? "loading"}
              defaultValue={privateFields[store.id]?.commissionPct ?? ""}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (value !== privateFields[store.id]?.commissionPct) {
                  update.mutate({ id: store.id, patch: { commission_pct: value } });
                }
              }}
              className="w-20"
              aria-label={`Commission percentage for ${store.name}`}
            />
          </label>
          {store.status !== "approved" ? (
            <Button size="sm" onClick={() => update.mutate({ id: store.id, patch: { status: "approved" } })}>
              Approve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => update.mutate({ id: store.id, patch: { status: "rejected" } })}
            >
              Suspend
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
