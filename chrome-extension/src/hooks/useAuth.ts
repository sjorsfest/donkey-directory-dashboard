import { useState, useEffect, useCallback } from "react";
import { fetchUserInfo } from "../lib/api";
import { getTokens, clearTokens, getUserEmail } from "../lib/storage";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  isAdmin: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    userEmail: null,
    isAdmin: false,
  });

  const handleSessionExpired = useCallback(() => {
    setState({ isLoading: false, isAuthenticated: false, userEmail: null, isAdmin: false });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const { accessToken } = await getTokens();
      if (!accessToken) {
        if (!cancelled)
          setState({
            isLoading: false,
            isAuthenticated: false,
            userEmail: null,
            isAdmin: false,
          });
        return;
      }

      const user = await fetchUserInfo(handleSessionExpired);
      if (cancelled) return;

      if (!user) {
        await clearTokens();
        setState({
          isLoading: false,
          isAuthenticated: false,
          userEmail: null,
          isAdmin: false,
        });
        return;
      }

      const storedEmail = await getUserEmail();
      const isAdmin = user.role === "admin" || user.is_superuser === true;
      setState({
        isLoading: false,
        isAuthenticated: true,
        userEmail: storedEmail || user.email,
        isAdmin,
      });
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [handleSessionExpired]);

  const onLoginSuccess = useCallback((email: string) => {
    setState({ isLoading: false, isAuthenticated: true, userEmail: email, isAdmin: false });
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setState({ isLoading: false, isAuthenticated: false, userEmail: null, isAdmin: false });
  }, []);

  return {
    ...state,
    onLoginSuccess,
    logout,
    onSessionExpired: handleSessionExpired,
  };
}
