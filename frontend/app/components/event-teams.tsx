import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { DateTimeField } from "~/components/date-time-field";
import { SearchField } from "~/components/search-field";
import { StatusChip } from "~/components/status-chip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { fromDateTimeParts, toDateTimeParts } from "~/lib/date-parts";
import { formatVancouverTime } from "~/lib/format";
import { ApiError } from "~/lib/api/rest-client";
import { cn } from "~/lib/utils";
import { eventService } from "~/lib/services/event-service";
import type { EventTeam, TeamList, TeamPerson } from "~/lib/types/team";

type TeamsProps = { teams: TeamList; onTeamsChange: (teams: TeamList) => void };

/** A save that returns the event's updated teams. */
type Save = (request: () => Promise<TeamList>) => Promise<boolean>;

/** Teams tab of event details: who's on which team, and exec edits. */
export function EventTeams({ teams, onTeamsChange }: TeamsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const memberCount = teams.teams.reduce((n, t) => n + t.members.length, 0);

  const save: Save = async (request) => {
    setIsSaving(true);
    setError(null);
    try {
      onTeamsChange(await request());
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? err.message
          : "Couldn't save that change. Try again.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <TotalCard label="Teams" value={teams.teams.length} />
        <TotalCard label="On a team" value={memberCount} />
        <TotalCard label="Not on a team" value={teams.unassigned.length} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <TeamFormation teams={teams} save={save} isSaving={isSaving} />
        <NewTeam teams={teams} save={save} isSaving={isSaving} />
      </div>

      <TeamTable teams={teams} save={save} isSaving={isSaving} />
    </div>
  );
}

type SectionProps = { teams: TeamList; save: Save; isSaving: boolean };

function TeamFormation({ teams, save, isSaving }: SectionProps) {
  const [closes, setCloses] = useState(toDateTimeParts(teams.rosterLocksAt));
  const [error, setError] = useState<string | null>(null);
  const closesAt = teams.rosterLocksAt && new Date(teams.rosterLocksAt);
  const isClosed = closesAt ? closesAt <= new Date() : false;

  async function handleSave() {
    const value = fromDateTimeParts(closes);
    if (!value) {
      setError("Enter a real close date and time.");
      return;
    }
    setError(null);
    await save(() => eventService.setTeamsCloseAt(teams.eventId, value));
  }

  async function handleClear() {
    setError(null);
    if (await save(() => eventService.setTeamsCloseAt(teams.eventId, null))) {
      setCloses({ date: "", time: "" });
    }
  }

  return (
    <section
      aria-labelledby="team-formation-heading"
      className="card-surface flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="team-formation-heading" className="text-base font-semibold">
          Team formation
        </h2>
        <StatusChip tone={isClosed ? "neutral" : "success"}>
          {isClosed ? "Closed" : "Open"}
        </StatusChip>
      </div>
      <p className="text-[13px] leading-normal text-muted-foreground">
        {closesAt
          ? `Attendees can form and join teams until ${formatVancouverTime(teams.rosterLocksAt!)}.`
          : "Attendees can form and join teams until you set a close time."}{" "}
        Execs can still edit teams after it closes.
      </p>
      <DateTimeField legend="Closes" value={closes} onChange={setCloses} />
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
          Save close time
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleClear}
          disabled={isSaving || !teams.rosterLocksAt}
        >
          Clear
        </Button>
      </div>
    </section>
  );
}

type RsvpFilter = "all" | "rsvped" | "notRsvped";

