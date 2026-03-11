import { useAuth } from "./hooks/useAuth";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function App() {
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
