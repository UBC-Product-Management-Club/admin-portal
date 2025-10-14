import type { Route } from '../+types/root';
import { useEffect, useState } from 'react';
import { useMember } from '@/hooks/useMember';
import { DataTable } from '@/components/data-table';
import type { ColumnDef, Header } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { User } from '@/lib/types/User';

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'display_name',
    header: 'Name',
    enableColumnFilter: true,
    size: 150,
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.firstName} {row.original.lastName}
      </div>
    ),
    filterFn: (row, _, filterValue) => {
      const value = row.original.firstName + ' ' + row.original.lastName;
      return String(value.toLowerCase()).includes(filterValue.toLowerCase());
    },
  },
  {
    accessorKey: 'pronouns',
    header: 'Pronouns',
    enableColumnFilter: true,
    size: 80,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.getValue('pronouns')}
      </Badge>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    size: 250,
    enableColumnFilter: true,
    cell: ({ row }) => <div className="text-sm">{row.getValue('email')}</div>,
  },
  {
    accessorKey: 'university',
    header: 'University',
    enableColumnFilter: true,
    size: 300,
    cell: ({ row }) => <div className="text-sm">{row.getValue('university')}</div>,
  },
  {
    accessorKey: 'year',
    header: 'Year',
    enableColumnFilter: true,
    size: 50,
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.getValue('year')}
      </Badge>
    ),
  },
  {
    accessorKey: 'faculty',
    header: 'Faculty',
    enableColumnFilter: true,
    size: 150,
    cell: ({ row }) => <div className="text-sm">{row.getValue('faculty')}</div>,
  },
  {
    accessorKey: 'major',
    header: 'Major',
    enableColumnFilter: true,
    size: 200,
    cell: ({ row }) => <div className="text-sm">{row.getValue('major')}</div>,
  },
  {
    accessorKey: 'isPaymentVerified',
    header: 'Payment',
    enableColumnFilter: true,
    size: 100,
    cell: ({ row }) => (
      <Badge
        variant={row.getValue('isPaymentVerified') ? 'default' : 'destructive'}
        className="text-xs"
      >
        {row.getValue('isPaymentVerified') ? 'Verified' : 'Pending'}
      </Badge>
    ),
    filterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (filterValue === undefined) return true;
      return String(value) === filterValue;
    },
  },
  {
    accessorKey: 'whyPm',
    header: 'Why PM?',
    enableColumnFilter: false,
    size: 200,
    cell: ({ row }) => <div className="text-sm">{row.getValue('whyPm')}</div>,
  },
  {
    accessorKey: 'studentId',
    header: 'Student ID',
    enableColumnFilter: true,
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1 py-0.5 rounded">{row.getValue('studentId')}</code>
    ),
    filterFn: (row, _, filterValue) => String(row.getValue('studentId')).includes(filterValue),
  },
];

const filterConfig: Record<
  string,
  { type: 'select' | 'text'; options?: { value: string; label: string }[] }
> = {
  university: {
    type: 'select',
    options: [
      { value: 'University of British Columbia', label: 'University of British Columbia' },
      { value: 'Simon Fraser University', label: 'Simon Fraser University' },
      {
        value: 'British Columbia Institute of Technology',
        label: 'British Columbia Institute of Technology',
      },
      { value: "I'm not a university student", label: "I'm not a university student" },
      { value: 'Other', label: 'Other' },
    ],
  },
  isPaymentVerified: {
    type: 'select',
    options: [
      { value: 'true', label: 'Verified' },
      { value: 'false', label: 'Pending' },
    ],
  },
  year: {
    type: 'select',
    options: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5+' },
    ],
  },
};

export default function Members({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const [userData, setUserData] = useState();
  const [error, setError] = useState('');
  const { getUsers } = useMember();

  useEffect(() => {
    getUsers()
      .then((res) => {
        console.log('getUsers() result:', res);
        setUserData(res);
      })
      .catch((e) => {
        console.error(e);
        setError(e);
      });
  }, [getUsers]);

  if (error) {
    return <h1>an error occurred!</h1>;
  }

  if (!userData) {
    return <h1>loading...</h1>;
  }

  return (
    <div className="p-6">
      <h1>Members</h1>
      <DataTable columns={columns} data={userData} filterConfig={filterConfig} />
    </div>
  );
}
