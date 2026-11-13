/**
 * Validation côté client du formulaire d'inscription (US01).
 * Elle évite un aller-retour inutile ; l'API reste la référence
 * (règles complètes du mot de passe, unicité de l'e-mail).
 */

/** Ordre des champs dans le formulaire (sert aussi à placer le focus). */
export const REGISTER_FIELDS = [
  "last_name",
  "first_name",
  "email",
  "password",
  "password_confirm",
];

export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {Record<string, string>} values
 * @returns {Record<string, string>} message d'erreur par champ (vide si valide)
 */
export function validateRegister(values) {
  const errors = {};

  if (!values.last_name.trim()) {
    errors.last_name = "Le nom est obligatoire.";
  }
  if (!values.first_name.trim()) {
    errors.first_name = "Le prénom est obligatoire.";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "L'e-mail universitaire est obligatoire.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Saisissez une adresse e-mail valide.";
  }

  if (!values.password) {
    errors.password = "Le mot de passe est obligatoire.";
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  if (!values.password_confirm) {
    errors.password_confirm = "Confirmez le mot de passe.";
  } else if (values.password && values.password_confirm !== values.password) {
    errors.password_confirm = "Les mots de passe ne correspondent pas.";
  }

  return errors;
}

/**
 * Transforme le corps d'une réponse 400 de l'API en erreurs par champ.
 * Les clés inconnues (non_field_errors, detail…) sont regroupées dans `form`.
 *
 * @param {unknown} data ex. { email: ["Un compte existe déjà…"] }
 * @returns {{ fields: Record<string, string>, form: string }}
 */
export function parseApiErrors(data) {
  const fields = {};
  const general = [];

  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      const message = toMessage(value);
      if (!message) continue;
      if (REGISTER_FIELDS.includes(key)) {
        fields[key] = message;
      } else {
        general.push(message);
      }
    }
  }

  return { fields, form: general.join(" ") };
}

function toMessage(value) {
  if (Array.isArray(value)) return value.map(toMessage).filter(Boolean).join(" ");
  if (typeof value === "string") return value;
  return "";
}
