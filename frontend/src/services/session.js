/**
 * Jetons JWT de la session (US02) :
 * - le jeton d'accès reste en mémoire (perdu au rechargement, jamais écrit
 *   sur le disque) ;
 * - le jeton de rafraîchissement est gardé dans localStorage pour restaurer
 *   la session au démarrage (voir docs/api.md, /api/auth/refresh/).
 */
const REFRESH_STORAGE_KEY = "synapse.refreshToken";

let accessToken = null;
const expiredListeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée, cookies bloqués…).
    return null;
  }
}

/** Enregistre les jetons reçus ; `refresh` est facultatif (seul l'accès change). */
export function setTokens({ access, refresh }) {
  accessToken = access ?? null;
  if (refresh) {
    try {
      localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
    } catch {
      // Stockage indisponible : la session durera le temps de l'onglet.
    }
  }
}

/** Efface les deux jetons. */
export function clearSession() {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // Rien à effacer.
  }
}

/**
 * Session expirée (rafraîchissement refusé) : efface les jetons et prévient
 * les abonnés (AuthProvider), qui déconnectent l'utilisateur.
 */
export function expireSession() {
  clearSession();
  expiredListeners.forEach((listener) => listener());
}

/** Abonne `listener` à l'expiration de la session ; renvoie la désinscription. */
export function onSessionExpired(listener) {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}
