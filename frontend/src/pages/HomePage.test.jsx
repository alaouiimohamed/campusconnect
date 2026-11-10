import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";

function mockFetchResponse(body, { status = 200 } = {}) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("HomePage", () => {
  it("affiche le titre CampusConnect", () => {
    mockFetchResponse({ status: "ok" });
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "CampusConnect" }),
    ).toBeInTheDocument();
  });

  it("affiche le chargement puis « ok » quand l'API répond", async () => {
    const fetchMock = mockFetchResponse({ status: "ok" });
    render(<HomePage />);

    expect(screen.getByRole("status")).toHaveTextContent("Vérification de l'API");

    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/health/",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("affiche une erreur quand le backend est injoignable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    render(<HomePage />);

    expect(await screen.findByText(/Backend injoignable/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "error");
  });

  it("affiche une erreur quand l'API répond 503", async () => {
    mockFetchResponse({ status: "error", database: "unavailable" }, { status: 503 });
    render(<HomePage />);

    expect(await screen.findByText(/HTTP 503/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "error");
  });
});
