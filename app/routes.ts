import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/_nav.tsx", [
    index("routes/home.tsx"),
    route("launch", "routes/launch.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
