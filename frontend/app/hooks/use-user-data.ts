import { useRouteLoaderData } from "react-router";

import type { SessionUser } from "~/lib/session";
import type { clientLoader } from "~/routes/protected-layout";

/** The signed-in exec, loaded once by the protected layout. */
export function useUserData(): SessionUser {
  const user = useRouteLoaderData<typeof clientLoader>(
    "routes/protected-layout",
  );
  if (!user) throw new Error("useUserData must be used inside the portal");
  return user;
}
