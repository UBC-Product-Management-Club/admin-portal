import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { MemberProfile } from "~/components/member-profile";
import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { SearchField } from "~/components/search-field";
import { StatCard } from "~/components/stat-card";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { downloadCsv, toCsv } from "~/lib/csv";
import { initials, schoolYearOf } from "~/lib/format";
import { userService } from "~/lib/services/user-service";
import { STUDY_YEARS, UNIVERSITIES, type User } from "~/lib/types/user";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/members";

const PAGE_SIZE = 10;
const ALL = "all";

export async function clientLoader() {
  return { members: await userService.listUsers() };
}

export function ErrorBoundary() {
  return <RouteError />;
}

/** Search across name, email and student ID (FR-5). */
const matchesSearch: FilterFn<User> = (row, _columnId, query: string) => {
  const needle = query.trim().toLowerCase();
  const { firstName, lastName, email, studentId } = row.original;
  return [`${firstName} ${lastName}`, email, studentId ?? ""].some((value) =>
    value.toLowerCase().includes(needle),
  );
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor((member) => `${member.firstName} ${member.lastName}`, {
    id: "name",
    header: "Name",
  }),
  columnHelper.accessor("university", {
    header: "University",
    cell: (info) => info.getValue() ?? "—",
    filterFn: "equals",
  }),
  columnHelper.accessor("year", {
    header: "Year",
    cell: (info) => (info.getValue() ? `Year ${info.getValue()}` : "—"),
    filterFn: "equals",
  }),
  columnHelper.accessor(
    (member) =>
      [member.faculty, member.major].filter(Boolean).join(" · ") || "—",
    { id: "program", header: "Faculty · Major" },
  ),
];

export default function Members({ loaderData }: Route.ComponentProps) {
  const { members } = loaderData;
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(ALL);
  const [university, setUniversity] = useState(ALL);
  const [selectedId, setSelectedId] = useState(members[0]?.userId);

  const columnFilters = useMemo(
    () => [
      ...(year === ALL ? [] : [{ id: "year", value: year }]),
      ...(university === ALL ? [] : [{ id: "university", value: university }]),
    ],
    [year, university],
  );

  const table = useReactTable({
    data: members,
    columns,
    state: { globalFilter: search, columnFilters },
    globalFilterFn: matchesSearch,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    autoResetPageIndex: true,
  });

  const thisSchoolYear = schoolYearOf(new Date().toISOString());
  const filteredMembers = table
    .getFilteredRowModel()
    .rows.map((r) => r.original);
  const selected = members.find((member) => member.userId === selectedId);
  const pageRows = table.getRowModel().rows;
  const { pageIndex } = table.getState().pagination;
  const firstShown =
    filteredMembers.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const lastShown = pageIndex * PAGE_SIZE + pageRows.length;

  function handleExport() {
    downloadCsv(
      "pmc-members.csv",
      toCsv(
        [
          "First name",
          "Last name",
          "Email",
          "Pronouns",
          "University",
          "Year",
          "Faculty",
          "Major",
          "Student ID",
          "Joined",
          "Why PM?",
        ],
        filteredMembers.map((m) => [
          m.firstName,
          m.lastName,
          m.email,
          m.pronouns,
          m.university,
          m.year,
          m.faculty,
          m.major,
          m.studentId,
          m.createdAt.slice(0, 10),
          m.whyPm,
        ]),
      ),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="Members"
        description="Everyone who signed up on the membership portal."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <section
        aria-label="Summary"
        className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4"
      >
        <StatCard label="Total members" value={members.length} />
        <StatCard
          label="Joined this year"
          value={
            members.filter((m) => schoolYearOf(m.createdAt) === thisSchoolYear)
              .length
          }
        />
        <StatCard
          label="Universities"
          value={new Set(members.map((m) => m.university).filter(Boolean)).size}
        />
      </section>

      <div className="flex flex-wrap items-start gap-4">
        <section
          aria-labelledby="member-list-heading"
          className="card-surface flex min-w-0 flex-[2_1_560px] flex-col"
        >
          <h2 id="member-list-heading" className="sr-only">
            Member list
          </h2>
          <div className="flex flex-wrap items-center gap-2.5 p-4">
            <SearchField
              label="Search members"
              placeholder="Search by name, email or student ID"
              value={search}
              onChange={setSearch}
            />
            <FilterSelect
              label="Year"
              value={year}
              onChange={setYear}
              options={STUDY_YEARS.map((y) => ({ value: y, label: y }))}
            />
            <FilterSelect
              label="University"
              value={university}
              onChange={setUniversity}
              options={UNIVERSITIES.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 text-xs font-semibold text-muted-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No members match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const member = row.original;
                  const isSelected = member.userId === selectedId;
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        isSelected && "bg-selected hover:bg-selected",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
                          {cell.column.id === "name" ? (
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              aria-label={`Open profile: ${member.firstName} ${member.lastName}`}
                              onClick={() => setSelectedId(member.userId)}
                              className="flex min-h-11 w-full items-center gap-3 text-left"
                            >
                              <span
                                aria-hidden="true"
                                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
                              >
                                {initials(member.firstName, member.lastName)}
                              </span>
                              <span className="flex flex-col">
                                <span className="font-semibold">
                                  {member.firstName} {member.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.email}
                                </span>
                              </span>
                            </button>
                          ) : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-muted-foreground">
            <span aria-live="polite">
              Showing {firstShown}–{lastShown} of {filteredMembers.length}{" "}
              members
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        {selected && <MemberProfile key={selected.userId} member={selected} />}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span aria-hidden="true">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="min-w-24"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
