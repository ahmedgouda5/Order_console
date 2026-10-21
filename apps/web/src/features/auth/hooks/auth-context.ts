import { createContext } from "react";

import type {
  AuthStatus,
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
