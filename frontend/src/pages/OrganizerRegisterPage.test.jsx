import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import OrganizerRegisterPage from "./OrganizerRegisterPage";
import RegisterPage from "./RegisterPage";

const REGISTER_URL = "http://api.test/api/auth/register/";
const MOT_DE_PASSE = "Campus-Connect-2026!";
const ORGANISATION = "Nom de l'organisation ou de l'université";
const SUBMIT = "Créer un compte organisateur";

function renderPage() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/organisateur/inscription"]}>
      <Routes>
        <Route path="/organisateur/inscription" element={<OrganizerRegisterPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
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
    Nom: "Alami",
    Prénom: "Youssef",
    [ORGANISATION]: "BDE de la FPK",
    "Adresse e-mail": "contact@bde-fpk.org",
    "Mot de passe": MOT_DE_PASSE,
    "Confirmation du mot de passe": MOT_DE_PASSE,
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

function submit(user) {
  return user.click(screen.getByRole("button", { name: SUBMIT }));
}

describe("OrganizerRegisterPage – affichage", () => {
  it("affiche le panneau « Espace organisateur » et la carte organisateur", () => {
    renderPage();

    const tag = screen.getByText("Espace organisateur");
    expect(tag.closest(".auth-panel")).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Créer un compte organisateur" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Espace organisateur · Synapse");
  });

  it("affiche le contenu du panneau organisateur", () => {
    renderPage();

    const panel = screen.getByText("Espace organisateur").closest(".auth-panel");
    expect(
      within(panel).getByText("Organisez, publiez et suivez vos événements."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Créez vos événements, gérez les inscriptions et suivez vos participants depuis un seul espace.",
      ),
    ).toBeInTheDocument();
    const points = within(panel)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(points).toEqual([
      "Créer et modifier vos événements",
      "Consulter les inscrits et la liste d'attente",
      "Publication après validation de l'administrateur",
    ]);
    expect(
      screen.getByText("Réservé aux personnes qui gèrent des événements."),
    ).toBeInTheDocument();
  });

  it("affiche les images du panneau avec un texte alternatif", () => {
    renderPage();

    for (const name of [
      "Synapse",
      "Bâtiment de la Faculté polydisciplinaire de Khouribga",
      "Faculté polydisciplinaire de Khouribga",
      "Université Sultan Moulay Slimane",
    ]) {
      expect(screen.getByRole("img", { name })).toHaveAttribute("src");
    }
  });

  it("affiche au-dessus de la carte le retour et le lien vers l'espace étudiant", () => {
    renderPage();

    const nav = screen.getByRole("navigation", { name: "Navigation de l'inscription" });
    expect(
      within(nav).getByRole("link", { name: "Retour aux événements" }),
    ).toHaveAttribute("href", "/");
    expect(within(nav).getByText("Vous êtes étudiant ?")).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Accéder à l'espace étudiant" }),
    ).toBeInTheDocument();

    const card = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("affiche les champs dans l'ordre, organisation comprise, sans « Je suis »", () => {
    renderPage();

    const form = screen.getByRole("button", { name: SUBMIT }).closest("form");
    const names = [...form.querySelectorAll("input")].map((input) => input.name);
    expect(names).toEqual([
      "last_name",
      "first_name",
      "email",
      "organisation",
      "password",
      "password_confirm",
    ]);
    expect(screen.getByLabelText(ORGANISATION)).toHaveAttribute("maxlength", "150");
    expect(screen.getByLabelText(ORGANISATION)).toHaveAttribute(
      "placeholder",
      "Ex. Club IA, Bureau des stages…",
    );
    expect(screen.queryByLabelText(/je suis/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("place Nom/Prénom et Mot de passe/Confirmation côte à côte", () => {
    renderPage();

    for (const [left, right] of [
      ["Nom", "Prénom"],
      ["Mot de passe", "Confirmation du mot de passe"],
    ]) {
      const row = screen.getByLabelText(left).closest(".register-card__row");
      expect(within(row).getByLabelText(right)).toBeInTheDocument();
    }
  });

  it("guide la saisie de l'adresse e-mail", () => {
    renderPage();

    const email = screen.getByLabelText("Adresse e-mail");
    expect(email).toHaveAttribute("placeholder", "prenom.nom@exemple.com");
    expect(email).toHaveAccessibleDescription(
      "Universitaire, professionnelle ou personnelle.",
    );
  });

  it("affiche la note de validation par l'administrateur, sans quiz", () => {
    renderPage();

    expect(
      screen.getByText(
        "Vos événements sont publiés après validation par l'administrateur.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/quiz/i)).not.toBeInTheDocument();
  });

  it("propose un lien vers l'espace étudiant", async () => {
    const user = renderPage();

    const link = screen.getByRole("link", { name: "Accéder à l'espace étudiant" });
    expect(link).toHaveAttribute("href", "/inscription");

    await user.click(link);
    expect(
      screen.getByRole("heading", { level: 1, name: "Créer un compte" }),
    ).toBeInTheDocument();
  });
});

describe("OrganizerRegisterPage – validation", () => {
  it("exige le nom de l'organisation sans appeler l'API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = renderPage();

    await fillForm(user, { [ORGANISATION]: "   " });
    await submit(user);

    expect(fetchMock).not.toHaveBeenCalled();
    const organisation = screen.getByLabelText(ORGANISATION);
    expect(organisation).toHaveAttribute("aria-invalid", "true");
    expect(organisation).toHaveAccessibleDescription(
      "Erreur : Le nom de l'organisation ou de l'université est obligatoire.",
    );
    expect(organisation).toHaveFocus();
  });

  it("accepte un e-mail non universitaire", async () => {
    mockFetchResponse({}, { status: 201 });
    const user = renderPage();

    await fillForm(user, { "Adresse e-mail": "orga@gmail.com" });
    await submit(user);

    // Aucune erreur côté client : le compte est créé et la page change.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
  });
});

describe("OrganizerRegisterPage – réponses de l'API", () => {
  it("201 : envoie role=ORGANISATEUR et l'organisation, puis affiche Connexion avec le bandeau", async () => {
    const fetchMock = mockFetchResponse(
      {
        id: 2,
        first_name: "Youssef",
        last_name: "Alami",
        email: "contact@bde-fpk.org",
        role: "ORGANISATEUR",
      },
      { status: 201 },
    );
    const user = renderPage();

    await fillForm(user, { [ORGANISATION]: "  BDE de la FPK " });
    await submit(user);

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
      first_name: "Youssef",
      last_name: "Alami",
      email: "contact@bde-fpk.org",
      password: MOT_DE_PASSE,
      password_confirm: MOT_DE_PASSE,
      role: "ORGANISATEUR",
      organisation: "BDE de la FPK",
    });
  });

  it("400 : affiche l'erreur d'organisation sous le champ", async () => {
    mockFetchResponse(
      { organisation: ["Ce champ ne doit pas dépasser 150 caractères."] },
      { status: 400 },
    );
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    const organisation = screen.getByLabelText(ORGANISATION);
    expect(
      await screen.findByText("Erreur : Ce champ ne doit pas dépasser 150 caractères."),
    ).toBeInTheDocument();
    expect(organisation).toHaveAttribute("aria-invalid", "true");
    expect(organisation).toHaveFocus();
    expect(screen.getByRole("button", { name: SUBMIT })).toBeEnabled();
  });

  it("400 sur le rôle : affiche l'erreur en haut du formulaire", async () => {
    mockFetchResponse(
      { role: ["Rôle invalide : choisissez ETUDIANT ou ORGANISATEUR."] },
      { status: 400 },
    );
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Rôle invalide : choisissez ETUDIANT ou ORGANISATEUR.",
    );
  });

  it("429 : affiche « Trop de tentatives, réessayez plus tard »", async () => {
    mockFetchResponse({ detail: "Requête ralentie." }, { status: 429 });
    const user = renderPage();

    await fillForm(user);
    await submit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur : Trop de tentatives, réessayez plus tard.",
    );
  });
});
