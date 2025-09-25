'use client';
import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User } from '@/lib/types';

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'pfp',
    header: '',
    cell: ({ row }) => (
      <Avatar className="h-8 w-8">
        <AvatarImage src={row.getValue('pfp')} alt={row.getValue('display_name')} />
        <AvatarFallback>
          {row.original.first_name.charAt(0)}
          {row.original.last_name.charAt(0)}
        </AvatarFallback>
      </Avatar>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'display_name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue('display_name')}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.first_name} {row.original.last_name}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'pronouns',
    header: 'Pronouns',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.getValue('pronouns')}
      </Badge>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <div className="text-sm">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'university',
    header: 'University',
    cell: ({ row }) => <div className="text-sm">{row.getValue('university')}</div>,
  },
  {
    accessorKey: 'year',
    header: 'Year',
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.getValue('year')}
      </Badge>
    ),
  },
  {
    accessorKey: 'major',
    header: 'Major',
    cell: ({ row }) => <div className="text-sm">{row.getValue('major')}</div>,
  },
  {
    accessorKey: 'is_payment_verified',
    header: 'Payment',
    cell: ({ row }) => (
      <Badge
        variant={row.getValue('is_payment_verified') ? 'default' : 'destructive'}
        className="text-xs"
      >
        {row.getValue('is_payment_verified') ? 'Verified' : 'Pending'}
      </Badge>
    ),
  },
  {
    accessorKey: 'student_id',
    header: 'Student ID',
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1 py-0.5 rounded">{row.getValue('student_id')}</code>
    ),
  },
];

export default function UserDataTable({ users }: { users: User[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const data = users;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">Manage student registrations and payments</p>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search users..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
          >
            {[5, 10, 20, 30, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              First
            </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
