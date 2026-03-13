import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/_nav.tsx", [
    index("routes/home.tsx"),
    route("dashboard", "routes/launch.tsx"),
    route("tos", "routes/tos.tsx"),
    route("privacy-policy", "routes/privacy-policy.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
