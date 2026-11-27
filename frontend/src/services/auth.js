import { ApiError, apiRequest } from "./api";
import {
  clearSession,
  expireSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./session";

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

/**
 * Connexion (US02) : POST /api/auth/login/. Enregistre les jetons et
 * renvoie l'utilisateur connecté.
 */
export async function login({ email, password }, options) {
  const data = await apiRequest("/api/auth/login/", {
    ...options,
    method: "POST",
    body: { email, password },
  });
  setTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}

/** Erreur 401 « jeton invalide ou expiré » de simplejwt (code token_not_valid). */
function isTokenNotValid(error) {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    error.data?.code === "token_not_valid"
  );
}

function sessionExpiredError(cause) {
  return new ApiError("Votre session a expiré. Reconnectez-vous.", {
    status: 401,
    cause,
  });
}

let pendingRefresh = null;

/**
 * Demande un nouveau jeton d'accès : POST /api/auth/refresh/.
 * Les appels simultanés partagent la même requête : avec la rotation, un
 * jeton de rafraîchissement ne sert qu'une fois (docs/api.md).
 * Si le serveur refuse le jeton (401), la session expire et l'utilisateur
 * est déconnecté ; une erreur réseau, elle, laisse la session intacte.
 */
export function refreshSession() {
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        expireSession();
        throw sessionExpiredError();
      }
      try {
        const data = await apiRequest("/api/auth/refresh/", {
          method: "POST",
          body: { refresh },
        });
        setTokens({ access: data.access, refresh: data.refresh });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          expireSession();
          throw sessionExpiredError(error);
        }
        throw error;
      }
    })().finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

/**
 * Requête vers un endpoint protégé, avec le jeton d'accès.
 * Sans jeton d'accès en mémoire (après un rechargement), ou sur un 401
 * token_not_valid, tente un seul rafraîchissement puis rejoue la requête ;
 * si elle est encore refusée, la session expire (déconnexion).
 */
export async function authRequest(path, options = {}) {
  if (!getAccessToken()) await refreshSession();
  try {
    return await apiRequest(path, { ...options, token: getAccessToken() });
  } catch (error) {
    if (!isTokenNotValid(error)) throw error;
  }

  await refreshSession();
  try {
    return await apiRequest(path, { ...options, token: getAccessToken() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      expireSession();
      throw sessionExpiredError(error);
    }
    throw error;
  }
}

/** Utilisateur connecté : GET /api/auth/me/. */
export function getMe(options) {
  return authRequest("/api/auth/me/", options);
}

/**
 * Déconnexion : POST /api/auth/logout/ (jeton de rafraîchissement mis en
 * liste noire), puis effacement des jetons, même si l'appel échoue.
 */
export async function logout() {
  const refresh = getRefreshToken();
  try {
    if (refresh) {
      await apiRequest("/api/auth/logout/", { method: "POST", body: { refresh } });
    }
  } catch {
    // Jeton déjà invalide ou serveur injoignable : on se déconnecte quand même.
  } finally {
    clearSession();
  }
}
