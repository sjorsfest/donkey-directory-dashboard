import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Analytics } from "@vercel/analytics/react"
import type { Route } from "./+types/root";
import "./app.css";
import { NavigationProgress } from "./components/NavigationProgress";

const GOOGLE_FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  { rel: "preload", as: "style", href: GOOGLE_FONTS_STYLESHEET },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link
          id="google-fonts-stylesheet"
          rel="stylesheet"
          href={GOOGLE_FONTS_STYLESHEET}
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var link = document.getElementById("google-fonts-stylesheet");
                if (!link) return;
                function enableFonts() {
                  link.media = "all";
                }
                if (link.sheet) {
                  enableFonts();
                } else {
                  link.addEventListener("load", enableFonts, { once: true });
                }
              })();
            `,
          }}
        />
        <noscript>
          <link rel="stylesheet" href={GOOGLE_FONTS_STYLESHEET} />
        </noscript>
      </head>
      <body className="bg-accent-100">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            backgroundImage: "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.06) 10%, rgba(0,0,0,0.32) 35%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.32) 65%, rgba(0,0,0,0.06) 90%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.06) 10%, rgba(0,0,0,0.32) 35%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.32) 65%, rgba(0,0,0,0.06) 90%, transparent 100%)",
            maskSize: "60% 100%",
            WebkitMaskSize: "60% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            animation: "dot-wave 6s ease-in-out infinite",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <NavigationProgress />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto my-8 w-full max-w-[900px] px-4 sm:px-6">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="overflow-x-auto rounded-lg border-2 border-foreground bg-card p-4 font-['IBM_Plex_Mono',monospace] shadow-[var(--shadow-md)]">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
