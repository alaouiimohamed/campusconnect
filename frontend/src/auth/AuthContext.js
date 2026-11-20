import { createContext } from "react";

/**
 * Contexte d'authentification (US02), fourni par AuthProvider.
 * status : "loading" (session en cours de restauration), "authenticated"
 * ou "anonymous".
 */
export const AuthContext = createContext(null);
