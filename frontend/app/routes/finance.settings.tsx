import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { PageHeader } from "~/components/page-header";
import { RouteError } from "~/components/route-error";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { financeReimbursementService } from "~/lib/services/finance-reimbursement-service";
import type { Route } from "./+types/finance.settings";

export async function clientLoader() {
  return { config: await financeReimbursementService.getSettings() };
}

export function ErrorBoundary() {
  return <RouteError />;
}

export default function FinanceSettings({ loaderData }: Route.ComponentProps) {
  const [config, setConfig] = useState(loaderData.config);
  const [instructions, setInstructions] = useState(
    loaderData.config.instruction?.content ?? "",
  );
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveInstructions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingInstructions(true);
    setMessage(null);
    try {
      const instruction =
        await financeReimbursementService.updateInstructions(instructions);
      setConfig((current) => ({ ...current, instruction }));
      setMessage("Receipt instructions saved.");
    } catch {
      setMessage("Couldn’t save receipt instructions.");
    } finally {
      setSavingInstructions(false);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAddingCategory(true);
    setMessage(null);
    try {
      const category = await financeReimbursementService.addCategory({
        label: String(form.get("label") ?? ""),
        gl_code: String(form.get("gl_code") ?? ""),
      });
      setConfig((current) => ({
        ...current,
        categories: [...current.categories, category],
      }));
      event.currentTarget.reset();
      setMessage("Expense category added.");
    } catch {
      setMessage("Couldn’t add that category. Its name may already be in use.");
    } finally {
      setAddingCategory(false);
    }
  }

  async function removeCategory(categoryId: string) {
    if (
      !window.confirm(
        "Remove this category from future reimbursement requests?",
      )
    )
      return;
    setRemovingId(categoryId);
    setMessage(null);
    try {
      await financeReimbursementService.removeCategory(categoryId);
      setConfig((current) => ({
        ...current,
        categories: current.categories.filter(
          (category) => category.id !== categoryId,
        ),
      }));
      setMessage("Expense category removed from future requests.");
    } catch {
      setMessage("Couldn’t remove that category.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-6">
      <Link
        to="/finance/reimbursements"
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Finance Dashboard
      </Link>
      <PageHeader
        title="Finance settings"
        description="Manage the guidance and categories used by reimbursement requests."
      />
      <form
        onSubmit={saveInstructions}
        className="card-surface flex flex-col gap-4 p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">
            Instructions for Submitting Receipts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This openable instruction tab is shown to members when they create
            or update a request.
          </p>
        </div>
        <Textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          required
          className="min-h-32"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button disabled={savingInstructions}>
            {savingInstructions ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}{" "}
            Save instructions
          </Button>
        </div>
      </form>
      <section
        className="card-surface flex flex-col gap-5 p-6"
        aria-labelledby="expense-categories-heading"
      >
        <div>
          <h2 id="expense-categories-heading" className="text-lg font-semibold">
            Expense categories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Categories appear in the reimbursement request dropdown as “Name ·
            GL code.” Removing one preserves past tickets but hides it from new
            requests.
          </p>
        </div>
        <ul className="divide-y divide-divider rounded-lg border border-divider">
          {config.categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="font-medium">
                {category.label} · {category.gl_code}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={removingId === category.id}
                onClick={() => removeCategory(category.id)}
              >
                {removingId === category.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}{" "}
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={addCategory}
          className="grid grid-cols-[1fr_150px_auto] gap-3 border-t border-divider pt-5"
        >
          <Input
            name="label"
            required
            placeholder="Category name"
            aria-label="Category name"
          />
          <Input
            name="gl_code"
            required
            placeholder="GL code"
            aria-label="GL code"
          />
          <Button disabled={addingCategory}>
            {addingCategory ? <Loader2 className="animate-spin" /> : <Plus />}{" "}
            Add category
          </Button>
        </form>
      </section>
    </div>
  );
}
