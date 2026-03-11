import { useState, useEffect, useCallback } from "react";
import { fetchUserInfo } from "../lib/api";
import { getTokens, clearTokens, getUserEmail } from "../lib/storage";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    userEmail: null,
  });

  const handleSessionExpired = useCallback(() => {
    setState({ isLoading: false, isAuthenticated: false, userEmail: null });
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
        });
        return;
      }

      const storedEmail = await getUserEmail();
      setState({
        isLoading: false,
        isAuthenticated: true,
        userEmail: storedEmail || user.email,
      });
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [handleSessionExpired]);

  const onLoginSuccess = useCallback((email: string) => {
    setState({ isLoading: false, isAuthenticated: true, userEmail: email });
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setState({ isLoading: false, isAuthenticated: false, userEmail: null });
  }, []);

  return {
    ...state,
    onLoginSuccess,
    logout,
    onSessionExpired: handleSessionExpired,
  };
}
