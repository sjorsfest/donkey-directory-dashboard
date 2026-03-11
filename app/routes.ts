import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("brand", "routes/brand.tsx"),
  route("creators", "routes/creators.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("connect-extension", "routes/connect-extension.tsx"),
] satisfies RouteConfig;
