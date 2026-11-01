import { dayOfMonth, monthAbbreviation } from "~/lib/format";

/** Calendar tile: month strip over the day number. */
export function DateBadge({ iso }: { iso: string }) {
  return (
    <span className="flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-border bg-background">
      <span className="brand-gradient w-full py-0.5 text-center text-[10px] font-semibold tracking-[0.05em] text-white uppercase">
        {monthAbbreviation(iso)}
      </span>
      <span className="py-1 text-lg leading-none font-semibold text-foreground">
        {dayOfMonth(iso)}
      </span>
    </span>
  );
}
