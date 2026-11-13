import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

const REGISTER_URL = "http://api.test/api/auth/register/";
const MOT_DE_PASSE = "Campus-Connect-2026!";

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/inscription"]}>
      <Routes>
        <Route path="/inscription" element={<RegisterPage redirectDelayMs={100} />} />
        <Route path="/connexion" element={<LoginPage />} />
      </Routes>
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
    "E-mail universitaire": "amina.benali@usms.ac.ma",
    "Mot de passe": MOT_DE_PASSE,
    "Confirmer le mot de passe": MOT_DE_PASSE,
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

function submit(user) {
  return user.click(screen.getByRole("button", { name: "S'inscrire" }));
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

  it("affiche les champs dans l'ordre, sans champ « Je suis »", () => {
    renderPage();

    const form = screen.getByRole("button", { name: "S'inscrire" }).closest("form");
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
      "E-mail universitaire",
      "Mot de passe",
      "Confirmer le mot de passe",
    ]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
    expect(screen.queryByLabelText(/je suis/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Confirmer le mot de passe")).toHaveAttribute(
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
    expect(screen.getByLabelText("E-mail universitaire")).toHaveAccessibleDescription(
      "Erreur : L'e-mail universitaire est obligatoire.",
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAccessibleDescription(
      "Erreur : Le mot de passe est obligatoire.",
    );
    expect(
      screen.getByLabelText("Confirmer le mot de passe"),
    ).toHaveAccessibleDescription("Erreur : Confirmez le mot de passe.");
  });

  it("refuse un e-mail invalide et des mots de passe différents", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = renderPage();

    await fillForm(user, {
      "E-mail universitaire": "amina@",
      "Confirmer le mot de passe": "Autre-mot-de-passe-1",
    });
    await submit(user);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("E-mail universitaire")).toHaveAccessibleDescription(
      "Erreur : Saisissez une adresse e-mail valide.",
    );
    expect(
      screen.getByLabelText("Confirmer le mot de passe"),
    ).toHaveAccessibleDescription("Erreur : Les mots de passe ne correspondent pas.");
    expect(screen.getByLabelText("E-mail universitaire")).toHaveFocus();
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
  it("201 : envoie les données, affiche « Compte créé » puis redirige vers /connexion", async () => {
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

    expect(await screen.findByText(/^Compte créé/)).toBeInTheDocument();
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
    });
    // Aucun rôle envoyé : l'API attribue ETUDIANT par défaut.
    expect(JSON.parse(options.body)).not.toHaveProperty("role");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
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

    const email = screen.getByLabelText("E-mail universitaire");
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
    expect(screen.getByRole("button", { name: "S'inscrire" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "S'inscrire" })).toBeEnabled();
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
