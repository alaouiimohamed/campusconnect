import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import App from "../App";
import { getAccessToken } from "../services/session";
import { ETUDIANT, ORGANISATEUR, callsTo, mockApi } from "../test/mockApi";

const BANNER = "Votre compte a été créé. Vous pouvez maintenant vous connecter.";
const MOT_DE_PASSE = "Campus-Connect-2026!";

function renderApp(entry = "/connexion") {
  const user = userEvent.setup();
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [entry],
  });
  const view = render(<RouterProvider router={router} />);
  return { user, router, ...view };
}

async function signIn(user, email = ETUDIANT.email, password = MOT_DE_PASSE) {
  if (email) await user.type(screen.getByLabelText("Adresse e-mail"), email);
  if (password) await user.type(screen.getByLabelText("Mot de passe"), password);
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
}

function loginOk(user) {
  return { status: 200, body: { access: "access-1", refresh: "refresh-1", user } };
}

describe("LoginPage – bandeau après inscription", () => {
  it("affiche le bandeau quand l'état accountCreated est présent", () => {
    renderApp({ pathname: "/connexion", state: { accountCreated: true } });

    expect(screen.getByRole("status")).toHaveTextContent(BANNER);
    expect(
      screen.getByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas de bandeau sans cet état", () => {
    renderApp("/connexion");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  it("retire l'état de l'historique : pas de bandeau après rechargement", async () => {
    const { router, unmount } = renderApp({
      pathname: "/connexion",
      state: { accountCreated: true },
    });

    // L'état est effacé de l'entrée d'historique, le bandeau reste affiché.
    await waitFor(() => expect(router.state.location.state).toBeNull());
    expect(screen.getByRole("status")).toHaveTextContent(BANNER);

    // « Rechargement » : nouvelle page sur la même entrée d'historique.
    const { pathname, search, hash, state } = router.state.location;
    unmount();
    renderApp({ pathname, search, hash, state });

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });
});

describe("LoginPage – affichage", () => {
  it("affiche la carte « Connexion » avec son sous-titre", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bon retour ! Connectez-vous pour accéder à votre espace."),
    ).toBeInTheDocument();
    expect(document.title).toBe("Connexion · Synapse");
  });

  it("reprend le panneau étudiant et la barre de l'inscription", () => {
    renderApp();

    expect(screen.getByText("Espace étudiant").closest(".auth-panel")).not.toBeNull();
    const nav = screen.getByRole("navigation", { name: "Navigation de la connexion" });
    expect(
      within(nav).getByRole("link", { name: /Retour aux événements/ }),
    ).toHaveAttribute("href", "/");
    expect(
      within(nav).getByRole("link", { name: "Accéder à l'espace organisateur" }),
    ).toHaveAttribute("href", "/organisateur/inscription");
  });

  it("a les champs e-mail et mot de passe, avec le bouton œil", async () => {
    const { user } = renderApp();

    expect(screen.getByLabelText("Adresse e-mail")).toHaveAttribute("type", "email");
    const password = screen.getByLabelText("Mot de passe");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");

    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("propose de créer un compte, sans « Mot de passe oublié ? »", () => {
    renderApp();

    expect(screen.getByText("Pas encore de compte ?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute(
      "href",
      "/inscription",
    );
    expect(screen.queryByText(/Mot de passe oublié/)).not.toBeInTheDocument();
  });
});

describe("LoginPage – connexion", () => {
  it("connecte un étudiant et le redirige vers /accueil", async () => {
    const fetchSpy = mockApi({ "POST /api/auth/login/": loginOk(ETUDIANT) });
    const { user, router } = renderApp();

    await signIn(user, "  amina.benali@usms.ac.ma ");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bonjour Amina" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/accueil");
    expect(callsTo(fetchSpy, "POST /api/auth/login/")[0].body).toEqual({
      email: ETUDIANT.email,
      password: MOT_DE_PASSE,
    });
  });

  it("garde le jeton d'accès en mémoire et le rafraîchissement dans localStorage", async () => {
    mockApi({ "POST /api/auth/login/": loginOk(ETUDIANT) });
    const { user } = renderApp();

    await signIn(user);
    await screen.findByText("Bonjour Amina");

    expect(getAccessToken()).toBe("access-1");
    expect(Object.values(localStorage)).toEqual(["refresh-1"]);
  });

  it("redirige un organisateur vers /organisateur", async () => {
    mockApi({ "POST /api/auth/login/": loginOk(ORGANISATEUR) });
    const { user, router } = renderApp();

    await signIn(user, ORGANISATEUR.email);

    expect(await screen.findByText("Bonjour Youssef")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/organisateur");
  });

  it("401 : affiche « Identifiants invalides. »", async () => {
    mockApi({
      "POST /api/auth/login/": {
        status: 401,
        body: { detail: "Identifiants invalides." },
      },
    });
    const { user, router } = renderApp();

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Identifiants invalides.",
    );
    expect(router.state.location.pathname).toBe("/connexion");
    expect(localStorage.length).toBe(0);
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled();
  });

  it("429 : demande de réessayer dans une minute", async () => {
    mockApi({
      "POST /api/auth/login/": {
        status: 429,
        body: { detail: "Requête ralentie. Disponible à nouveau dans 59 secondes." },
      },
    });
    const { user } = renderApp();

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Trop de tentatives, réessayez dans une minute.",
    );
  });

  it("erreur réseau : affiche un message clair", async () => {
    mockApi({ "POST /api/auth/login/": "network" });
    const { user } = renderApp();

    await signIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.",
    );
  });

  it("champs vides : erreurs écrites, sans appel à l'API", async () => {
    const fetchSpy = mockApi({});
    const { user } = renderApp();

    await signIn(user, "", "");

    expect(
      screen.getByText("Erreur : Saisissez votre adresse e-mail."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Erreur : Saisissez votre mot de passe."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse e-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Adresse e-mail")).toHaveFocus();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
