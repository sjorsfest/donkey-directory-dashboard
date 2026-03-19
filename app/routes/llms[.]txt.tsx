import type { LoaderFunctionArgs } from "react-router";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const baseUrl = url.origin;

  const llmsText = `
# llms.txt for Donkey Directories

Name: Donkey Directories
Website: ${baseUrl}
Primary URL: ${baseUrl}/
Category: Directory discovery and submission workflow tooling
Audience: Founders, marketers, and teams submitting products to directories

## What this tool is
Donkey Directories helps users discover relevant directories and manage submission workflows.
It includes a web dashboard and a Chrome extension for speeding up repeated form-filling tasks.

## Public routes
- Home: ${baseUrl}/
- About: ${baseUrl}/about
- Login: ${baseUrl}/login
- Sign up: ${baseUrl}/signup
- Terms of service: ${baseUrl}/tos
- Privacy policy: ${baseUrl}/privacy-policy

## Authenticated routes
- Dashboard: ${baseUrl}/dashboard
- Extensions: ${baseUrl}/extensions
- Top up: ${baseUrl}/topup

## Utility routes
- Auth callback: ${baseUrl}/auth/callback
- Logout: ${baseUrl}/logout

## Helpful links
- Robots file: ${baseUrl}/robots.txt
- Sitemap: ${baseUrl}/sitemap.xml
`.trim();

  return new Response(llmsText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
