import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { register } from "../../services/auth";
import FormField from "../form/FormField";
import { ArrowRightIcon, LockIcon, MailIcon, UserIcon, UserPlusIcon } from "../icons";
import {
  REGISTER_FIELDS,
  parseApiErrors,
  validateRegister,
} from "./registerValidation";
import "./RegisterForm.css";

const INITIAL_VALUES = Object.fromEntries(REGISTER_FIELDS.map((name) => [name, ""]));

// Longueur maximale imposée par l'API pour le nom et le prénom.
const NAME_MAX_LENGTH = 150;

const MESSAGES = {
  success: "Compte créé. Redirection vers la page de connexion…",
  tooManyRequests: "Trop de tentatives, réessayez plus tard.",
  network:
    "Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.",
  server: "Une erreur inattendue est survenue. Réessayez plus tard.",
};

function messageForError(error) {
  if (error?.isNetworkError) return MESSAGES.network;
  if (error?.status === 429) return MESSAGES.tooManyRequests;
  return MESSAGES.server;
}

/**
 * Carte « Créer un compte » (US01).
 * Après un 201, affiche « Compte créé » puis redirige vers /connexion.
 */
export default function RegisterForm({ redirectDelayMs = 1500 }) {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success

  // Redirection différée après le succès, annulée si la page est quittée.
  useEffect(() => {
    if (status !== "success") return undefined;
    const timer = setTimeout(
      () => navigate("/connexion", { replace: true }),
      redirectDelayMs,
    );
    return () => clearTimeout(timer);
  }, [status, navigate, redirectDelayMs]);

  function focusFirstError(fieldErrors) {
    const first = REGISTER_FIELDS.find((name) => fieldErrors[name]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    // L'erreur du champ disparaît dès que l'utilisateur le corrige.
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status !== "idle") return;
    setFormError("");

    const clientErrors = validateRegister(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }

    setStatus("submitting");
    try {
      await register({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        password: values.password,
        password_confirm: values.password_confirm,
      });
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      if (error?.status === 400) {
        const apiErrors = parseApiErrors(error.data);
        setErrors(apiErrors.fields);
        setFormError(apiErrors.form);
        focusFirstError(apiErrors.fields);
      } else {
        setFormError(messageForError(error));
      }
    }
  }

  const fieldProps = (name) => ({
    id: `register-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    error: errors[name],
    disabled: status === "success",
  });

  return (
    <section className="register-card" aria-labelledby="register-title">
      <header className="register-card__header">
        <span className="register-card__badge" aria-hidden="true">
          <UserPlusIcon />
        </span>
        <div>
          <h1 id="register-title" className="register-card__title">
            Créer un compte
          </h1>
          <p className="register-card__subtitle">
            Rejoignez la communauté universitaire et profitez de tous les services.
          </p>
        </div>
      </header>

      <form
        ref={formRef}
        className="register-card__form"
        onSubmit={handleSubmit}
        noValidate
      >
        <FormField
          {...fieldProps("last_name")}
          label="Nom"
          icon={UserIcon}
          placeholder="Votre nom"
          autoComplete="family-name"
          maxLength={NAME_MAX_LENGTH}
          required
        />
        <FormField
          {...fieldProps("first_name")}
          label="Prénom"
          icon={UserIcon}
          placeholder="Votre prénom"
          autoComplete="given-name"
          maxLength={NAME_MAX_LENGTH}
          required
        />
        <FormField
          {...fieldProps("email")}
          label="E-mail universitaire"
          type="email"
          icon={MailIcon}
          placeholder="prenom.nom@usms.ac.ma"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
        />
        <FormField
          {...fieldProps("password")}
          label="Mot de passe"
          type="password"
          icon={LockIcon}
          placeholder="Choisissez un mot de passe"
          autoComplete="new-password"
          revealable
          revealLabel="le mot de passe"
          required
        />
        <FormField
          {...fieldProps("password_confirm")}
          label="Confirmer le mot de passe"
          type="password"
          icon={LockIcon}
          placeholder="Saisissez-le à nouveau"
          autoComplete="new-password"
          revealable
          revealLabel="la confirmation du mot de passe"
          required
        />

        {formError && (
          <p className="register-card__alert" role="alert">
            Erreur : {formError}
          </p>
        )}

        <p className="register-card__success" role="status">
          {status === "success" ? MESSAGES.success : ""}
        </p>

        <button
          type="submit"
          className="register-card__submit"
          disabled={status !== "idle"}
          aria-busy={status === "submitting" || undefined}
        >
          <UserPlusIcon />
          <span>
            {status === "submitting" ? "Inscription en cours…" : "S'inscrire"}
          </span>
          <ArrowRightIcon />
        </button>
      </form>
    </section>
  );
}
