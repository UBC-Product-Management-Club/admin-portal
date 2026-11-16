import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table";
import { Download, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { SearchField } from "~/components/search-field";
import { StatusChip } from "~/components/status-chip";
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
import { formatVancouverTime } from "~/lib/format";
import type {
  SubmissionField,
  SubmissionList,
  TeamSubmission,
} from "~/lib/types/submission";

type StatusFilter = "all" | "submitted" | "missing";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All teams" },
  { value: "submitted", label: "Submitted" },
  { value: "missing", label: "Not submitted" },
];

const matchesFilters: FilterFn<TeamSubmission> = (
  row,
  _columnId,
  { search, status }: { search: string; status: StatusFilter },
) => {
  const team = row.original;
  if (status === "submitted" && !team.submittedAt) return false;
  if (status === "missing" && team.submittedAt) return false;
  const needle = search.trim().toLowerCase();
  return [
    team.teamName,
    ...team.members.flatMap((m) => [m.name, m.email]),
  ].some((value) => value.toLowerCase().includes(needle));
};

const columnHelper = createColumnHelper<TeamSubmission>();

function buildColumns(fields: SubmissionField[]) {
  return [
    columnHelper.accessor("teamName", {
      header: "Team",
      cell: (info) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-medium">{info.getValue()}</span>
          {info.row.original.isFinalist && (
            <StatusChip tone="success">Finalist</StatusChip>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("members", {
      header: "Members",
      cell: (info) =>
        info.getValue().length === 0 ? (
          <span className="text-muted-foreground">No members</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {info.getValue().map((member) => (
              <li key={member.email} className="flex flex-col">
                <span>{member.name}</span>
                <span className="text-xs text-muted-foreground">
                  {member.email}
                </span>
              </li>
            ))}
          </ul>
        ),
    }),
    columnHelper.accessor("submittedAt", {
      header: "Submission",
      cell: (info) => {
        const submittedAt = info.getValue();
        return submittedAt ? (
          <div className="flex flex-col items-start gap-1">
            <StatusChip tone="success">Submitted</StatusChip>
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {formatVancouverTime(submittedAt)}
            </span>
          </div>
        ) : (
          <StatusChip tone="neutral">Not submitted</StatusChip>
        );
      },
    }),
    ...fields.map((field) =>
      columnHelper.display({
        id: `field-${field.id}`,
        header: field.label,
        cell: (info) => (
          <AnswerCell
            field={field}
            values={info.row.original.answers[field.id]}
          />
        ),
      }),
    ),
  ];
}

/** Submissions tab of event details: what each team handed in, for judging. */
export function TeamSubmissions({
  eventName,
  submissions,
}: {
  eventName: string;
  submissions: SubmissionList;
}) {
  const { fields, teams } = submissions;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const columns = useMemo(() => buildColumns(fields), [fields]);
  const table = useReactTable({
    data: teams,
    columns,
    state: { globalFilter: { search, status } },
    globalFilterFn: matchesFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const rows = table.getRowModel().rows;
  const submittedCount = teams.filter((t) => t.submittedAt).length;

  function handleExport() {
    downloadCsv(
      `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-submissions.csv`,
      toCsv(
        [
          "Team",
          "Finalist",
          "Members",
          "Member emails",
          "Submitted at",
          ...fields.map((f) => f.label),
        ],
        rows.map(({ original: t }) => [
          t.teamName,
          t.isFinalist ? "Yes" : "No",
          t.members.map((m) => m.name).join("; "),
          t.members.map((m) => m.email).join("; "),
          t.submittedAt ? formatVancouverTime(t.submittedAt) : "Not submitted",
          ...fields.map((f) => (t.answers[f.id] ?? []).join("\n")),
        ]),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <TotalCard label="Teams" value={teams.length} />
        <TotalCard
          label="Submitted"
          value={submittedCount}
          total={teams.length}
        />
      </div>

      <section
        aria-labelledby="submission-data-heading"
        className="card-surface flex min-w-0 flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 id="submission-data-heading" className="text-base font-semibold">
            Team submissions
          </h2>
          <div className="flex flex-[0_1_620px] flex-wrap gap-2">
            <SearchField
              label="Search teams"
              placeholder="Search teams or members"
              value={search}
              onChange={setSearch}
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger aria-label="Submission status" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-11"
              onClick={handleExport}
              disabled={rows.length === 0}
            >
              <Download aria-hidden="true" />
              Export CSV
            </Button>
          </div>
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
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {teams.length === 0
                    ? "No teams have formed yet."
                    : "No teams match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function AnswerCell({
  field,
  values = [],
}: {
  field: SubmissionField;
  values?: string[];
}) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {values.map((value, i) =>
        /^https?:\/\//.test(value) ? (
          <a
            key={i}
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline"
          >
            {field.type === "file" ? "Open file" : "Open link"}
            {values.length > 1 && ` ${i + 1}`}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        ) : (
          <p
            key={i}
            title={value}
            className="line-clamp-3 max-w-[320px] whitespace-pre-wrap"
          >
            {value}
          </p>
        ),
      )}
    </div>
  );
}

function TotalCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[28px] font-bold tracking-[-0.02em]">
        {value}
        {total !== undefined && (
          <span className="text-sm font-medium text-muted-foreground">
            {" "}
            / {total}
          </span>
        )}
      </span>
    </div>
  );
}
