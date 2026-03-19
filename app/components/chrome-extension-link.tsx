import * as React from "react";
import { useRouteLoaderData } from "react-router";
import type { loader as navLoader } from "~/routes/_nav";
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
          <DialogContent className="max-w-sm">
            <DialogTitle>Extension pending approval</DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sorry! The Donkey Directories Chrome extension is currently awaiting approval from the
              Chrome Web Store. We'll have it available for install very soon — check back shortly!
            </p>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ChromeExtensionLink.displayName = "ChromeExtensionLink";
