import { Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { DateTimeField } from "~/components/date-time-field";
import { FormField } from "~/components/form-field";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { ThumbnailPicker } from "~/components/thumbnail-picker";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { fromDateTimeParts, toDateTimeParts } from "~/lib/date-parts";
import {
  buildEventChanges,
  toEventFormValues,
  type EventFormValues,
} from "~/lib/event-form";
import {
  getSubmissionStatus,
  type SubmissionStatus,
} from "~/lib/event-submissions";
import { eventService } from "~/lib/services/event-service";
import type { Event, EventUpdatePayload } from "~/lib/types/event";

type ConfigurationProps = {
  event: Event;
  onEventChange: (event: Event) => void;
};

const SUBMISSION_TONES: Record<SubmissionStatus, ChipTone> = {
  Open: "success",
  Scheduled: "warning",
  Closed: "neutral",
};

/** Configuration tab of event details (FR-12, FR-13, plus HLD 5.2 fields). */
export function EventConfiguration({
  event,
  onEventChange,
}: ConfigurationProps) {
  return (
    <div className="flex flex-wrap items-start gap-5">
      <PortalVisibility event={event} onEventChange={onEventChange} />
      <ProjectSubmissions event={event} onEventChange={onEventChange} />
      <EventDetailsForm event={event} onEventChange={onEventChange} />
    </div>
  );
}

function PortalVisibility({ event, onEventChange }: ConfigurationProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleToggle(isOnPortal: boolean) {
    setIsSaving(true);
    setHasError(false);
    try {
      onEventChange(
        await eventService.updateEvent(event.eventId, {
          is_disabled: !isOnPortal,
        }),
      );
    } catch {
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="portal-visibility-heading"
      className="card-surface flex min-w-0 flex-[1_1_100%] items-center gap-4 p-5"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <h2 id="portal-visibility-heading" className="text-base font-semibold">
          Show on membership portal
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {event.isOnPortal
            ? "Members can see this event and RSVP."
            : "Hidden. Only admins can see this event."}
        </span>
        {hasError && (
          <span role="alert" className="text-[13px] text-destructive">
            Couldn't update visibility. Try again.
          </span>
        )}
      </div>
      <Switch
        aria-label="Show on membership portal"
        checked={event.isOnPortal}
        disabled={isSaving}
        onCheckedChange={handleToggle}
      />
    </section>
  );
}

function ProjectSubmissions({ event, onEventChange }: ConfigurationProps) {
  const [opens, setOpens] = useState(toDateTimeParts(event.submissionsOpenAt));
  const [closes, setCloses] = useState(
    toDateTimeParts(event.submissionsCloseAt),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = getSubmissionStatus(event);

  async function save(changes: EventUpdatePayload) {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await eventService.updateEvent(event.eventId, changes);
      onEventChange(updated);
      setOpens(toDateTimeParts(updated.submissionsOpenAt));
      setCloses(toDateTimeParts(updated.submissionsCloseAt));
    } catch {
      setError("Couldn't update submissions. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  /** Empty close fields mean "no close time"; partial or impossible dates are errors. */
  function parseCloses(): string | null | undefined {
    if (!closes.date && !closes.time) return null;
    return fromDateTimeParts(closes) ?? undefined;
  }

  function handleOpenNow() {
    const closesAt = parseCloses();
    if (closesAt === undefined) {
      setError("Enter a real close date and time, or leave it empty.");
      return;
    }
    save({
      submissions_open_at: new Date().toISOString(),
      submissions_close_at: closesAt,
    });
  }

  function handleSchedule() {
    const opensAt = fromDateTimeParts(opens);
    const closesAt = parseCloses();
    if (!opensAt || closesAt === undefined) {
      setError("Enter a real open date and time to schedule submissions.");
      return;
    }
    save({ submissions_open_at: opensAt, submissions_close_at: closesAt });
  }

  function handleReopen() {
    save({
      submissions_open_at: new Date().toISOString(),
      submissions_close_at: null,
    });
  }

  return (
    <section
      aria-labelledby="submissions-heading"
      className="card-surface flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="submissions-heading" className="text-base font-semibold">
          Project submissions
        </h2>
        <StatusChip tone={SUBMISSION_TONES[status]}>{status}</StatusChip>
      </div>
      <p className="text-[13px] leading-normal text-muted-foreground">
        Control when teams can submit projects through the membership portal.
      </p>
      <DateTimeField legend="Opens" value={opens} onChange={setOpens} />
      <DateTimeField legend="Closes" value={closes} onChange={setCloses} />
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          onClick={handleOpenNow}
          disabled={isSaving || status === "Open"}
        >
          Open now
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleSchedule}
          disabled={isSaving}
        >
          Schedule
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleReopen}
          disabled={isSaving || status !== "Closed" || !event.submissionsOpenAt}
        >
          Reopen
        </Button>
      </div>
    </section>
  );
}

function EventDetailsForm({ event, onEventChange }: ConfigurationProps) {
  const id = useId();
  const [values, setValues] = useState<EventFormValues>(() =>
    toEventFormValues(event),
  );
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "error" | "info";
    text: string;
  } | null>(null);

  function update<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function handleDiscard() {
    setValues(toEventFormValues(event));
    setThumbnail(null);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = buildEventChanges(event, values);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    if (Object.keys(result.changes).length === 0 && !thumbnail) {
      setMessage({ tone: "info", text: "No changes to save." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      let updated = event;
      if (Object.keys(result.changes).length > 0) {
        updated = await eventService.updateEvent(event.eventId, result.changes);
      }
      if (thumbnail) {
        updated = await eventService.replaceThumbnail(event.eventId, thumbnail);
      }
      onEventChange(updated);
      setValues(toEventFormValues(updated));
      setThumbnail(null);
      setMessage({ tone: "info", text: "Saved to the membership portal." });
    } catch {
      setMessage({ tone: "error", text: "Couldn't save changes. Try again." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="portal-details-heading"
      className="card-surface flex min-w-0 flex-[1.4_1_420px] flex-col gap-3.5 p-5"
    >
      <h2 id="portal-details-heading" className="text-base font-semibold">
        Event details on membership portal
      </h2>
      <FormField label="Event name" htmlFor={`${id}-name`}>
        <Input
          id={`${id}-name`}
          required
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </FormField>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <DateTimeField
          legend="Start"
          required
          value={values.start}
          onChange={(start) => update("start", start)}
        />
        <DateTimeField
          legend="End"
          required
          value={values.end}
          onChange={(end) => update("end", end)}
        />
      </div>
      <FormField label="Location" htmlFor={`${id}-location`}>
        <Input
          id={`${id}-location`}
          required
          value={values.location}
          onChange={(e) => update("location", e.target.value)}
        />
      </FormField>
      <FormField label="Description" htmlFor={`${id}-description`}>
        <Textarea
          id={`${id}-description`}
          required
          className="min-h-24"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </FormField>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <FormField
          label={
            <>
              Capacity{" "}
              <span className="font-normal text-muted-foreground">
                ({event.registeredCount} registered)
              </span>
            </>
          }
          htmlFor={`${id}-capacity`}
        >
          <Input
            id={`${id}-capacity`}
            type="number"
            min={0}
            step={1}
            required
            value={values.maxAttendees}
            onChange={(e) => update("maxAttendees", e.target.value)}
          />
        </FormField>
        <FormField label="Member price (CAD)" htmlFor={`${id}-member-price`}>
          <Input
            id={`${id}-member-price`}
            type="number"
            min={0}
            step={0.01}
            placeholder="Free"
            value={values.memberPrice}
            onChange={(e) => update("memberPrice", e.target.value)}
          />
        </FormField>
        <FormField
          label="Non-member price (CAD)"
          htmlFor={`${id}-non-member-price`}
        >
          <Input
            id={`${id}-non-member-price`}
            type="number"
            min={0}
            step={0.01}
            placeholder="Free"
            value={values.nonMemberPrice}
            onChange={(e) => update("nonMemberPrice", e.target.value)}
          />
        </FormField>
      </div>
      <ThumbnailPicker
        currentUrl={event.thumbnailUrl}
        file={thumbnail}
        onFileChange={(file) => {
          setThumbnail(file);
          setMessage(null);
        }}
        eventName={values.name}
      />
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleDiscard}
          disabled={isSaving}
        >
          Discard
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {isSaving ? "Saving…" : "Update on portal"}
        </Button>
      </div>
    </form>
  );
}
