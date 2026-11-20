import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AuthProvider from "../auth/AuthProvider";
import LoginPage from "./LoginPage";
import OrganizerRegisterPage from "./OrganizerRegisterPage";
import RegisterPage from "./RegisterPage";

const REGISTER_URL = "http://api.test/api/auth/register/";
const MOT_DE_PASSE = "Campus-Connect-2026!";

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/inscription"]}>
      <AuthProvider>
        <Routes>
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/organisateur/inscription" element={<OrganizerRegisterPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return user;
}

function mockFetchResponse(body, { status }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function fillForm(user, overrides = {}) {
  const values = {
    Nom: "Benali",
    Prénom: "Amina",
    "Adresse e-mail": "amina.benali@usms.ac.ma",
    "Mot de passe": MOT_DE_PASSE,
    "Confirmation du mot de passe": MOT_DE_PASSE,
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

function submit(user) {
  return user.click(screen.getByRole("button", { name: "Créer mon compte" }));
}

describe("RegisterPage – affichage", () => {
  it("affiche la carte « Créer un compte » et le nom Synapse", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Créer un compte" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Synapse" })).toBeInTheDocument();
    expect(screen.queryByText(/CampusConnect/)).not.toBeInTheDocument();
    expect(document.title).toBe("Créer un compte · Synapse");
  });

  it("affiche le panneau « Espace étudiant » et ses points", () => {
    renderPage();

    const panel = screen.getByText("Espace étudiant").closest(".auth-panel");
    expect(panel).not.toBeNull();
    const points = within(panel)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(points).toEqual([
      "Rechercher et filtrer les événements",
      "S'inscrire et se désinscrire en un clic",
      "Recevoir des recommandations personnalisées",
    ]);
  });

  it("affiche au-dessus de la carte le retour et le lien vers l'autre espace", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "Navigation de l'inscription" });
    expect(
      within(nav).getByRole("link", { name: "Retour aux événements" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(nav).getByText("Vous organisez des événements ?"),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Accéder à l'espace organisateur" }),
    ).toBeInTheDocument();

    // Plus aucun lien dans la carte elle-même.
    const card = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("affiche des placeholders explicites pour les mots de passe", () => {
    renderPage();

    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "placeholder",
      "Entrez votre mot de passe",
    );
    expect(screen.getByLabelText("Confirmation du mot de passe")).toHaveAttribute(
      "placeholder",
      "Confirmez le mot de passe",
    );
  });

  it("affiche les champs dans l'ordre, sans « Je suis » ni organisation", () => {
    renderPage();

    const form = screen
      .getByRole("button", { name: "Créer mon compte" })
      .closest("form");
    const names = [...form.querySelectorAll("input")].map((input) => input.name);
    expect(names).toEqual([
      "last_name",
      "first_name",
      "email",
      "password",
      "password_confirm",
    ]);

    for (const label of [
      "Nom",
      "Prénom",
      "Adresse e-mail",
      "Mot de passe",
      "Confirmation du mot de passe",
    ]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
    expect(screen.queryByLabelText(/je suis/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/organisation/i)).not.toBeInTheDocument();
  });

  it("place Nom/Prénom et Mot de passe/Confirmation côte à côte", () => {
    renderPage();

    const pairs = [
      ["Nom", "Prénom"],
      ["Mot de passe", "Confirmation du mot de passe"],
    ];
    for (const [left, right] of pairs) {
      const row = screen.getByLabelText(left).closest(".register-card__row");
      expect(row).not.toBeNull();
      expect(within(row).getByLabelText(right)).toBeInTheDocument();
    }
    expect(
      screen.getByLabelText("Adresse e-mail").closest(".register-card__row"),
    ).toBeNull();
  });

  it("annonce le quiz de première connexion, sans l'afficher", () => {
    renderPage();

    expect(
      screen.getByText("Un court quiz vous sera proposé à votre première connexion."),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: /quiz/i })).not.toBeInTheDocument();
  });

  it("propose un lien vers l'espace organisateur", async () => {
    const user = renderPage();

    const link = screen.getByRole("link", { name: "Accéder à l'espace organisateur" });
    expect(link).toHaveAttribute("href", "/organisateur/inscription");

    await user.click(link);
    expect(
      screen.getByRole("heading", { level: 1, name: "Créer un compte organisateur" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas encore la carte « Connexion » (US02)", () => {
    renderPage();
    expect(
      screen.queryByRole("heading", { name: "Connexion" }),
    ).not.toBeInTheDocument();
  });

  it("affiche et masque le mot de passe avec le bouton œil", async () => {
    const user = renderPage();
    const password = screen.getByLabelText("Mot de passe");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    expect(password).toHaveAttribute("type", "password");

    // La confirmation a son propre bouton.
    await user.click(
      screen.getByRole("button", {
        name: "Afficher la confirmation du mot de passe",
      }),
    );
    expect(screen.getByLabelText("Confirmation du mot de passe")).toHaveAttribute(
      "type",
      "text",
    );
  });
});

describe("RegisterPage – validation", () => {
  it("signale les champs vides sans appeler l'API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = renderPage();

    await submit(user);

    expect(fetchMock).not.toHaveBeenCalled();
    const nom = screen.getByLabelText("Nom");
    expect(nom).toHaveAttribute("aria-invalid", "true");
    expect(nom).toHaveAccessibleDescription("Erreur : Le nom est obligatoire.");
    expect(nom).toHaveFocus();
    expect(screen.getByLabelText("Prénom")).toHaveAccessibleDescription(
      "Erreur : Le prénom est obligatoire.",
    );
    expect(screen.getByLabelText("Adresse e-mail")).toHaveAccessibleDescription(
      "Erreur : L'adresse e-mail est obligatoire.",
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAccessibleDescription(
      "Erreur : Le mot de passe est obligatoire.",
    );
    expect(
      screen.getByLabelText("Confirmation du mot de passe"),
    ).toHaveAccessibleDescription("Erreur : Confirmez le mot de passe.");
  });

  it("refuse un e-mail invalide et des mots de passe différents", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = renderPage();

    await fillForm(user, {
      "Adresse e-mail": "amina@",
      "Confirmation du mot de passe": "Autre-mot-de-passe-1",
    });
    await submit(user);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Adresse e-mail")).toHaveAccessibleDescription(
      "Erreur : Saisissez une adresse e-mail valide.",
    );
    expect(
      screen.getByLabelText("Confirmation du mot de passe"),
    ).toHaveAccessibleDescription("Erreur : Les mots de passe ne correspondent pas.");
    expect(screen.getByLabelText("Adresse e-mail")).toHaveFocus();
  });

  it("efface l'erreur d'un champ dès qu'il est corrigé", async () => {
    vi.spyOn(globalThis, "fetch");
    const user = renderPage();

    await submit(user);
    await user.type(screen.getByLabelText("Nom"), "Benali");

    expect(screen.getByLabelText("Nom")).not.toHaveAttribute("aria-invalid");
    expect(
      screen.queryByText("Erreur : Le nom est obligatoire."),
    ).not.toBeInTheDocument();
  });
});

