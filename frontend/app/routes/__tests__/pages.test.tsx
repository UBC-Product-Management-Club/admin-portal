import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { createRoutesStub, Outlet } from "react-router";

import Dashboard, { clientLoader as dashboardLoader } from "~/routes/dashboard";
import EventDetail, {
  clientLoader as eventDetailLoader,
} from "~/routes/events.$eventId";
import CreateEvent from "~/routes/events.new";
import Events, { clientLoader as eventsLoader } from "~/routes/events";
import Members, { clientLoader as membersLoader } from "~/routes/members";
import Reimbursements, {
  clientLoader as reimbursementsLoader,
} from "~/routes/reimbursements";

vi.mock("~/lib/env", () => ({
  getEnv: () => ({ VITE_USE_MOCKS: true }),
}));

const SESSION_USER = {
  firstName: "Ava",
  lastName: "Chen",
  displayName: "Ava Chen",
  email: "ava@example.ca",
};

beforeAll(() => {
  // Recharts measures its container; jsdom has no layout engine.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());

function renderPage(
  path: string,
  url: string,
  // Route modules type their props via generated +types; the stub supplies them at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader?: (args: any) => unknown,
) {
  const Stub = createRoutesStub([
    {
      id: "routes/protected-layout",
      path: "/",
      loader: () => SESSION_USER,
      Component: Outlet,
      children: [{ path, Component, loader }],
    },
  ]);
  return render(<Stub initialEntries={[url]} />);
}

describe("portal pages (mock data)", () => {
  it("dashboard greets the exec and lists upcoming events", async () => {
    renderPage("dashboard", "/dashboard", Dashboard, dashboardLoader);
    expect(await screen.findByText("Ava")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Upcoming events" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Members by year")).toBeInTheDocument();
  });

  it("members filters by search and opens a profile", async () => {
    const user = userEvent.setup();
    renderPage("members", "/members", Members, membersLoader);
    await screen.findByText("Total members");
    await user.type(
      screen.getByRole("searchbox", { name: "Search members" }),
      "Liam",
    );
    await user.click(
      screen.getByRole("button", { name: "Open profile: Liam Patel" }),
    );
    expect(
      screen.getByRole("heading", { name: "Liam Patel" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–1 of 1 members/)).toBeInTheDocument();
  });

  it("events grid shows upcoming events for this school year", async () => {
    renderPage("events", "/events", Events, eventsLoader);
    expect(await screen.findByText("PM 101 Workshop")).toBeInTheDocument();
    expect(
      screen.queryByText("Industry Speaker Panel"),
    ).not.toBeInTheDocument();
  });

  it("event details shows attendees and configuration tabs", async () => {
    const user = userEvent.setup();
    renderPage(
      "events/:eventId",
      "/events/evt-04",
      EventDetail,
      eventDetailLoader,
    );
    expect(
      await screen.findByRole("heading", { name: "Attendee data" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Configuration" }));
    expect(
      screen.getByRole("switch", { name: "Show on membership portal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update on portal" }),
    ).toBeInTheDocument();
  });

  it("create event renders the form and live preview", async () => {
    const user = userEvent.setup();
    renderPage("events/new", "/events/new", CreateEvent);
    await user.type(await screen.findByLabelText("Event name"), "Demo Night");
    expect(screen.getByLabelText("Portal preview")).toHaveTextContent(
      "Demo Night",
    );
  });

  it("reimbursements lists my requests", async () => {
    renderPage(
      "reimbursements",
      "/reimbursements",
      Reimbursements,
      reimbursementsLoader,
    );
    expect(await screen.findByText("Pizza for workshop")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit request" }),
    ).toBeInTheDocument();
  });
});
