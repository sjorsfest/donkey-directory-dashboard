const FAQ_ITEMS = [
  {
    question: "What does Donkey Directories help me do?",
    answer:
      "Donkey helps you launch faster by giving you a curated list of directories, tracking submission progress, and autofilling forms with the Chrome extension.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. You can browse directories and track progress for free, and you get a small number of one-click form fills to try the workflow.",
  },
  {
    question: "How does one-click autofill work?",
    answer:
      "After you set up your product profile once, the extension detects common directory form fields and fills them with your saved data in seconds.",
  },
  {
    question: "Do my credits expire?",
    answer:
      "No. Credit packs are one-time purchases and currently do not expire.",
  },
  {
    question: "Can I still submit manually?",
    answer:
      "Yes. You can use Donkey as a tracking dashboard only and submit manually whenever you prefer.",
  },
  {
    question: "Who is this for?",
    answer:
      "It is built for indie founders, small teams, and marketers who want consistent launch distribution without repetitive copy-paste.",
  },
] as const;

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function FAQSection() {
  return (
    <section
      id="faq"
      className="rounded-2xl border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <div className="px-5 py-6 border-b-2 border-foreground/10 sm:px-8 sm:py-7">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          FAQ
        </p>
        <h2 className="font-heading text-2xl font-bold leading-tight">
          Frequently asked questions
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Everything you need to know about launch tracking, credits, and one-click submissions.
        </p>
      </div>

      <div className="divide-y-2 divide-foreground/10">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="px-5 py-4 sm:px-8">
            <summary className="cursor-pointer list-none font-semibold text-foreground pr-8">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
