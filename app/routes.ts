import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("pages/Main.tsx"),
    layout("layouts/Authorized.tsx", [
        route("dashboard", "pages/Dashboard.tsx"),
        route("members", "pages/Members.tsx"),
        route("events", "pages/Events.tsx"),
        route("emails", "pages/Emails.tsx"),
    ]),
] satisfies RouteConfig;
