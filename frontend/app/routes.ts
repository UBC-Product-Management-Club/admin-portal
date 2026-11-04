import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),

  // Everything except login requires an authenticated session.
  layout("routes/protected-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("members", "routes/members.tsx"),
    route("events", "routes/events.tsx"),
    route("events/new", "routes/events.new.tsx"),
    route("events/:eventId", "routes/events.$eventId.tsx"),
    route("events/:eventId/attendees", "routes/events.$eventId.attendees.tsx"),
    route(
      "events/:eventId/applicants",
      "routes/events.$eventId.applicants.tsx",
    ),
    route("applicants", "routes/applicants.tsx"),
    route("emails", "routes/emails.tsx"),
    route("reimbursements", "routes/reimbursements.tsx"),
    route("budget", "routes/budget.tsx"),
  ]),
] satisfies RouteConfig;