function NewTeam({ teams, save, isSaving }: SectionProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<RsvpFilter>("all");
  const tooBig = selected.size > teams.maxTeamSize;
  const registeredCount = teams.unassigned.filter((p) => p.isRegistered).length;
  const filterOptions: { value: RsvpFilter; label: string }[] = [
    { value: "all", label: `All (${teams.unassigned.length})` },
    { value: "rsvped", label: `RSVP'd (${registeredCount})` },
    {
      value: "notRsvped",
      label: `Not RSVP'd (${teams.unassigned.length - registeredCount})`,
    },
  ];
  const shown = teams.unassigned.filter(
    (person) =>
      filter === "all" || person.isRegistered === (filter === "rsvped"),
  );

  function toggle(attendeeId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(attendeeId)) next.add(attendeeId);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const saved = await save(() =>
      eventService.createTeam(teams.eventId, name.trim(), [...selected]),
    );
    if (saved) {
      setName("");
      setSelected(new Set());
    }
  }

  return (
    <section
      aria-labelledby="new-team-heading"
      className="card-surface flex min-w-0 flex-[2_1_480px] flex-col gap-3.5 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="new-team-heading" className="text-base font-semibold">
          Not on a team ({teams.unassigned.length})
        </h2>
        {teams.unassigned.length > 0 && (
          <div
            role="group"
            aria-label="Filter by RSVP"
            className="flex gap-1 rounded-lg bg-muted p-1"
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground",
                  filter === option.value &&
                    "bg-card text-foreground shadow-sm",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {teams.unassigned.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          Not RSVP'd means they were accepted but haven't confirmed their spot
          yet.
        </p>
      )}
      {teams.unassigned.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Everyone attending is on a team.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No one here matches this filter.
        </p>
      ) : (
        <ul className="grid max-h-56 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-1 overflow-y-auto">
          {shown.map((person) => (
            <li key={person.attendeeId}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={selected.has(person.attendeeId)}
                  onChange={() => toggle(person.attendeeId)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm">
                    {person.name}
                    {!person.isRegistered && <NotRsvpedChip />}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {person.email}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <label htmlFor="new-team-name" className="sr-only">
          New team name
        </label>
        <Input
          id="new-team-name"
          className="h-11 flex-[1_1_200px]"
          placeholder="New team name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={isSaving || !name.trim()}>
          <Plus aria-hidden="true" />
          {selected.size > 0
            ? `Create team with ${selected.size}`
            : "Create empty team"}
        </Button>
      </form>
      {tooBig && (
        <p className="text-[13px] text-warning-foreground">
          That's more than the {teams.maxTeamSize}-person limit. You can still
          create it.
        </p>
      )}
    </section>
  );
}

function TeamTable({ teams, save, isSaving }: SectionProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const shown = teams.teams.filter(
    (team) =>
      !query ||
      [team.teamName, team.teamCode, ...team.members.map((m) => m.name)]
        .concat(team.members.map((m) => m.email))
        .some((value) => value.toLowerCase().includes(query)),
  );

  return (
    <section
      aria-labelledby="teams-heading"
      className="card-surface flex min-w-0 flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <h2 id="teams-heading" className="text-base font-semibold">
          Teams
        </h2>
        <div className="flex flex-[0_1_420px]">
          <SearchField
            label="Search teams"
            placeholder="Search teams, codes or members"
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {["Team", "Members", "Size", "Add member"].map((label) => (
              <TableHead
                key={label}
                className="px-4 text-xs font-semibold text-muted-foreground"
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {teams.teams.length === 0
                  ? "No teams have formed yet."
                  : "No teams match your search."}
              </TableCell>
            </TableRow>
          ) : (
            shown.map((team) => (
              <TeamRow
                key={team.teamId}
                team={team}
                teams={teams}
                save={save}
                isSaving={isSaving}
              />
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function TeamRow({
  team,
  teams,
  save,
  isSaving,
}: SectionProps & { team: EventTeam }) {
  const size = team.members.length;
  const sizeTone =
    size > teams.maxTeamSize || size < teams.minTeamSize
      ? "warning"
      : "neutral";

  return (
    <TableRow>
      <TableCell className="px-4 py-3 align-top">
        <TeamName team={team} teams={teams} save={save} isSaving={isSaving} />
      </TableCell>
      <TableCell className="px-4 py-3 align-top">
        {size === 0 ? (
          <span className="text-muted-foreground">No members</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {team.members.map((member) => (
              <li key={member.attendeeId} className="flex items-center gap-1">
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {member.name}
                    {!member.isRegistered && <NotRsvpedChip />}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${member.name} from ${team.teamName}`}
                  disabled={isSaving}
                  onClick={() =>
                    save(() =>
                      eventService.removeTeamMember(
                        teams.eventId,
                        team.teamId,
                        member.attendeeId,
                      ),
                    )
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 align-top">
        <StatusChip tone={sizeTone}>
          {size} / {teams.maxTeamSize}
        </StatusChip>
      </TableCell>
      <TableCell className="px-4 py-3 align-top">
        <AddMember team={team} teams={teams} save={save} isSaving={isSaving} />
      </TableCell>
    </TableRow>
  );
}

function TeamName({
  team,
  teams,
  save,
  isSaving,
}: SectionProps & { team: EventTeam }) {
  const [draft, setDraft] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = draft?.trim();
    if (!name || name === team.teamName) {
      setDraft(null);
      return;
    }
    if (
      await save(() =>
        eventService.renameTeam(teams.eventId, team.teamId, name),
      )
    ) {
      setDraft(null);
    }
  }

  if (draft !== null) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-1">
        <label htmlFor={`rename-${team.teamId}`} className="sr-only">
          Team name
        </label>
        <Input
          id={`rename-${team.teamId}`}
          autoFocus
          className="h-9 min-w-[160px]"
          maxLength={60}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          aria-label="Save team name"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Check aria-hidden="true" />
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 font-medium">
        {team.teamName}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Rename ${team.teamName}`}
          onClick={() => setDraft(team.teamName)}
        >
          <Pencil aria-hidden="true" />
        </Button>
      </span>
      {team.teamCode && (
        <span className="font-mono text-xs text-muted-foreground">
          {team.teamCode}
        </span>
      )}
    </div>
  );
}

function AddMember({
  team,
  teams,
  save,
  isSaving,
}: SectionProps & { team: EventTeam }) {
  const others = teams.teams
    .filter((t) => t.teamId !== team.teamId)
    .flatMap((t) => t.members.map((person) => ({ person, from: t.teamName })));

  function handleAdd(attendeeId: string) {
    const person = findPerson(teams, attendeeId);
    if (
      team.members.length >= teams.maxTeamSize &&
      !window.confirm(
        `${team.teamName} already has ${team.members.length} of ${teams.maxTeamSize} members. Add ${person?.name ?? "them"} anyway?`,
      )
    ) {
      return;
    }
    void save(() =>
      eventService.addTeamMember(teams.eventId, team.teamId, attendeeId),
    );
  }

  return (
    // Keyed by size so the picker resets to its placeholder after each add.
    <Select
      key={team.members.length}
      onValueChange={handleAdd}
      disabled={
        isSaving || (teams.unassigned.length === 0 && others.length === 0)
      }
    >
      <SelectTrigger
        aria-label={`Add a member to ${team.teamName}`}
        className="h-9 min-w-[180px]"
      >
        <SelectValue placeholder="Add or move someone" />
      </SelectTrigger>
      <SelectContent>
        {teams.unassigned.length > 0 && (
          <SelectGroup>
            <SelectLabel>Not on a team</SelectLabel>
            {teams.unassigned.map((person) => (
              <SelectItem key={person.attendeeId} value={person.attendeeId}>
                {person.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {others.length > 0 && (
          <SelectGroup>
            <SelectLabel>Move from another team</SelectLabel>
            {others.map(({ person, from }) => (
              <SelectItem key={person.attendeeId} value={person.attendeeId}>
                {person.name} ({from})
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

function findPerson(
  teams: TeamList,
  attendeeId: string,
): TeamPerson | undefined {
  return [...teams.unassigned, ...teams.teams.flatMap((t) => t.members)].find(
    (p) => p.attendeeId === attendeeId,
  );
}

function NotRsvpedChip() {
  return <StatusChip tone="warning">Not RSVP'd</StatusChip>;
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[28px] font-bold tracking-[-0.02em]">{value}</span>
    </div>
  );
}
