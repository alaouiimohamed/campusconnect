import { vi } from "vitest";

export const API = "http://api.test";

/**
 * Simule l'API : `routes` associe « MÉTHODE /chemin/ » à une réponse
 * { status, body }, à un tableau de réponses (une par appel, la dernière se
 * répète) ou à "network" (erreur réseau). Renvoie l'espion de fetch.
 */
export function mockApi(routes) {
  const calls = {};
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init = {}) => {
    const key = `${init.method ?? "GET"} ${String(url).replace(API, "")}`;
    const route = routes[key];
    if (route === undefined) throw new Error(`Requête inattendue : ${key}`);
    const index = calls[key] ?? 0;
    calls[key] = index + 1;
    const reply = Array.isArray(route)
      ? route[Math.min(index, route.length - 1)]
      : route;
    if (reply === "network") throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

/** Appels de fetch vers `key` (« MÉTHODE /chemin/ ») : [{ headers, body }]. */
export function callsTo(fetchSpy, key) {
  return fetchSpy.mock.calls
    .filter(
      ([url, init = {}]) =>
        `${init.method ?? "GET"} ${String(url).replace(API, "")}` === key,
    )
    .map(([, init = {}]) => ({
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    }));
}

export const ETUDIANT = {
  id: 1,
  first_name: "Amina",
  last_name: "Benali",
  email: "amina.benali@usms.ac.ma",
  role: "ETUDIANT",
};

export const ORGANISATEUR = {
  id: 2,
  first_name: "Youssef",
  last_name: "Alami",
  email: "contact@bde-fpk.org",
  role: "ORGANISATEUR",
};

export const TOKEN_NOT_VALID = {
  status: 401,
  body: { detail: "Token is invalid", code: "token_not_valid" },
};
