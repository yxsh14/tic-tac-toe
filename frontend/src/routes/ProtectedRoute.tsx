import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routeConst";
import { usePlayer } from "@/contexts/PlayerContext";
import { getValidStoredSession } from "@/services/nakama/sessionService";

type ProtectedRouteProps = {
  children: ReactElement;
};

/**
 * Requires either a persisted player profile or a valid Nakama session (profile sync may still load).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { player } = usePlayer();
  const location = useLocation();
  const hasSession = !!getValidStoredSession();

  if (!hasSession && !player) {
    return <Navigate to={ROUTES.AUTH} state={{ from: location.pathname }} replace />;
  }

  if (hasSession && !player) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring session from server…
      </div>
    );
  }

  if (!player) {
    return <Navigate to={ROUTES.AUTH} replace />;
  }

  return children;
}
