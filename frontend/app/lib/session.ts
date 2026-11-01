import { getEnv } from "~/lib/env";
import { getSupabase } from "~/lib/supabase";

export type SessionUser = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
};

/**
 * The signed-in exec, or null when there's no session. VITE_SKIP_AUTH is a
 * login bypass for local UI work; `import.meta.env.DEV` is false in production
 * builds, so it can never skip auth on a deployed portal.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Inline DEV check so production builds drop this branch entirely.
  if (import.meta.env.DEV && getEnv().VITE_SKIP_AUTH) {
    return {
      firstName: "Dev",
      lastName: "Exec",
      displayName: "Dev Exec",
      email: "dev.exec@example.ca",
    };
  }

  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return null;

  const metadata = user.user_metadata as Record<string, unknown>;
  const firstName =
    typeof metadata.first_name === "string"
      ? metadata.first_name
      : user.email.split("@")[0];
  const lastName =
    typeof metadata.last_name === "string" ? metadata.last_name : "";

  return {
    firstName,
    lastName,
    displayName: lastName ? `${firstName} ${lastName}` : firstName,
    email: user.email,
  };
}

export async function signOut(): Promise<void> {
  if (import.meta.env.DEV && getEnv().VITE_SKIP_AUTH) return;
  await getSupabase().auth.signOut();
}
