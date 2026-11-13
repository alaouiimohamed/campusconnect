import { apiRequest } from "./api";

/**
 * Crée un compte (US01) : POST /api/auth/register/.
 * Le rôle n'est pas envoyé : l'API attribue ETUDIANT par défaut.
 *
 * @param {{ first_name: string, last_name: string, email: string,
 *   password: string, password_confirm: string }} payload
 */
export function register(payload, options) {
  return apiRequest("/api/auth/register/", {
    ...options,
    method: "POST",
    body: payload,
  });
}
