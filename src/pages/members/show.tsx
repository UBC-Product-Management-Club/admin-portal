import { Avatar, Grid2 } from "@mui/material";
import { useShow } from "@refinedev/core";
import {
  Show,
} from "@refinedev/mui";

export const ShowUser = () => {
  const { query } = useShow({});
  const { data, isLoading } = query;
  const record = data?.data;

  const Row = ({ name, value }: { name: string; value: string }) => {
    return (
        <Grid2 container alignItems="center" spacing={2}>
            <Grid2>
                <p>{name}:</p>
            </Grid2>
            <Grid2>
                <p>{value}</p>
            </Grid2>
        </Grid2>
    )
  }

  return (
    <Show isLoading={isLoading}>
        <Grid2 container spacing={2}>
            <Grid2 size={8}>
                <Grid2 container alignItems="center" spacing={2}>
                    <Grid2>
                        {record?.pfp && <Avatar alt="pfp" src={record?.pfp.replace(/\s/g, "")} sx={{width: 100, height: 100}}/>}
                    </Grid2>
                    <Grid2 spacing={1}>
                        <h1>{record?.first_name + " " + record?.last_name} ({record?.pronouns})</h1>
                        <p>{record?.email}</p>
                    </Grid2>
                </Grid2>
                <br></br>
                <Row name={"Student ID"} value={record?.student_id}/>
                <Row name={"Faculty"} value={record?.faculty}/>
                <Row name={"Major"} value={record?.major}/>
                <Row name={"Year"} value={record?.year}/>
                <Row name={"University"} value={record?.university}/>
                <Row name={"Why PM?"} value={record?.why_pm}/>
                <Row name={"Payment verified?"} value={record?.paymentVerified ? "Yes" : "No"}/>
                <Row name={"Onboarded"} value={record?.paymentVerified ? "Yes" : "No"}/>
            </Grid2>
        </Grid2>
    </Show>
  );
};
