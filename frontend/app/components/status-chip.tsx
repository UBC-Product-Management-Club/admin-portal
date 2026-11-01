import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export type ChipTone = "success" | "warning" | "neutral" | "accent";

const TONE_CLASSES: Record<ChipTone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  neutral: "bg-neutral text-neutral-foreground",
  accent: "bg-accent text-accent-foreground",
};

export function StatusChip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
