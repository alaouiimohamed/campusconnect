import { describe, expect, it } from "vitest";
import {
  ORGANIZER_REGISTER_FIELDS,
  parseApiErrors,
  validateRegister,
} from "./registerValidation";

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

  it("n'exige pas d'organisation pour un étudiant", () => {
    expect(validateRegister(VALID)).not.toHaveProperty("organisation");
  });

  it("exige l'organisation dans l'espace organisateur", () => {
    expect(validateRegister({ ...VALID, organisation: "  " })).toEqual({
      organisation: "Le nom de l'organisation ou de l'université est obligatoire.",
    });
    expect(validateRegister({ ...VALID, organisation: "BDE de la FPK" })).toEqual({});
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

  it("rattache l'erreur d'organisation au champ seulement s'il est affiché", () => {
    const data = { organisation: ["Ce champ est obligatoire."] };

    expect(parseApiErrors(data, ORGANIZER_REGISTER_FIELDS)).toEqual({
      fields: { organisation: "Ce champ est obligatoire." },
      form: "",
    });
    expect(parseApiErrors(data)).toEqual({
      fields: {},
      form: "Ce champ est obligatoire.",
    });
  });

  it("supporte un corps vide", () => {
    expect(parseApiErrors(null)).toEqual({ fields: {}, form: "" });
  });
});
