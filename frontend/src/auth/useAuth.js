import { useContext } from "react";
import { AuthContext } from "./AuthContext";

/** Accès au contexte d'authentification : { status, user, login, logout }. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  return context;
}
