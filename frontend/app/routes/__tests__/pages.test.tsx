import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { createRoutesStub, Outlet } from "react-router";

import { ApiError } from "~/lib/api/rest-client";
import { formatVancouverTime } from "~/lib/format";
import { eventService } from "~/lib/services/event-service";
import { reimbursementService } from "~/lib/services/reimbursement-service";
import { attendeeListSchema } from "~/lib/types/attendee";
import { basicEventListSchema } from "~/lib/types/event";
import { userListSchema } from "~/lib/types/user";
import Applicants, {
  clientLoader as applicantsLoader,
} from "~/routes/applicants";
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

const { downloadCsv } = vi.hoisted(() => ({ downloadCsv: vi.fn() }));
vi.mock("~/lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/csv")>()),
  downloadCsv,
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

  it("applicants shows written answers and saves a decision", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage("applicants", "/applicants", Applicants, applicantsLoader);

    await user.click(
      await screen.findByRole("button", {
        name: "Show application: Maya Singh",
      }),
    );
    expect(
      screen.getByText("I want to practise product thinking with a team."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open file" })).toHaveAttribute(
      "href",
      "https://example.com/resume.pdf",
    );
    expect(screen.getByText("2 of 4 waiting for review")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Accept Maya Singh" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Maya Singh"));
    expect(
      await screen.findByText("1 of 4 waiting for review"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept Maya Singh" }),
    ).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("applicants can extend an accepted applicant's deadline", async () => {
    const user = userEvent.setup();
    renderPage("applicants", "/applicants", Applicants, applicantsLoader);

    // Expected text uses the same formatter: the exact wording and UTC offset
    // depend on the runtime's locale and timezone data.
    expect(
      await screen.findByText(
        `Pay by ${formatVancouverTime("2026-11-07T07:00:00Z")}`,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Change payment deadline: Leo Park",
      }),
    );
    const date = screen.getByLabelText("New payment deadline date");
    await user.clear(date);
    await user.type(date, "2099-01-10");
    const time = screen.getByLabelText("New payment deadline time");
    await user.clear(time);
    await user.type(time, "20:00");
    // The fields are Vancouver time: 20:00 PST is 04:00 UTC the next day.
    const newDeadline = formatVancouverTime("2099-01-11T04:00:00.000Z");
    expect(newDeadline).toMatch(/\bPST\b/);

    await user.click(screen.getByRole("button", { name: "Save deadline" }));

    expect(
      await screen.findByText(`Pay by ${newDeadline}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save deadline" }),
    ).not.toBeInTheDocument();
  });

  it("applicants only offers deadlines for accepted applicants", async () => {
    renderPage("applicants", "/applicants", Applicants, applicantsLoader);

    await screen.findByRole("button", {
      name: "Change payment deadline: Leo Park",
    });
    expect(
      screen.queryByRole("button", {
        name: "Change payment deadline: Ella Wong",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Change payment deadline: Noah Tran",
      }),
    ).not.toBeInTheDocument();
  });

  it("applicants doesn't save when the reviewer cancels", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage("applicants", "/applicants", Applicants, applicantsLoader);

    await user.click(
      await screen.findByRole("button", { name: "Reject Noah Tran" }),
    );

    expect(
      screen.getByRole("button", { name: "Reject Noah Tran" }),
    ).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("dashboard still loads while reimbursements aren't built", async () => {
    const spy = vi
      .spyOn(reimbursementService, "listMyRequests")
      .mockRejectedValue(new ApiError(501, "NOT_IMPLEMENTED", "Not yet"));

    renderPage("dashboard", "/dashboard", Dashboard, dashboardLoader);

    expect(await screen.findByText("Not set up yet")).toBeInTheDocument();
    expect(screen.getByText("Members by year")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("dashboard shows an error for other reimbursement failures", async () => {
    const spy = vi
      .spyOn(reimbursementService, "listMyRequests")
      .mockRejectedValue(new ApiError(500, "INTERNAL", "Server error"));

    renderPage("dashboard", "/dashboard", Dashboard, dashboardLoader);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByText("Members by year")).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("event cards handle data the database doesn't have yet", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [event] = basicEventListSchema.parse([
      {
        event_id: "e1",
        name: "Past Event",
        type: null,
        start_time: yesterday.toISOString(),
        end_time: yesterday.toISOString(),
        location: "Sauder",
        thumbnail_url: null,
        is_disabled: false,
        going_count: 4,
        attended_count: null,
      },
    ]);
    const user = userEvent.setup();
    const spy = vi.spyOn(eventService, "listEvents").mockResolvedValue([event]);

    renderPage("events", "/events", Events, eventsLoader);

    await user.click(await screen.findByRole("tab", { name: "Past" }));

    expect(await screen.findByText("Past Event")).toBeInTheDocument();
    expect(screen.getByText("4 registered")).toBeInTheDocument();
    expect(screen.queryByText(/attended/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("event details hide check-in columns the database doesn't track", async () => {
    const spy = vi.spyOn(eventService, "listAttendees").mockResolvedValue(
      attendeeListSchema.parse([
        {
          user_id: "auth0|1",
          first_name: "Ava",
          last_name: "Chen",
          email: "ava@example.ca",
          rsvp: "going",
          paid: true,
          checked_in: null,
          food_claimed: null,
          workshop_checked_in: null,
        },
      ]),
    );

    renderPage(
      "events/:eventId",
      "/events/evt-04",
      EventDetail,
      eventDetailLoader,
    );

    expect(await screen.findByText("Ava Chen")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Payment" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Check-in" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Food claimed")).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("members load when join dates are missing", () => {
    const [member] = userListSchema.parse([
      {
        user_id: "auth0|1",
        first_name: "Ava",
        last_name: "Chen",
        email: "ava@example.ca",
        pronouns: null,
        university: "Other",
        year: null,
        faculty: null,
        major: null,
        why_pm: null,
        student_id: null,
        created_at: null,
      },
    ]);
    expect(member.createdAt).toBeNull();
  });

  it("events grid shows upcoming events for this school year", async () => {
    // Mock events are fixed dates, so pin "now" to keep the test date-independent.
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-20T12:00:00Z"),
    });
    renderPage("events", "/events", Events, eventsLoader);
    expect(await screen.findByText("PM 101 Workshop")).toBeInTheDocument();
    expect(
      screen.queryByText("Industry Speaker Panel"),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
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
    expect(
      screen.queryByRole("tab", { name: "Submissions" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Configuration" }));
    expect(
      screen.getByRole("switch", { name: "Show on membership portal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update on portal" }),
    ).toBeInTheDocument();
  });

  it("event teams lets execs create, rename and edit teams", async () => {
    const user = userEvent.setup();
    renderPage(
      "events/:eventId",
      "/events/evt-02",
      EventDetail,
      eventDetailLoader,
    );
    await user.click(await screen.findByRole("tab", { name: "Teams" }));

    expect(screen.getByText("2N2CG")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Not on a team (6)" }),
    ).toBeInTheDocument();

    // Two of the six teamless mocks were accepted but haven't RSVP'd.
    await user.click(screen.getByRole("button", { name: "Not RSVP'd (2)" }));
    const teamless = screen.getByRole("heading", { name: "Not on a team (6)" })
      .parentElement!.parentElement!;
    expect(within(teamless).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(teamless).getAllByText("Not RSVP'd")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "All (6)" }));
    expect(within(teamless).getAllByRole("checkbox")).toHaveLength(6);

    await user.click(
      screen.getByRole("button", {
        name: "Remove Noah Tran from Pocket Planners",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Not on a team (7)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Noah Tran/ }));
    await user.type(
      screen.getByRole("textbox", { name: "New team name" }),
      "Night Owls",
    );
    await user.click(
      screen.getByRole("button", { name: "Create team with 1" }),
    );
    expect(await screen.findByText("Night Owls")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Not on a team (6)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rename Night Owls" }));
    const nameInput = screen.getByRole("textbox", { name: "Team name" });
    await user.clear(nameInput);
    await user.type(nameInput, "Campus Eats{Enter}");
    expect(
      await screen.findByText(
        "Another team at this event already has that name",
      ),
    ).toBeInTheDocument();
  });

  it("event submissions lists teams and exports them for judges", async () => {
    const user = userEvent.setup();
    renderPage(
      "events/:eventId",
      "/events/evt-02",
      EventDetail,
      eventDetailLoader,
    );
    await user.click(await screen.findByRole("tab", { name: "Submissions" }));

    expect(
      screen.getByRole("heading", { name: "Team submissions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pocket Planners")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Slide deck" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Open file" })[0],
    ).toHaveAttribute("href", "https://example.com/pocket-planners.pdf");

    await user.type(
      screen.getByRole("searchbox", { name: "Search teams" }),
      "kai",
    );
    expect(screen.getByText("Study Buddies")).toBeInTheDocument();
    expect(screen.queryByText("Pocket Planners")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search teams" }));
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    const [filename, csv] = downloadCsv.mock.calls[0] as [string, string];
    expect(filename).toBe("winter-case-competition-submissions.csv");
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Team,Finalist,Members,Member emails,Submitted at,Slide deck,Prototype / demo link,Video link,Short product description",
    );
    expect(lines[1]).toContain(
      "Pocket Planners,Yes,Maya Singh; Noah Tran,maya.singh@example.ca; noah.tran@example.ca,",
    );
    expect(lines[1]).toContain("https://example.com/pocket-planners.pdf");
    expect(lines[3]).toMatch(
      /^Study Buddies,No,Kai Nguyen,.*,Not submitted,,,,$/,
    );
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
