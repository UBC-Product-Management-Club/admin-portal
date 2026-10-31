import { Outlet, redirect } from "react-router";

import { getSupabase } from "~/lib/supabase";

// Client-side guard only — the backend must still enforce admin auth on every endpoint.
export async function clientLoader() {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw redirect("/");
  return null;
}

export default function ProtectedLayout() {
  return <Outlet />;
}
