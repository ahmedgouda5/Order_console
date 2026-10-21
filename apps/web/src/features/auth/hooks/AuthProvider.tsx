import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext } from "./auth-context";
import type { AuthStatus, AuthUser, LoginCredentials } from "../types/auth.types";
import * as authApi from "../api/auth.api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("initializing");

  useEffect(() => {
    let cancelled = false;

    authApi
      .getSessionUser()
      .then((sessionUser) => {
        if (cancelled) {
          return;
        }

        if (sessionUser) {
          setUser(sessionUser);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const loggedUser = await authApi.login(credentials);

    setUser(loggedUser);
    setStatus("authenticated");

    return loggedUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();

    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
