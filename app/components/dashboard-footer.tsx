import { useState } from "react";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import type { loader as navLoader } from "~/routes/_nav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

const FOOTER_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const FOOTER_LINK_CLASS =
  "text-sm font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground";
const DONKEY_LOGO_SRC = "/static/donkey-128.webp";
const DONKEY_LOGO_SRC_SET =
  "/static/donkey-64.webp 64w, /static/donkey-128.webp 128w, /static/donkey-192.webp 192w";

const DONKEY_SUPPORT_URL =
  "https://donkey.support/?utm_source=donkey_directories&utm_medium=footer&utm_campaign=partner_referral&utm_content=donkey_support";
const DONKEY_SEO_URL =
  "https://donkeyseo.io/?utm_source=donkey_directories&utm_medium=footer&utm_campaign=partner_referral&utm_content=donkey_seo";

const EXTERNAL_BADGES = [
  {
    href: "https://toolprism.com",
    src: "https://toolprism.com/assets/images/badge.png",
    alt: "Tool Prism",
  },
  {
    href: "https://milliondothomepage.com/product/donkey-directories",
    src: "https://milliondothomepage.com/assets/images/badge.png",
    alt: "Badge",
  },

  {
    href: "https://toptrendtools.com",
    src: "https://toptrendtools.com/assets/images/badge.png",
    alt: "Top Trend Tools",
  },
  {
    href: "https://trustiner.com",
    src: "https://trustiner.com/assets/images/badge.png",
    alt: "Trustiner",
  },
  {
    href: "https://turbo0.com/item/donkey-directories",
    src: "https://img.turbo0.com/badge-listed-light.svg",
    alt: "Listed on Turbo0",
  }
];

export function DashboardFooter() {
  const navData = useRouteLoaderData<typeof navLoader>("routes/_nav");
  const isAuthenticated = navData?.isAuthenticated ?? false;
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <footer className="mt-10 border-t-2 border-foreground/25 bg-secondary-100">
      <div className={`${FOOTER_CONTAINER_CLASS} py-8`}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))]">
          <div className="space-y-2">
            <Link className="group inline-flex items-center gap-2 no-underline" to="/">
              <img
                src={DONKEY_LOGO_SRC}
                srcSet={DONKEY_LOGO_SRC_SET}
                sizes="36px"
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
                className="block h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <strong className="font-[Fredoka,_Nunito,_ui-sans-serif,_system-ui,_sans-serif] text-xl tracking-[-0.02em] text-primary [-webkit-text-stroke:2px_hsl(var(--foreground))] [paint-order:stroke_fill]">
                Donkey Directories
              </strong>
            </Link>
            <p className="max-w-[36ch] text-sm text-muted-foreground">
              Directory launch tracking and fast submission workflows, all in one dashboard.
            </p>
            {isHomePage && (
              <div className="flex flex-wrap gap-2 pt-1">
                {EXTERNAL_BADGES.map((badge) => (
                  <a
                    key={badge.href}
                    href={badge.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-70 transition-opacity hover:opacity-100"
                  >
                    <img
                      src={badge.src}
                      alt={badge.alt}
                      height={28}
                      className="h-[28px] w-auto object-contain"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Navigation
            </p>
            <div className="grid gap-2">
              <Link className={FOOTER_LINK_CLASS} to="/">
                Home
              </Link>
              <Link className={FOOTER_LINK_CLASS} to="/about">
                About
              </Link>
              <Link className={FOOTER_LINK_CLASS} to="/dashboard">
                Submission Tracker
              </Link>
              {isAuthenticated ? (
                <button
                  className={`${FOOTER_LINK_CLASS} cursor-pointer text-left`}
                  onClick={() => setSubmitDialogOpen(true)}
                >
                  Submit your directory
                </button>
              ) : (
                <Link className={FOOTER_LINK_CLASS} to="/login">
                  Submit your directory
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Built for
            </p>
            <div className="grid gap-2">
              <Link className={FOOTER_LINK_CLASS} to="/indie-hackers">
                Indie Hackers
              </Link>
              <Link className={FOOTER_LINK_CLASS} to="/ai-builders">
                AI Builders
              </Link>
              <Link className={FOOTER_LINK_CLASS} to="/saas-founders">
                SaaS Founders
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Legal
            </p>
            <div className="grid gap-2">
              <Link className={FOOTER_LINK_CLASS} to="/tos">
                Terms of Service
              </Link>
              <Link className={FOOTER_LINK_CLASS} to="/privacy-policy">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
              Partners
            </p>
            <div className="grid gap-2">
              <a
                href={DONKEY_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-md border-l-2 border-[#C3F73A] py-0.5 pl-2.5 text-sm font-semibold text-foreground no-underline transition-all duration-200 hover:scale-[1.03] hover:border-l-[3px] hover:bg-[#C3F73A]/15 hover:text-foreground"
              >
                Donkey Support
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 group-hover:scale-110">↗</span>
              </a>
              <a
                href={DONKEY_SEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-md border-l-2 border-[#FFCD38] py-0.5 pl-2.5 text-sm font-semibold text-foreground no-underline transition-all duration-200 hover:scale-[1.03] hover:border-l-[3px] hover:bg-[#FFCD38]/15 hover:text-foreground"
              >
                Donkey Seo
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 group-hover:scale-110">↗</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-7 border-t border-foreground/20 pt-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Donkey Directories. All rights reserved.
          </p>
        </div>
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Got a directory to add? 🐴</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We're cooking up a proper self-serve flow, but it's not quite ready yet.
            </p>
            <p className="text-sm text-muted-foreground">
              In the meantime, just tap the chat bubble in the bottom right corner and we'll get you sorted. Fast.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
