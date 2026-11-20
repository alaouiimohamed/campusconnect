import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { clearSession } from "../services/session";

afterEach(() => {
  cleanup();
  // Aucun jeton ne passe d'un test à l'autre.
  clearSession();
  localStorage.clear();
});
