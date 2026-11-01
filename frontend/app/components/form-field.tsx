import type { ReactNode } from "react";

import { Label } from "~/components/ui/label";

/** Visible label above its control; pass the control's id as htmlFor. */
export function FormField({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-neutral-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
