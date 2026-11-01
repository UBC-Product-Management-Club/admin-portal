import { useId } from "react";

import { Input } from "~/components/ui/input";
import type { DateTimeParts } from "~/lib/date-parts";

type DateTimeFieldProps = {
  legend: string;
  value: DateTimeParts;
  onChange: (value: DateTimeParts) => void;
  required?: boolean;
};

/** Separate date and time inputs, handled as UTC (HLD 3.3). */
export function DateTimeField({
  legend,
  value,
  onChange,
  required,
}: DateTimeFieldProps) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-neutral-foreground">
        {legend}{" "}
        <span className="font-normal text-muted-foreground">(UTC)</span>
      </legend>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <label htmlFor={`${id}-date`} className="sr-only">
          {legend} date
        </label>
        <Input
          id={`${id}-date`}
          type="date"
          required={required}
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
        <label htmlFor={`${id}-time`} className="sr-only">
          {legend} time
        </label>
        <Input
          id={`${id}-time`}
          type="time"
          required={required}
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
        />
      </div>
    </fieldset>
  );
}
