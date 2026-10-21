import { http, HttpError } from "../../../lib/http";
import type { AuthUser, LoginCredentials } from "../types/auth.types";

type LoginResponse = { user: AuthUser };
type MeResponse = { user: AuthUser };

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await http<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: credentials,
  });

  return response.user;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const response = await http<MeResponse>("/api/auth/me");
    return response.user;
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await http<null>("/api/auth/logout", { method: "POST" });
}
