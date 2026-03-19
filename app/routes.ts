import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
  route("robots.txt", "routes/robots[.]txt.tsx"),
  route("llms.txt", "routes/llms[.]txt.tsx"),
  layout("routes/_nav.tsx", [
    index("routes/home.tsx"),
    route("about", "routes/about.tsx"),
    route("dashboard", "routes/launch.tsx"),
    route("extensions", "routes/extensions.tsx"),
    route("topup", "routes/topup.tsx"),
    route("tos", "routes/tos.tsx"),
    route("privacy-policy", "routes/privacy-policy.tsx"),
  ]),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("verify-email", "routes/verify-email.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
