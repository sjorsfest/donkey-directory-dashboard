import { useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { getTargetTab, toHostname } from "./lib/tab-utils";

const COMMON_SECOND_LEVEL_TLDS = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

function toBaseDomain(url?: string): string | null {
  const hostname = toHostname(url);
  if (!hostname) {
    return null;
  }

  if (
    hostname === "localhost" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  ) {
    return hostname;
  }

  const labels = hostname.split(".").filter(Boolean);
  if (labels.length <= 2) {
    return hostname;
  }

  if (COMMON_SECOND_LEVEL_TLDS.has(labels[labels.length - 2])) {
    return labels.slice(-3).join(".");
  }

  return labels.slice(-2).join(".");
}

export function App() {
  const previousBaseDomainRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let isChecking = false;

    const checkForBaseDomainChange = async () => {
      if (cancelled || isChecking) {
        return;
      }

      isChecking = true;
      try {
        const tab = await getTargetTab();
        const nextBaseDomain = toBaseDomain(tab?.url);

        if (cancelled) {
          return;
        }

        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          previousBaseDomainRef.current = nextBaseDomain;
          return;
        }

        if (nextBaseDomain === previousBaseDomainRef.current) {
          return;
        }

        previousBaseDomainRef.current = nextBaseDomain;
        window.location.reload();
      } finally {
        isChecking = false;
      }
    };

    const onTabActivated = () => {
      void checkForBaseDomainChange();
    };

    const onTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo
    ) => {
      if (!changeInfo.url && changeInfo.status !== "complete") {
        return;
      }
      void checkForBaseDomainChange();
    };

    const onWindowFocusChanged = (windowId: number) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
      }
      void checkForBaseDomainChange();
    };

    void checkForBaseDomainChange();

    chrome.tabs.onActivated.addListener(onTabActivated);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.windows.onFocusChanged.addListener(onWindowFocusChanged);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onTabActivated);
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
      chrome.windows.onFocusChanged.removeListener(onWindowFocusChanged);
    };
  }, []);

  const { isLoading, isAuthenticated, userEmail, onLoginSuccess, logout, onSessionExpired } =
    useAuth();

  if (isLoading) {
    return (
      <div className="view p-4">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <MainView
      userEmail={userEmail!}
      onLogout={logout}
      onSessionExpired={onSessionExpired}
    />
  );
}
