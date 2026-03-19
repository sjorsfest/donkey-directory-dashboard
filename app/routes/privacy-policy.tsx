import { Link } from "react-router";

const LEGAL_SHELL_CLASS =
  "mx-auto w-full max-w-[900px] px-4 sm:px-6 py-6 sm:py-8";
const LEGAL_CARD_CLASS = "rounded-lg border-2 border-foreground bg-card p-6 shadow-[var(--shadow-md)]";
const LEGAL_SECTION_CLASS = "space-y-2";

export function meta() {
  return [
    { title: "Privacy Policy | Donkey Directories Dashboard" },
    {
      name: "description",
      content: "Privacy Policy for using the Donkey Directories dashboard.",
    },
  ];
}

export default function PrivacyPolicyPage() {
  return (
    <div className={LEGAL_SHELL_CLASS}>
      <article className={`${LEGAL_CARD_CLASS} space-y-6`}>
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">Legal</p>
          <h1 className="m-0 text-3xl leading-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective date: March 13, 2026</p>
        </header>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">1. Information We Collect</h2>
          <p className="m-0 text-muted-foreground">
            We may collect account details (such as email), authentication data required to keep
            you signed in, and usage data needed to operate and improve the dashboard.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">2. How We Use Information</h2>
          <ul className="m-0 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Provide and maintain dashboard functionality.</li>
            <li>Secure accounts and prevent abuse.</li>
            <li>Improve reliability, performance, and user experience.</li>
            <li>Respond to support requests and legal obligations.</li>
          </ul>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">3. Sharing of Information</h2>
          <p className="m-0 text-muted-foreground">
            We do not sell personal information. Data may be shared with service providers strictly
            for operating the product, and when required by law.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">4. Data Retention</h2>
          <p className="m-0 text-muted-foreground">
            We retain data for as long as needed to provide the service, comply with legal
            obligations, resolve disputes, and enforce agreements.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">5. Security</h2>
          <p className="m-0 text-muted-foreground">
            We use reasonable administrative and technical safeguards, but no system can guarantee
            absolute security.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">6. Your Choices</h2>
          <p className="m-0 text-muted-foreground">
            You may request updates or deletion of your account information where applicable by
            contacting support.
          </p>
        </section>

        <section className={LEGAL_SECTION_CLASS}>
          <h2 className="m-0 text-xl">7. Changes to This Policy</h2>
          <p className="m-0 text-muted-foreground">
            We may revise this policy over time. Updated versions are effective when posted on this
            page.
          </p>
        </section>

        <footer className="border-t border-foreground/20 pt-4">
          <p className="m-0 text-sm text-muted-foreground">
            For privacy questions, please use the usual support channels.
          </p>
          <Link className="mt-2 inline-block text-sm font-semibold hover:underline" to="/">
            Back to home
          </Link>
        </footer>
      </article>
    </div>
  );
}
