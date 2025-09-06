import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    index("routes/Main.tsx"),
    route("authorized", "routes/Authorized.tsx"),
    layout("layouts/Authorized.tsx", [
        route("dashboard", "routes/Dashboard.tsx")
    ]),
] satisfies RouteConfig;
