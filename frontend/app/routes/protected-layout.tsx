import { Outlet, redirect, useNavigation } from "react-router";

import { AppSidebar } from "~/components/app-sidebar";
import { schoolYearOf } from "~/lib/format";
import { getSessionUser } from "~/lib/session";

// Client-side guard only — the backend must still enforce admin auth on every endpoint.
export async function clientLoader() {
  const user = await getSessionUser();
  if (!user) throw redirect("/");
  return user;
}

export default function ProtectedLayout() {
  const isNavigating = useNavigation().state === "loading";
  return (
    <div className="flex min-h-screen flex-wrap items-start gap-4 p-4 lg:flex-nowrap">
      <AppSidebar schoolYear={schoolYearOf(new Date().toISOString())} />
      <main
        aria-busy={isNavigating}
        className="min-w-0 flex-[999_1_600px] px-6 pt-6 pb-6 transition-opacity aria-busy:opacity-60"
      >
        <Outlet />
      </main>
    </div>
  );
}