describe("RegisterPage – réponses de l'API", () => {
  it("201 : envoie role=ETUDIANT puis affiche Connexion avec le bandeau de succès", async () => {
    const fetchMock = mockFetchResponse(
      {
        id: 1,
        first_name: "Amina",
        last_name: "Benali",
        email: "amina.benali@usms.ac.ma",
        role: "ETUDIANT",
      },
      { status: 201 },
    );
    const user = renderPage();

    await fillForm(user, { Nom: "  Benali " });
    await submit(user);

    // Redirection immédiate (aucun délai) vers Connexion, avec le bandeau.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Votre compte a été créé. Vous pouvez maintenant vous connecter.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(REGISTER_URL);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      first_name: "Amina",
      last_name: "Benali",
      email: "amina.benali@usms.ac.ma",
      password: MOT_DE_PASSE,
      password_confirm: MOT_DE_PASSE,
      role: "ETUDIANT",
    });
    expect(JSON.parse(options.body)).not.toHaveProperty("organisation");
  });

  it("400 : affiche l'erreur de l'API sous chaque champ concerné", async () => {
    mockFetchResponse(
      {
        email: ["Un compte existe déjà avec cette adresse email."],
        password: [
          "Ce mot de passe est trop courant.",
          "Ce mot de passe est entièrement numérique.",
        ],
      },
      { status: 400 },
    );
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    const email = screen.getByLabelText("Adresse e-mail");
    expect(
      await screen.findByText(
        "Erreur : Un compte existe déjà avec cette adresse email.",
      ),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(
      "Erreur : Un compte existe déjà avec cette adresse email.",
    );
    expect(email).toHaveFocus();
    expect(screen.getByLabelText("Mot de passe")).toHaveAccessibleDescription(
      "Erreur : Ce mot de passe est trop courant. Ce mot de passe est entièrement numérique.",
    );
    expect(screen.getByLabelText("Nom")).not.toHaveAttribute("aria-invalid");
    // Pas de redirection, le formulaire reste utilisable.
    expect(
      screen.getByRole("heading", { name: "Créer un compte" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeEnabled();
  });

  it("429 : affiche « Trop de tentatives, réessayez plus tard »", async () => {
    mockFetchResponse(
      { detail: "Requête ralentie. Disponible à nouveau dans 3599 secondes." },
      { status: 429 },
    );
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Erreur : Trop de tentatives, réessayez plus tard.",
    );
    expect(within(alert).queryByText(/3599/)).not.toBeInTheDocument();
  });

  it("erreur réseau : affiche un message clair", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.",
    );
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeEnabled();
  });

  it("erreur serveur inattendue : affiche un message générique", async () => {
    mockFetchResponse({}, { status: 500 });
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Une erreur inattendue est survenue. Réessayez plus tard.",
    );
  });
});
