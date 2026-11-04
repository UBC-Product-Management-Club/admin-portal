import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type FilterFn,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useState } from "react";

import { SearchField } from "~/components/search-field";
import { StatusChip, type ChipTone } from "~/components/status-chip";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { downloadCsv, toCsv } from "~/lib/csv";
import type { Attendee, RsvpStatus } from "~/lib/types/attendee";

type BooleanColumn = "paid" | "checkedIn" | "foodClaimed" | "workshopCheckedIn";

const RSVP_CHIPS: Record<RsvpStatus, { label: string; tone: ChipTone }> = {
  going: { label: "Going", tone: "success" },
  maybe: { label: "Maybe", tone: "warning" },
  declined: { label: "Declined", tone: "neutral" },
};

const BOOLEAN_COLUMNS: {
  key: BooleanColumn;
  header: string;
  statLabel: string;
  yes: string;
  no: string;
}[] = [
  {
    key: "paid",
    header: "Payment",
    statLabel: "Paid",
    yes: "Paid",
    no: "Unpaid",
  },
  {
    key: "checkedIn",
    header: "Check-in",
    statLabel: "Checked in",
    yes: "Checked in",
    no: "Not yet",
  },
  {
    key: "foodClaimed",
    header: "Food claim",
    statLabel: "Food claimed",
    yes: "Claimed",
    no: "Not claimed",
  },
  {
    key: "workshopCheckedIn",
    header: "Workshop check-in",
    statLabel: "Workshop check-in",
    yes: "Checked in",
    no: "Not yet",
  },
];

const matchesSearch: FilterFn<Attendee> = (row, _columnId, query: string) => {
  const needle = query.trim().toLowerCase();
  return [row.original.name, row.original.email].some((value) =>
    value.toLowerCase().includes(needle),
  );
};

const columnHelper = createColumnHelper<Attendee>();

const columns = [
  columnHelper.accessor("name", {
    header: "Attendee",
    cell: (info) => (
      <div className="flex flex-col">
        <span className="font-medium">{info.getValue()}</span>
        <span className="text-xs text-muted-foreground">
          {info.row.original.email}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("rsvp", {
    header: "RSVP",
    cell: (info) => {
      const chip = RSVP_CHIPS[info.getValue()];
      return <StatusChip tone={chip.tone}>{chip.label}</StatusChip>;
    },
  }),
  ...BOOLEAN_COLUMNS.map(({ key, header, yes, no }) =>
    columnHelper.accessor(key, {
      header,
      cell: (info) => (
        <StatusChip tone={info.getValue() ? "success" : "neutral"}>
          {info.getValue() ? yes : no}
        </StatusChip>
      ),
    }),
  ),
];

/** Attendees tab of event details (FR-11). */
export function EventAttendees({
  eventName,
  attendees,
}: {
  eventName: string;
  attendees: Attendee[];
}) {
  const total = attendees.length;
  const [search, setSearch] = useState("");
  // Hide what isn't tracked rather than showing everyone as "Not yet".
  const trackedColumns = BOOLEAN_COLUMNS.filter(
    ({ key }) => total === 0 || attendees.some((a) => a[key] !== null),
  );
  const table = useReactTable({
    data: attendees,
    columns,
    state: {
      globalFilter: search,
      columnVisibility: Object.fromEntries(
        BOOLEAN_COLUMNS.map((c) => [c.key, trackedColumns.includes(c)]),
      ),
    },
    globalFilterFn: matchesSearch,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const rows = table.getRowModel().rows;

  function handleExport() {
    downloadCsv(
      `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-attendees.csv`,
      toCsv(
        ["Name", "Email", "RSVP", ...trackedColumns.map((c) => c.header)],
        rows.map(({ original: a }) => [
          a.name,
          a.email,
          RSVP_CHIPS[a.rsvp].label,
          ...trackedColumns.map((c) => (a[c.key] ? c.yes : c.no)),
        ]),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <TotalCard
          label="RSVP going"
          value={attendees.filter((a) => a.rsvp === "going").length}
          total={total}
        />
        {trackedColumns.map((column) => (
          <TotalCard
            key={column.key}
            label={column.statLabel}
            value={attendees.filter((a) => a[column.key]).length}
            total={total}
          />
        ))}
      </div>

      <section
        aria-labelledby="attendee-data-heading"
        className="card-surface flex min-w-0 flex-col"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 id="attendee-data-heading" className="text-base font-semibold">
            Attendee data
          </h2>
          <div className="flex flex-[0_1_420px] flex-wrap gap-2">
            <SearchField
              label="Search attendees"
              placeholder="Search attendees"
              value={search}
              onChange={setSearch}
            />
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={total === 0}
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
                  {total === 0
                    ? "No one has registered yet."
                    : "No attendees match your search."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
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

function TotalCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[28px] font-bold tracking-[-0.02em]">
        {value}
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          / {total}
        </span>
      </span>
    </div>
  );
}
