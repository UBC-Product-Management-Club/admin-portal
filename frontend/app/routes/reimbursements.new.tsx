import { Link, useNavigate } from "react-router";

import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { RequestForm, loadNewRequestForm } from "~/routes/reimbursements";
import type { Route } from "./+types/reimbursements.new";

export async function clientLoader() {
  return loadNewRequestForm();
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function NewReimbursementRequest({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <PageHeader
        title="New reimbursement request"
        description="Add the expense details and all related receipt files for Finance to review."
        breadcrumb={{
          to: "/reimbursements",
          label: "Reimbursements",
          current: "New request",
        }}
      />
      <RequestForm
        config={loaderData.config}
        events={loaderData.events}
        onSubmitted={() => navigate("/reimbursements")}
      />
      <Link
        to="/reimbursements"
        className="w-fit text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        Cancel and return to requests
      </Link>
    </div>
  );
}
