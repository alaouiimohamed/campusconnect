import { apiRequest } from "./api";

/**
 * Crée un compte (US01) : POST /api/auth/register/.
 * role vaut "ETUDIANT" (espace étudiant) ou "ORGANISATEUR" (espace
 * organisateur, avec `organisation` obligatoire).
 *
 * @param {{ first_name: string, last_name: string, email: string,
 *   password: string, password_confirm: string,
 *   role: "ETUDIANT" | "ORGANISATEUR", organisation?: string }} payload
 */
export function register(payload, options) {
  return apiRequest("/api/auth/register/", {
    ...options,
    method: "POST",
    body: payload,
  });
}
