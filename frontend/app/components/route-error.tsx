import { isRouteErrorResponse, useRouteError } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ApiError } from "~/lib/api/rest-client";

/** Page-level error view; the sidebar stays usable around it. */
export function RouteError() {
  const error = useRouteError();
  const notFound =
    (error instanceof ApiError && error.status === 404) ||
    (isRouteErrorResponse(error) && error.status === 404);

  return (
    <div className="mx-auto w-full max-w-xl pt-10">
      <Alert variant="destructive">
        <AlertTitle>{notFound ? "Not found" : "An error occurred!"}</AlertTitle>
        <AlertDescription>
          {notFound
            ? "We couldn't find what you were looking for."
            : error instanceof Error
              ? error.message
              : "Please try again."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
