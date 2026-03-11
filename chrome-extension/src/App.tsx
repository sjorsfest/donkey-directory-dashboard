import { useAuth } from "./hooks/useAuth";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";

export function App() {
  const { isLoading, isAuthenticated, userEmail, onLoginSuccess, logout, onSessionExpired } =
    useAuth();

  if (isLoading) {
    return (
      <div className="view" style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
        <div className="spinner-small" />
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
