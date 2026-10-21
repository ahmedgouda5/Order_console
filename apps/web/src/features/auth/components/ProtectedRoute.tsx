import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";

import { useAuth } from "../hooks/useAuth";
import { FullPageLoader } from "../../../components/ui/FullPageLoader";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "initializing") {
    return <FullPageLoader />;
  }

  if (status !== "authenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
