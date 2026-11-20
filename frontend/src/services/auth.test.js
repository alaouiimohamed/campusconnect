import { describe, expect, it, vi } from "vitest";
import { ETUDIANT, TOKEN_NOT_VALID, callsTo, mockApi } from "../test/mockApi";
import { getMe } from "./auth";
import {
  getAccessToken,
  getRefreshToken,
  onSessionExpired,
  setTokens,
} from "./session";

const REFRESH_OK = {
  status: 200,
  body: { access: "access-2", refresh: "refresh-2" },
};

describe("Rafraîchissement automatique du jeton d'accès", () => {
  it("401 token_not_valid : rafraîchit une fois puis rejoue la requête", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    const fetchSpy = mockApi({
      "GET /api/auth/me/": [TOKEN_NOT_VALID, { status: 200, body: ETUDIANT }],
      "POST /api/auth/refresh/": REFRESH_OK,
    });

    await expect(getMe()).resolves.toEqual(ETUDIANT);

    const meCalls = callsTo(fetchSpy, "GET /api/auth/me/");
    expect(meCalls.map((call) => call.headers.Authorization)).toEqual([
      "Bearer access-1",
      "Bearer access-2",
    ]);
    expect(callsTo(fetchSpy, "POST /api/auth/refresh/")[0].body).toEqual({
      refresh: "refresh-1",
    });
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-2");
  });

  it("refresh refusé : déconnexion (jetons effacés, abonnés prévenus)", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    mockApi({
      "GET /api/auth/me/": TOKEN_NOT_VALID,
      "POST /api/auth/refresh/": TOKEN_NOT_VALID,
    });
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    await expect(getMe()).rejects.toMatchObject({ status: 401 });

    expect(expired).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    unsubscribe();
  });

  it("toujours 401 après le refresh : un seul essai, puis déconnexion", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    const fetchSpy = mockApi({
      "GET /api/auth/me/": TOKEN_NOT_VALID,
      "POST /api/auth/refresh/": REFRESH_OK,
    });

    await expect(getMe()).rejects.toMatchObject({ status: 401 });

    expect(callsTo(fetchSpy, "POST /api/auth/refresh/")).toHaveLength(1);
    expect(callsTo(fetchSpy, "GET /api/auth/me/")).toHaveLength(2);
    expect(getRefreshToken()).toBeNull();
  });

  it("requêtes simultanées : un seul refresh partagé", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    const fetchSpy = mockApi({
      "GET /api/auth/me/": [
        TOKEN_NOT_VALID,
        TOKEN_NOT_VALID,
        { status: 200, body: ETUDIANT },
      ],
      "POST /api/auth/refresh/": REFRESH_OK,
    });

    await Promise.all([getMe(), getMe()]);

    expect(callsTo(fetchSpy, "POST /api/auth/refresh/")).toHaveLength(1);
  });

  it("erreur réseau pendant le refresh : la session est conservée", async () => {
    setTokens({ access: "access-1", refresh: "refresh-1" });
    mockApi({
      "GET /api/auth/me/": TOKEN_NOT_VALID,
      "POST /api/auth/refresh/": "network",
    });

    await expect(getMe()).rejects.toMatchObject({ isNetworkError: true });

    expect(getRefreshToken()).toBe("refresh-1");
  });
});
