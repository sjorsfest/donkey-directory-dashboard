import * as React from "react";
import { useRouteLoaderData } from "react-router";
import type { loader as navLoader } from "~/routes/_nav";
import { Icon } from "@iconify/react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

interface ChromeExtensionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode;
}

export const ChromeExtensionLink = React.forwardRef<HTMLAnchorElement, ChromeExtensionLinkProps>(
  ({ onClick, children, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const navData = useRouteLoaderData<typeof navLoader>("routes/_nav");
    const url = navData?.chromeExtensionUrl ?? null;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!url) {
        e.preventDefault();
        setOpen(true);
      }
      onClick?.(e);
    };

    return (
      <>
        <a
          ref={ref}
          href={url || "#"}
          target={url ? "_blank" : undefined}
          rel={url ? "noopener noreferrer" : undefined}
          onClick={handleClick}
          {...props}
        >
          {children}
        </a>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm overflow-hidden p-0 gap-0 border-2 border-foreground">
            {/* Lime accent bar */}
            <div className="h-1.5 bg-accent w-full" />
            <div className="p-6 flex flex-col gap-4">
              {/* Icon + title row */}
              <div className="flex items-start gap-3">
                <Icon icon="logos:chrome" className="size-8 shrink-0" />
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-base font-extrabold leading-tight">
                    Pending Chrome Web Store approval
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Almost there!
                  </p>
                </div>
              </div>

              {/* Body */}
              <p className="text-sm leading-relaxed text-foreground/80">
                We submitted the extension and are just waiting on Google's review.
                It won't be long, so check back very soon! 🚀
              </p>

              {/* Footer note */}
              <p className="text-xs text-muted-foreground border-t border-foreground/10 pt-3">
                Sorry for the wait. We appreciate your patience 🙏
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ChromeExtensionLink.displayName = "ChromeExtensionLink";
