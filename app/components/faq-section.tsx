const FAQ_ITEMS = [
  {
    question: "What does Donkey Directories help me do?",
    answer:
      "Getting listed on directories is one of the best ways to drive early traffic, but it is tedious. Donkey gives you a curated list of directories worth submitting to, lets you track where you have submitted and what the status is, and speeds up the actual submissions with a Chrome extension that fills forms for you. Instead of maintaining a messy spreadsheet and copy-pasting your product description everywhere, you get one place to manage your entire launch distribution.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. On the free plan you can browse the full directory list, add directories to your tracker, and mark submissions as done or pending. You also get a handful of one-click autofills so you can try the Chrome extension before buying. There is no time limit on the free plan, so you can use it as a plain tracking dashboard for as long as you like.",
  },
  {
    question: "How does one-click autofill work?",
    answer:
      "You fill in your product profile once inside Donkey: name, tagline, description, website, logo, and a few other common fields. When you visit a directory submission page in Chrome, the extension scans the form and maps those fields to your saved data. One click and the form is filled. It works on most popular directory sites and saves the copy-paste routine you would otherwise repeat dozens of times.",
  },
  {
    question: "Do my credits expire?",
    answer:
      "No. Credits are sold as one-time packs and have no expiry date. Buy them when you need them and use them at your own pace. Whether you submit to ten directories this week or spread it out over months, your credits will be there.",
  },
  {
    question: "Can I still submit manually?",
    answer:
      "Absolutely. The autofill is optional. You can use Donkey purely as a tracker: find directories you want to target, open the submission page yourself, fill the form however you like, and then mark it as submitted in Donkey. A lot of people start that way and add the extension once they get tired of the repetition.",
  },
  {
    question: "Who is this for?",
    answer:
      "Donkey is built for anyone doing a product launch without a big marketing team. That usually means indie founders, solo makers, and small startup teams who need consistent distribution but do not have time to research and manually submit to 50+ directories. It also works well for marketers managing launches for multiple products, since each project gets its own tracker.",
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
