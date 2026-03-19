import type { LoaderFunctionArgs } from "react-router";

type SitemapRoute = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: string;
};

const STATIC_PUBLIC_ROUTES: SitemapRoute[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "weekly", priority: "0.8" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
  { path: "/tos", changefreq: "monthly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.3" },
];

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const baseUrl = url.origin;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PUBLIC_ROUTES.map((route) => {
  const loc = `${baseUrl}${route.path}`;
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
}).join("\n")}
</urlset>
`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
