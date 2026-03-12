import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("launch", "routes/launch.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
] satisfies RouteConfig;
