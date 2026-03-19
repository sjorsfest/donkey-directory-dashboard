import type { LoaderFunctionArgs } from "react-router";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const baseUrl = url.origin;

  const robotsText = `
User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /extensions
Disallow: /topup
Disallow: /auth/callback
Disallow: /logout

Sitemap: ${baseUrl}/sitemap.xml
`.trim();

  return new Response(robotsText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
