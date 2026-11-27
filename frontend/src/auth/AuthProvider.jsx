import { useCallback, useEffect, useMemo, useState } from "react";
import * as authService from "../services/auth";
import { getRefreshToken, onSessionExpired } from "../services/session";
import { AuthContext } from "./AuthContext";

/**
 * Fournit l'utilisateur connecté à toute l'application (US02).
 * Au démarrage, si un jeton de rafraîchissement est enregistré, la session
 * est restaurée : /api/auth/refresh/ puis /api/auth/me/ (fait par getMe,
 * faute de jeton d'accès en mémoire).
 */
export default function AuthProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: getRefreshToken() ? "loading" : "anonymous",
    user: null,
  }));

  useEffect(() => {
    // Rafraîchissement refusé, n'importe où dans l'application : déconnexion.
    return onSessionExpired(() => setState({ status: "anonymous", user: null }));
  }, []);

  useEffect(() => {
    if (!getRefreshToken()) return undefined;
    let active = true;
    authService
      .getMe()
      .then((user) => {
        if (active) setState({ status: "authenticated", user });
      })
      .catch(() => {
        // 401 : jetons déjà effacés. Erreur réseau : le jeton reste
        // enregistré, la restauration sera retentée au prochain chargement.
        if (active) setState({ status: "anonymous", user: null });
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const user = await authService.login(credentials);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ status: "anonymous", user: null });
  }, []);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
