import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { REDIRECT_ROUTES, ROUTES, SEG } from "@/constants/routeConst";
import AuthLayout from "@/pages/auth/AuthLayout";
import AuthSelectPage from "@/pages/auth/AuthSelectPage";
import EmailLoginPage from "@/pages/auth/EmailLoginPage";
import EmailSignupPage from "@/pages/auth/EmailSignupPage";
import GuestAuthPage from "@/pages/auth/GuestAuthPage";
import GamePage from "@/pages/GamePage";
import HomePage from "@/pages/HomePage";
import LobbyPage from "@/pages/LobbyPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * All application routes. Keeps `App.tsx` limited to providers and shell.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />

        <Route path={ROUTES.AUTH} element={<AuthLayout />}>
          <Route index element={<AuthSelectPage />} />
          <Route path={SEG.GUEST} element={<GuestAuthPage />} />
          <Route path={`${SEG.EMAIL}/${SEG.LOGIN}`} element={<EmailLoginPage />} />
          <Route path={`${SEG.EMAIL}/${SEG.SIGNUP}`} element={<EmailSignupPage />} />
        </Route>

        <Route path={ROUTES.LOBBY} element={<LobbyPage />} />
        <Route path={ROUTES.GAME} element={<GamePage />} />
        <Route path={ROUTES.LEGACY_INDEX} element={<Navigate to={REDIRECT_ROUTES.HOME} replace />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
