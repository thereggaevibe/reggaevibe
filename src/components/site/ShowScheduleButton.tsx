import { useState } from "react";
import { CalendarDays, ChevronDown, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DAY_NAMES, formatTime } from "@/lib/station-queries";

export type ScheduleSlot = { day_of_week: number; start_time: string; end_time: string };

/**
 * Roots-reggae styled "Schedule" button. Hovering (or focusing / tapping) slides a
 * dark green, gold-accented panel of weekly airtimes downward over the content;
 * leaving slides it back up and out.
 */
export function ShowScheduleButton({
  slots,
  label = "Schedule",
  className,
}: {
  slots: ScheduleSlot[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!slots.length) return null;

  return (
    <div
      className={cn("relative z-20", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-gold/40 bg-[#0d2b1d] px-3 py-2",
          "text-sm font-extrabold uppercase tracking-widest text-gold no-underline",
          "transition-colors duration-200 hover:bg-[#134028] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        )}
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4" /> {label}
        </span>
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
      </button>

      {/* In-flow panel: expands inside the box and pushes content below it down */}
      <div
        aria-hidden={!open}
        className={cn(
          "grid origin-top overflow-hidden",
          "transition-all duration-300 ease-out motion-reduce:transition-none",
          open
            ? "pointer-events-auto grid-rows-[1fr] pt-2 opacity-100"
            : "pointer-events-none grid-rows-[0fr] pt-0 opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
        <ul className="divide-y divide-gold/15 rounded-md border border-gold/30 bg-[#0d2b1d] shadow-lift">
          {slots.map((slot, index) => (
            <li
              key={`${slot.day_of_week}-${slot.start_time}-${index}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gold/90"
            >
              <Clock3 className="size-4 shrink-0 text-gold" />
              <span className="font-extrabold uppercase tracking-wide">{DAY_NAMES[slot.day_of_week]}</span>
              <span className="ml-auto tabular-nums text-gold/70">
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </div>
  );
}
