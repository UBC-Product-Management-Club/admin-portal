import { Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { redirect, useNavigate } from "react-router";

import { FormField } from "~/components/form-field";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getSessionUser } from "~/lib/session";
import { getSupabase } from "~/lib/supabase";

// Applicants is the only page with a real backend so far; the dashboard's
// endpoints still return 501. Point this back at /dashboard once they exist.
const HOME_PATH = "/applicants";

export async function clientLoader() {
  if (await getSessionUser()) throw redirect(HOME_PATH);
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setHasError(false);
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    if (error) {
      setHasError(true);
      return;
    }
    navigate(HOME_PATH, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <div className="card-surface flex w-full max-w-[400px] flex-col gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/pmc-logo.png"
            alt="UBC PMC logo"
            className="h-14 w-16 object-contain"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold tracking-[-0.02em]">
              PMC Internal Tool
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your PMC account.
            </p>
          </div>
        </div>

        {hasError && (
          <Alert variant="destructive">
            <AlertDescription>Authentication error!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Email" htmlFor={`${id}-email`}>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" htmlFor={`${id}-password`}>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading && (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            )}
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
