import { Navigate, Outlet } from "react-router";
import { homePathFor } from "./roles";
import { useAuth } from "./useAuth";
import "./routes.css";

function SessionLoading() {
  return (
    <p className="session-loading" role="status">
      Chargement de votre session…
    </p>
  );
}

/**
 * Route protégée : sans connexion, redirige vers /connexion.
 * `role` (facultatif) réserve la route à ce rôle ; un autre utilisateur
 * connecté est renvoyé vers son propre espace.
 */
export function RequireAuth({ role }) {
  const { status, user } = useAuth();

  if (status === "loading") return <SessionLoading />;
  if (status !== "authenticated") return <Navigate to="/connexion" replace />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}

/** Pages réservées aux visiteurs (connexion) : un utilisateur connecté va à son espace. */
export function RedirectIfAuthenticated() {
  const { status, user } = useAuth();

  if (status === "loading") return <SessionLoading />;
  if (status === "authenticated") return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
