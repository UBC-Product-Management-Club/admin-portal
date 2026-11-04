import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { formatMonthYear, formatShortDate, initials } from "~/lib/format";
import { userService } from "~/lib/services/user-service";
import type { BasicEvent } from "~/lib/types/event";
import type { User } from "~/lib/types/user";

const UNIVERSITY_NAMES: Record<string, string> = {
  UBC: "University of British Columbia",
  SFU: "Simon Fraser University",
  BCIT: "British Columbia Institute of Technology",
  Other: "Other",
};

type EventsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; events: BasicEvent[] };

/** Side profile panel for the selected member (FR-6). */
export function MemberProfile({ member }: { member: User }) {
  const [isCopied, setIsCopied] = useState(false);
  const [eventsState, setEventsState] = useState<EventsState>({
    status: "idle",
  });
  const fullName = `${member.firstName} ${member.lastName}`;

  async function handleCopyEmail() {
    await navigator.clipboard.writeText(member.email);
    setIsCopied(true);
  }

  async function handleShowEvents() {
    setEventsState({ status: "loading" });
    try {
      const events = await userService.listEventsAttended(member.userId);
      setEventsState({ status: "loaded", events });
    } catch {
      setEventsState({ status: "error" });
    }
  }

  return (
    <aside
      aria-labelledby="member-profile-heading"
      className="card-surface flex min-w-0 flex-[1_1_300px] flex-col gap-[18px] p-6 lg:sticky lg:top-4"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="brand-gradient flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
        >
          {initials(member.firstName, member.lastName)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="member-profile-heading" className="text-lg font-semibold">
            {fullName}
          </h2>
          <span className="truncate text-[13px] text-muted-foreground">
            {[member.pronouns, member.email].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <ProfileField
          label="University"
          value={member.university ? UNIVERSITY_NAMES[member.university] : null}
        />
        <ProfileField
          label="Year"
          value={member.year && `Year ${member.year}`}
        />
        <ProfileField label="Faculty" value={member.faculty} />
        <ProfileField label="Major" value={member.major} />
        <ProfileField label="Student ID" value={member.studentId} />
        <ProfileField
          label="Joined"
          value={member.createdAt && formatMonthYear(member.createdAt)}
        />
      </dl>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground">Why PM?</h3>
        <p className="text-sm leading-normal">{member.whyPm || "—"}</p>
      </div>

      {eventsState.status === "loaded" && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Events attended
          </h3>
          {eventsState.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events attended yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {eventsState.events.map((event) => (
                <li key={event.eventId} className="flex justify-between gap-2">
                  <Link
                    to={`/events/${event.eventId}`}
                    className="text-primary hover:underline"
                  >
                    {event.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {formatShortDate(event.startTime)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {eventsState.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          Couldn't load events attended.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopyEmail}>
          {isCopied ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          <span aria-live="polite">{isCopied ? "Copied" : "Copy email"}</span>
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleShowEvents}
          disabled={eventsState.status === "loading"}
        >
          {eventsState.status === "loading" && (
            <Loader2 aria-hidden="true" className="animate-spin" />
          )}
          Events attended
        </Button>
      </div>
    </aside>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}
