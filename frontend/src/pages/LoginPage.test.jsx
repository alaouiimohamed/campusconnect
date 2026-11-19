import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import LoginPage from "./LoginPage";

const BANNER = "Votre compte a été créé. Vous pouvez maintenant vous connecter.";

function renderLogin(entry) {
  const router = createMemoryRouter([{ path: "/connexion", element: <LoginPage /> }], {
    initialEntries: [entry],
  });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

describe("LoginPage – bandeau après inscription", () => {
  it("affiche le bandeau quand l'état accountCreated est présent", () => {
    renderLogin({ pathname: "/connexion", state: { accountCreated: true } });

    expect(screen.getByRole("status")).toHaveTextContent(BANNER);
    expect(
      screen.getByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas de bandeau sans cet état", () => {
    renderLogin("/connexion");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  it("retire l'état de l'historique : pas de bandeau après rechargement", async () => {
    const { router, unmount } = renderLogin({
      pathname: "/connexion",
      state: { accountCreated: true },
    });

    // L'état est effacé de l'entrée d'historique, le bandeau reste affiché.
    await waitFor(() => expect(router.state.location.state).toBeNull());
    expect(screen.getByRole("status")).toHaveTextContent(BANNER);

    // « Rechargement » : nouvelle page sur la même entrée d'historique.
    const { pathname, search, hash, state } = router.state.location;
    unmount();
    renderLogin({ pathname, search, hash, state });

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });
});
