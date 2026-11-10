/**
 * Client HTTP minimal pour l'API CampusConnect.
 * L'URL de base vient de VITE_API_URL (voir frontend/.env.example).
 */
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  /**
   * @param {string} message message lisible par l'utilisateur
   * @param {{ status?: number | null, data?: unknown, cause?: unknown }} details
   *   status est null quand le serveur n'a pas pu être joint (erreur réseau).
   */
  constructor(message, { status = null, data = null, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  get isNetworkError() {
    return this.status === null;
  }
}

/**
 * Appelle l'API et renvoie le corps JSON.
 * Lève ApiError en cas d'erreur réseau ou de réponse HTTP non 2xx.
 * Une annulation (AbortController) est propagée telle quelle.
 */
export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError("Impossible de joindre le serveur.", { cause: error });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Corps vide ou non JSON : data reste null.
  }

  if (!response.ok) {
    throw new ApiError(`Le serveur a répondu avec une erreur (${response.status}).`, {
      status: response.status,
      data,
    });
  }
  return data;
}

export function getHealth(options) {
  return apiRequest("/api/health/", options);
}
