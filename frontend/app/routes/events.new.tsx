import { Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { DateTimeField } from "~/components/date-time-field";
import { FormField } from "~/components/form-field";
import { PageHeader } from "~/components/page-header";
import { ThumbnailPicker } from "~/components/thumbnail-picker";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useObjectUrl } from "~/hooks/use-object-url";
import { fromDateTimeParts, type DateTimeParts } from "~/lib/date-parts";
import { formatDate, schoolYearOf } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type EventTrack,
  type EventType,
} from "~/lib/types/event";
import { cn } from "~/lib/utils";

const TRACK_OPTIONS: { track: EventTrack; label: string; help: string }[] = [
  {
    track: "rsvp",
    label: "Require RSVP",
    help: "Members RSVP from the membership portal",
  },
  {
    track: "payment",
    label: "Collect payment",
    help: "Track paid / unpaid per attendee",
  },
  {
    track: "food",
    label: "Food provided",
    help: "Track food claims at the door",
  },
  {
    track: "workshop",
    label: "Workshop check-in",
    help: "Separate check-in for breakout workshops",
  },
];

const EMPTY_PARTS: DateTimeParts = { date: "", time: "" };

export default function CreateEvent() {
  const id = useId();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("workshop");
  const [start, setStart] = useState(EMPTY_PARTS);
  const [end, setEnd] = useState(EMPTY_PARTS);
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [tracks, setTracks] = useState<EventTrack[]>(["rsvp", "food"]);
  const [isOnPortal, setIsOnPortal] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTime = fromDateTimeParts(start);
  const schoolYear = startTime ? schoolYearOf(startTime) : null;

  function toggleTrack(track: EventTrack, isOn: boolean) {
    setTracks((current) =>
      isOn ? [...current, track] : current.filter((t) => t !== track),
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const endTime = fromDateTimeParts(end);
    if (!startTime || !endTime) {
      setError("Enter a real start and end date and time.");
      return;
    }
    const maxAttendees = Number(capacity);
    if (!Number.isInteger(maxAttendees) || maxAttendees < 0) {
      setError("Capacity must be zero or more.");
      return;
    }

    const form = new FormData();
    form.append("name", name);
    form.append("type", type);
    form.append("start_time", startTime);
    form.append("end_time", endTime);
    form.append("location", location);
    form.append("description", description);
    form.append("max_attendees", String(maxAttendees));
    form.append("is_disabled", String(!isOnPortal));
    tracks.forEach((track) => form.append("tracks", track));
    if (thumbnail) form.append("thumbnail", thumbnail);

    setIsSaving(true);
    setError(null);
    try {
      const event = await eventService.createEvent(form);
      navigate(`/events/${event.eventId}`);
    } catch {
      setError("Couldn't create event");
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        breadcrumb={{
          to: "/events",
          label: "Events",
          current: "Create new event",
        }}
        title="Create new event"
        description="Set up the basic details. You can configure submissions and attendee tracking later in event details."
      />

      <div className="flex flex-wrap items-start gap-5">
        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-[2_1_520px] flex-col gap-5"
        >
          <section
            aria-labelledby="basic-details-heading"
            className="card-surface flex flex-col gap-4 p-5"
          >
            <h2 id="basic-details-heading" className="text-base font-semibold">
              Basic event details
            </h2>
            <FormField label="Event name" htmlFor={`${id}-name`}>
              <Input
                id={`${id}-name`}
                required
                placeholder="e.g. Product Teardown Workshop"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <FormField label="Event type" htmlFor={`${id}-type`}>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as EventType)}
                >
                  <SelectTrigger id={`${id}-type`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>
                        {EVENT_TYPE_LABELS[eventType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-foreground">
                  School year
                </span>
                <span className="flex h-11 items-center text-sm text-muted-foreground">
                  {schoolYear ?? "Set from the start date"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <DateTimeField
                legend="Start"
                required
                value={start}
                onChange={setStart}
              />
              <DateTimeField
                legend="End"
                required
                value={end}
                onChange={setEnd}
              />
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <FormField label="Location" htmlFor={`${id}-location`}>
                <Input
                  id={`${id}-location`}
                  required
                  placeholder="Building and room, or online link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </FormField>
              <FormField label="Capacity" htmlFor={`${id}-capacity`}>
                <Input
                  id={`${id}-capacity`}
                  type="number"
                  min={0}
                  step={1}
                  required
                  placeholder="Max attendees"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Description" htmlFor={`${id}-description`}>
              <Textarea
                id={`${id}-description`}
                required
                className="min-h-[110px]"
                placeholder="What members will see on the membership portal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
            <ThumbnailPicker
              currentUrl={null}
              file={thumbnail}
              onFileChange={setThumbnail}
              eventName={name}
            />
          </section>

          <section
            aria-labelledby="tracking-heading"
            className="card-surface flex flex-col gap-1 p-5"
          >
            <h2 id="tracking-heading" className="mb-2 text-base font-semibold">
              What to track
            </h2>
            {TRACK_OPTIONS.map((option) => (
              <div
                key={option.track}
                className="flex items-center gap-4 border-t border-[#F2F2F7] py-2.5"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.help}
                  </span>
                </div>
                <Switch
                  aria-label={option.label}
                  checked={tracks.includes(option.track)}
                  onCheckedChange={(isOn) => toggleTrack(option.track, isOn)}
                />
              </div>
            ))}
          </section>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-end gap-2.5">
            <Button variant="outline" asChild>
              <Link to="/events">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              {isSaving ? "Creating…" : "Create event"}
            </Button>
          </div>
        </form>

        <aside
          aria-labelledby="portal-visibility-heading"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-4"
        >
          <section className="card-surface flex flex-col gap-3.5 p-5">
            <div className="flex items-center gap-4">
              <div className="flex flex-1 flex-col gap-0.5">
                <h2
                  id="portal-visibility-heading"
                  className="text-base font-semibold"
                >
                  Membership portal
                </h2>
                <span className="text-[13px] text-muted-foreground">
                  {isOnPortal
                    ? "Visible to members once created"
                    : "Hidden. Members will not see it yet"}
                </span>
              </div>
              <Switch
                aria-label="Visible on membership portal"
                checked={isOnPortal}
                onCheckedChange={setIsOnPortal}
              />
            </div>
            <PortalPreview
              name={name}
              startTime={startTime}
              location={location}
              thumbnail={thumbnail}
              hasRsvp={tracks.includes("rsvp")}
              isDimmed={!isOnPortal}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Live preview of the membership-portal card (FR-10). */
function PortalPreview({
  name,
  startTime,
  location,
  thumbnail,
  hasRsvp,
  isDimmed,
}: {
  name: string;
  startTime: string | null;
  location: string;
  thumbnail: File | null;
  hasRsvp: boolean;
  isDimmed: boolean;
}) {
  const thumbnailUrl = useObjectUrl(thumbnail);

  return (
    <div
      aria-label="Portal preview"
      className={cn(
        "flex flex-col gap-2 rounded-[10px] border border-dashed border-input p-4 transition-opacity",
        isDimmed && "opacity-50",
      )}
    >
      <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        Portal preview
      </span>
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-[10px] bg-[#EEEDFC] text-xs text-accent-foreground">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          "Event banner"
        )}
      </div>
      <span className="text-[15px] font-semibold">{name || "Event name"}</span>
      <span className="text-[13px] text-muted-foreground">
        {startTime ? formatDate(startTime) : "Date"} · {location || "Location"}
      </span>
      {hasRsvp && (
        <span className="mt-1 self-start rounded-[10px] bg-foreground px-3.5 py-2 text-[13px] font-semibold text-background">
          RSVP
        </span>
      )}
    </div>
  );
}
