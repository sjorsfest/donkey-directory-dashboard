import { Link } from "react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function meta() {
  return [
    { title: "Payment cancelled | Donkey Directories" },
    { name: "description", content: "Your payment was cancelled. No charges were made." },
  ];
}

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-white shadow-[var(--shadow-md)] overflow-hidden">

        {/* Terracotta top stripe */}
        <div className="h-2 bg-accent w-full" />

        <div className="px-8 py-10 flex flex-col items-center text-center gap-6">

          {/* Icon */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-accent/15 border-2 border-foreground shadow-[var(--shadow-md)] flex items-center justify-center">
              <XCircle className="w-12 h-12 text-foreground" strokeWidth={2} />
            </div>
          </div>

          {/* Copy */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Billing
            </p>
            <h1 className="font-heading text-3xl font-bold leading-tight">
              Payment cancelled
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              No charges were made. You can try again whenever you're ready —
              your account is unchanged.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 w-full pt-2">
            <Button
              asChild
              className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all font-semibold"
            >
              <Link to="/topup">Try again</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all font-semibold"
            >
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t-2 border-foreground/10 bg-secondary/60 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Stripe · Secure payment
          </p>
        </div>
      </div>

      {/* Wordmark below card */}
      <p className="mt-8 text-sm font-bold font-heading tracking-wide text-foreground/40">
        Donkey Directories
      </p>
    </div>
  );
}
