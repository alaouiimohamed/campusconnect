import { describe, expect, it } from "vitest";
import { parseApiErrors, validateRegister } from "./registerValidation";

const VALID = {
  last_name: "Benali",
  first_name: "Amina",
  email: "amina.benali@usms.ac.ma",
  password: "Campus-Connect-2026!",
  password_confirm: "Campus-Connect-2026!",
};

describe("validateRegister", () => {
  it("n'a aucune erreur pour des valeurs valides", () => {
    expect(validateRegister(VALID)).toEqual({});
  });

  it("signale les champs vides (espaces compris)", () => {
    const errors = validateRegister({
      last_name: "  ",
      first_name: "",
      email: "",
      password: "",
      password_confirm: "",
    });

    expect(Object.keys(errors)).toEqual([
      "last_name",
      "first_name",
      "email",
      "password",
      "password_confirm",
    ]);
  });

  it("refuse un e-mail invalide", () => {
    expect(validateRegister({ ...VALID, email: "amina@" }).email).toBe(
      "Saisissez une adresse e-mail valide.",
    );
  });

  it("refuse un mot de passe de moins de 8 caractères", () => {
    const errors = validateRegister({
      ...VALID,
      password: "abc",
      password_confirm: "abc",
    });
    expect(errors.password).toMatch(/au moins 8 caractères/);
  });

  it("refuse une confirmation différente", () => {
    expect(validateRegister({ ...VALID, password_confirm: "autre-chose" })).toEqual({
      password_confirm: "Les mots de passe ne correspondent pas.",
    });
  });
});

describe("parseApiErrors", () => {
  it("répartit les erreurs par champ et regroupe les autres", () => {
    expect(
      parseApiErrors({
        email: ["Un compte existe déjà avec cette adresse email."],
        password: [
          "Ce mot de passe est trop courant.",
          "Il est entièrement numérique.",
        ],
        non_field_errors: ["Requête invalide."],
      }),
    ).toEqual({
      fields: {
        email: "Un compte existe déjà avec cette adresse email.",
        password: "Ce mot de passe est trop courant. Il est entièrement numérique.",
      },
      form: "Requête invalide.",
    });
  });

  it("supporte un corps vide", () => {
    expect(parseApiErrors(null)).toEqual({ fields: {}, form: "" });
  });
});
