import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

interface Props {
  isAuthenticated: boolean;
}

export function FinalCtaSection({ isAuthenticated }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-[var(--shadow-md)]">
      <div className="px-5 py-8 sm:px-8 sm:py-12 text-center relative z-10">
        <img
          src="/static/donkey.png"
          alt="Donkey logo"
          width={80}
          height={80}
          className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 object-contain"
          loading="lazy"
          decoding="async"
        />

        <h2 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
          Ready to launch in more places?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-muted-foreground">
          Build your profile once, submit faster with one click, and keep every launch directory in one
          organized dashboard.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg">
            {isAuthenticated ? (
              <Link to="/dashboard">Go to dashboard →</Link>
            ) : (
              <Link to="/signup">Start for free →</Link>
            )}
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#how-it-works">Learn how it works</a>
          </Button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          No subscription required. Pay once for credits or lifetime access.
        </p>
      </div>

      <div className="pointer-events-none absolute -top-10 -left-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-12 h-44 w-44 rounded-full bg-secondary/70 blur-3xl" />
    </section>
  );
}
