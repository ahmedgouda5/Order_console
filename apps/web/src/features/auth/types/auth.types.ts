export type AuthRole = "ADMIN" | "MANAGER" | "USER" | "AGENT";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated";
