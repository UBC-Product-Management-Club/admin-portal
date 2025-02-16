import { DataGrid, GridToolbar, type GridColDef } from "@mui/x-data-grid";
import { useGo, useMany } from "@refinedev/core";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useDataGrid,
} from "@refinedev/mui";
import React from "react";

export const MembersList = () => {
  const { dataGridProps } = useDataGrid({});

  const go = useGo();

  const { data: users, isLoading: isLoading} = useMany({
    resource: "users",
    ids:
      dataGridProps?.rows
        ?.map((item: any) => item?.category?.id)
        .filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!dataGridProps?.rows,
    },
  });

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "first_name",
        headerName: "First name",
        type: "string",
        minWidth: 50,
        display: "flex",
        align: "left",
        headerAlign: "left",
      },
      {
        field: "last_name",
        headerName: "Last name",
        type: "string",
        minWidth: 50,
      },
      {
        field: "displayName",
        headerName: "Display name",
        type: "string",
        minWidth: 200,
      },
      {
        field: "pronouns",
        headerName: "Pronouns",
        type: "string",
        minWidth: 100,
      },
      {
        field: "email",
        headerName: "Email",
        type: "string",
        minWidth: 200,
      },
      { 
        field: "university",
        headerName: "University",
        type: "string",
        minWidth: 200,
      },
      {
        field: "student_id",
        headerName: "Student ID",
        type: "string",
        minWidth: 100,
      }, 
      {
        field: "year",
        headerName: "Year",
        type: "string",
        minWidth: 50,
        resizable: false
      },
      {
        field: "faculty",
        headerName: "Faculty",
        type: "string",
        minWidth: 200,
      },
      {
        field: "major",
        headerName: "Major",
        type: "string",
        minWidth: 200,
      },
      {
        field: "why_pm",
        headerName: "Why PM?",
        type: "string",
        minWidth: 100,
        resizable: true,
      },
      { 
        field: "returning_member",
        headerName: "Returning member?",
        minWidth: 50,
      },
      {
        field: "paymentVerified",
        headerName: "Payment verified?",
        minWidth: 50,
      },
      {
        field: "onboarded",
        headerName: "Onboarded?",
        minWidth: 50,
      }

    ],
    [users, isLoading]
  );

  return (
    <List>
      <DataGrid slots={{ toolbar: GridToolbar }} 
      getRowId={(user) => user.id} 
      columns={columns} 
      {...dataGridProps} 
      onRowClick={({row}) => go({
        to: {
            resource: 'users',
            action: 'show',
            id: row.id
        }
      })}
      />
    </List>
  );
};
