import { ArrowRight, CheckCheck, ListChecks, Zap } from "lucide-react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { ChromeExtensionLink } from "~/components/chrome-extension-link";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export type ExtensionPromptVariant = "install" | "connected_reminder";

const BENEFITS: Record<ExtensionPromptVariant, string[]> = {
  connected_reminder: [
    "Open the Chrome extension on each directory page",
    "Autofill your details without manual copy-paste",
    "Keep submissions moving faster from tab to tab",
  ],
  install: [
    "Autofill your profile fields instantly",
    "Submit more directories in less time",
    "Keep momentum with fewer manual steps",
  ],
};

const TITLES: Record<ExtensionPromptVariant, string> = {
  connected_reminder: "Your Chrome extension is connected",
  install: "Cut directory submission time with one click",
};

const DESCRIPTIONS: Record<ExtensionPromptVariant, string> = {
  connected_reminder:
    "Quick reminder: use the Chrome extension in each directory tab to speed through submissions.",
  install:
    "Stop wasting hours on manual data entry. Let the extension handle the heavy lifting for you.",
};

const DISMISS_LABELS: Record<ExtensionPromptVariant, string> = {
  connected_reminder: "Continue manually",
  install: "Not now",
};

const GIF_URL = "https://public.donkey.directory/gif/example_directory_fill.gif";

interface ExtensionPromptDialogProps {
  variant: ExtensionPromptVariant | null;
  onClose: () => void;
}

export function ExtensionPromptDialog({ variant, onClose }: ExtensionPromptDialogProps) {
  if (!variant) return null;

  const benefits = BENEFITS[variant];
  const title = TITLES[variant];
  const description = DESCRIPTIONS[variant];
  const dismissLabel = DISMISS_LABELS[variant];

  return (
    <Dialog
      open={variant !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg overflow-hidden p-0 gap-0 border-2 border-foreground">
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col"
        >
          <div className="h-1.5 bg-accent w-full" />
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader className="text-left gap-3">
              <div className="flex items-start gap-3">
                <Icon icon="logos:chrome" className="h-7 w-7 shrink-0" />
                <div className="space-y-1">
                  <DialogTitle>{title}</DialogTitle>
                  <DialogDescription>{description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <motion.ul
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.06, delayChildren: 0.08 },
                },
              }}
              className="m-0 grid gap-2 p-0"
            >
              {benefits.map((text, index) => {
                const icons = [ListChecks, Zap, CheckCheck] as const;
                const BenefitIcon = icons[index] ?? ListChecks;

                return (
                  <motion.li
                    key={text}
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="flex items-center gap-2.5 text-sm font-medium"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-secondary">
                      <BenefitIcon className="h-3.5 w-3.5" />
                    </span>
                    <span>{text}</span>
                  </motion.li>
                );
              })}
            </motion.ul>

            <DialogFooter className="gap-2 self-center">
              <Button
                variant="ghost"
                className="h-9 px-2 text-muted-foreground hover:bg-secondary-200 hover:text-foreground"
                onClick={onClose}
              >
                {dismissLabel}
              </Button>
              <Button asChild>
                <ChromeExtensionLink onClick={onClose}>
                  <Icon icon="logos:chrome" className="h-4 w-4" />
                  {variant === "connected_reminder"
                    ? "Open the Chrome extension"
                    : "Autofill My Submissions"}
                  <ArrowRight className="h-4 w-4" />
                </ChromeExtensionLink>
              </Button>
            </DialogFooter>
          </div>

          <div className="border-t-2 border-foreground">
            <img
              src={GIF_URL}
              alt="Example of the Chrome extension autofilling a directory submission"
              className="w-full"
            />
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
