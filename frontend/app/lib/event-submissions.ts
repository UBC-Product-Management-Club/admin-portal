import type { Event } from "~/lib/types/event";

export type SubmissionStatus = "Open" | "Scheduled" | "Closed";

/** Derives the project-submission window state shown on event details (FR-13). */
export function getSubmissionStatus(
  event: Pick<Event, "submissionsOpenAt" | "submissionsCloseAt">,
  now = new Date(),
): SubmissionStatus {
  const opensAt = event.submissionsOpenAt && new Date(event.submissionsOpenAt);
  const closesAt =
    event.submissionsCloseAt && new Date(event.submissionsCloseAt);
  if (!opensAt) return "Closed";
  if (opensAt > now) return "Scheduled";
  return closesAt && closesAt <= now ? "Closed" : "Open";
}
