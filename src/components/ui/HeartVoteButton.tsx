import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

type Props = {
  voted: boolean;
  disabled?: boolean;
  label: string;
  onVote: () => void | Promise<void>;
};

export function HeartVoteButton({ voted, disabled, label, onVote }: Props) {
  const { isVip } = useSubscription();

  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={isVip && !voted ? `${label} (VIP vote counts double)` : label}
      title={isVip && !voted ? "VIP vote counts double" : undefined}
      disabled={disabled || voted}
      onClick={() => void onVote()}
      className={isVip ? "relative" : undefined}
    >
      <Heart className={voted ? "fill-rasta-red text-rasta-red" : "text-gold"} />
      {isVip && (
        <span className="absolute -right-0.5 -top-0.5 text-[8px] font-extrabold leading-none text-gold">x2</span>
      )}
    </Button>
  );
}
