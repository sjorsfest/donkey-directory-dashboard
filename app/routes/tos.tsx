import { Link } from "react-router";

const LEGAL_SHELL_CLASS =
  "mx-auto w-[min(900px,calc(100vw-2rem))] max-[960px]:w-[min(900px,calc(100vw-1rem))] py-8";
const LEGAL_CARD_CLASS = "rounded-lg border-2 border-foreground bg-card p-6 shadow-[var(--shadow-md)]";
const LEGAL_SECTION_CLASS = "space-y-2";

export function meta() {
  return [
    { title: "Terms of Service | Donkey Directories Dashboard" },
    {
      name: "description",
      content: "Terms of Service for using the Donkey Directories dashboard.",
    },
  ];
}

export default function TermsOfServicePage() {
  return (
    <div className={LEGAL_SHELL_CLASS}>
      <article className={`${LEGAL_CARD_CLASS} space-y-6`}>
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">Legal</p>
          <h1 className="m-0 text-3xl leading-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Effective date: March 13, 2026</p>
        </header>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">1. Acceptance of Terms</h2>
          <p className="m-0 text-muted-foreground">
            By accessing or using Donkey Directories, you agree to these Terms of Service. If you
            do not agree, do not use the service.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">2. Service Overview</h2>
          <p className="m-0 text-muted-foreground">
            Donkey Directories helps users track directory submissions and related launch workflow
            activity. Features may change over time as the product evolves.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">3. Accounts and Access</h2>
          <p className="m-0 text-muted-foreground">
            You are responsible for maintaining the confidentiality of your credentials and for all
            activities under your account. You must provide accurate registration details.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">4. Acceptable Use</h2>
          <ul className="m-0 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Do not use the service for unlawful purposes.</li>
            <li>Do not attempt to interfere with service availability or security.</li>
            <li>Do not misuse automated access in a way that harms the platform.</li>
          </ul>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">5. Intellectual Property</h2>
          <p className="m-0 text-muted-foreground">
            The Donkey Directories service, branding, and original content are owned by their
            respective owners and protected by applicable intellectual property laws.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">6. Disclaimer</h2>
          <p className="m-0 text-muted-foreground">
            The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any
            kind, to the fullest extent permitted by law.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">7. Limitation of Liability</h2>
          <p className="m-0 text-muted-foreground">
            To the maximum extent permitted by law, Donkey Directories is not liable for indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            service.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">8. Termination</h2>
          <p className="m-0 text-muted-foreground">
            Access may be suspended or terminated if these terms are violated or if required for
            legal or operational reasons.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">9. Changes to These Terms</h2>
          <p className="m-0 text-muted-foreground">
            We may update these terms from time to time. Continued use of the service after changes
            are posted means you accept the updated terms.
          </p>
        </section>

        <footer className="border-t border-foreground/20 pt-4">
          <p className="m-0 text-sm text-muted-foreground">
            Questions about these terms can be directed through the usual support channels.
          </p>
          <Link className="mt-2 inline-block text-sm font-semibold hover:underline" to="/">
            Back to home
          </Link>
        </footer>
      </article>
    </div>
  );
}
