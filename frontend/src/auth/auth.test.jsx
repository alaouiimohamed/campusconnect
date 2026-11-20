import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import App from "../App";
import { getAccessToken, getRefreshToken, setTokens } from "../services/session";
import {
  ETUDIANT,
  ORGANISATEUR,
  TOKEN_NOT_VALID,
  callsTo,
  mockApi,
} from "../test/mockApi";

function renderApp(entry) {
  const user = userEvent.setup();
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [entry],
  });
  // StrictMode, comme dans main.jsx : les effets s'exécutent deux fois.
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  return { user, router };
}

/** Session enregistrée lors d'une visite précédente (seul le refresh survit). */
function storeSession(refresh = "refresh-old") {
  setTokens({ access: null, refresh });
}

function restoreOk(user) {
  return {
    "POST /api/auth/refresh/": {
      status: 200,
      body: { access: "access-new", refresh: "refresh-new" },
    },
    "GET /api/auth/me/": { status: 200, body: user },
  };
}

const LOGIN_TITLE = { level: 1, name: "Connexion" };

describe("Routes protégées", () => {
  it("/accueil sans connexion redirige vers /connexion", async () => {
    const fetchSpy = mockApi({});
    const { router } = renderApp("/accueil");

    expect(await screen.findByRole("heading", LOGIN_TITLE)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/connexion");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("/organisateur sans connexion redirige vers /connexion", async () => {
    mockApi({});
    const { router } = renderApp("/organisateur");

    expect(await screen.findByRole("heading", LOGIN_TITLE)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/connexion");
  });

  it("/organisateur est réservé aux organisateurs : un étudiant va à /accueil", async () => {
    storeSession();
    mockApi(restoreOk(ETUDIANT));
    const { router } = renderApp("/organisateur");

    expect(await screen.findByText("Bonjour Amina")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/accueil");
  });

  it("un utilisateur connecté qui ouvre /connexion va à son espace", async () => {
    storeSession();
    mockApi(restoreOk(ORGANISATEUR));
    const { router } = renderApp("/connexion");

    expect(await screen.findByText("Bonjour Youssef")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/organisateur");
  });
});

describe("Restauration de la session au démarrage", () => {
  it("rafraîchit le jeton puis charge l'utilisateur, une seule fois", async () => {
    storeSession("refresh-old");
    const fetchSpy = mockApi(restoreOk(ETUDIANT));
    renderApp("/accueil");

    expect(await screen.findByText("Bonjour Amina")).toBeInTheDocument();
    // Malgré StrictMode : un seul refresh (rotation : l'ancien jeton ne sert qu'une fois).
    const refreshCalls = callsTo(fetchSpy, "POST /api/auth/refresh/");
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0].body).toEqual({ refresh: "refresh-old" });
    for (const call of callsTo(fetchSpy, "GET /api/auth/me/")) {
      expect(call.headers.Authorization).toBe("Bearer access-new");
    }
    expect(getRefreshToken()).toBe("refresh-new");
  });

  it("refresh refusé : jetons effacés et retour à /connexion", async () => {
    storeSession();
    mockApi({ "POST /api/auth/refresh/": TOKEN_NOT_VALID });
    const { router } = renderApp("/accueil");

    expect(await screen.findByRole("heading", LOGIN_TITLE)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/connexion");
    expect(getRefreshToken()).toBeNull();
  });
});

describe("Déconnexion", () => {
  it("envoie le refresh à /logout/, efface les jetons et redirige vers /connexion", async () => {
    storeSession();
    const fetchSpy = mockApi({
      ...restoreOk(ETUDIANT),
      "POST /api/auth/logout/": { status: 200, body: {} },
    });
    const { user, router } = renderApp("/accueil");

    await user.click(await screen.findByRole("button", { name: "Déconnexion" }));

    expect(await screen.findByRole("heading", LOGIN_TITLE)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/connexion");
    expect(callsTo(fetchSpy, "POST /api/auth/logout/")[0].body).toEqual({
      refresh: "refresh-new",
    });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("efface les jetons même si /logout/ échoue", async () => {
    storeSession();
    mockApi({ ...restoreOk(ETUDIANT), "POST /api/auth/logout/": "network" });
    const { user, router } = renderApp("/accueil");

    await user.click(await screen.findByRole("button", { name: "Déconnexion" }));

    expect(await screen.findByRole("heading", LOGIN_TITLE)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/connexion");
    expect(getRefreshToken()).toBeNull();
  });
});
