import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { register } from "../../services/auth";
import FormField from "../form/FormField";
import {
  ArrowRightIcon,
  BuildingIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  UserIcon,
  UserPlusIcon,
} from "../icons";
import {
  ORGANIZER_REGISTER_FIELDS,
  REGISTER_FIELDS,
  parseApiErrors,
  validateRegister,
} from "./registerValidation";
import "./RegisterForm.css";

// Longueurs maximales imposées par l'API.
const NAME_MAX_LENGTH = 150;
const ORGANISATION_MAX_LENGTH = 150;

/** Contenu propre à chaque espace d'inscription. */
const SPACES = {
  etudiant: {
    role: "ETUDIANT",
    fields: REGISTER_FIELDS,
    title: "Créer un compte",
    subtitle: "Rejoignez la communauté universitaire et profitez de tous les services.",
    emailPlaceholder: "prenom.nom@usms.ac.ma",
    note: "Un court quiz vous sera proposé à votre première connexion.",
    submit: "Créer mon compte",
  },
  organisateur: {
    role: "ORGANISATEUR",
    fields: ORGANIZER_REGISTER_FIELDS,
    title: "Créer un compte organisateur",
    subtitle: "Réservé aux personnes qui gèrent des événements.",
    emailPlaceholder: "prenom.nom@exemple.com",
    emailHint: "Universitaire, professionnelle ou personnelle.",
    note: "Vos événements sont publiés après validation par l'administrateur.",
    submit: "Créer un compte organisateur",
  },
};

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
 * Carte de création de compte (US01).
 * `space` : "etudiant" (envoie role=ETUDIANT) ou "organisateur"
 * (envoie role=ORGANISATEUR et l'organisation).
 * Après un 201, affiche « Compte créé » puis redirige vers /connexion.
 */
export default function RegisterForm({ space = "etudiant", redirectDelayMs = 1500 }) {
  const config = SPACES[space];
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [values, setValues] = useState(() =>
    Object.fromEntries(config.fields.map((name) => [name, ""])),
  );
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
    const first = config.fields.find((name) => fieldErrors[name]);
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
        role: config.role,
        ...("organisation" in values && { organisation: values.organisation.trim() }),
      });
      setStatus("success");
    } catch (error) {
      setStatus("idle");
      if (error?.status === 400) {
        const apiErrors = parseApiErrors(error.data, config.fields);
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
            {config.title}
          </h1>
          <p className="register-card__subtitle">{config.subtitle}</p>
        </div>
      </header>

      <form
        ref={formRef}
        className="register-card__form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="register-card__row">
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
        </div>
        <FormField
          {...fieldProps("email")}
          label="Adresse e-mail"
          type="email"
          icon={MailIcon}
          placeholder={config.emailPlaceholder}
          hint={config.emailHint}
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
        />
        {"organisation" in values && (
          <FormField
            {...fieldProps("organisation")}
            label="Nom de l'organisation ou de l'université"
            icon={BuildingIcon}
            placeholder="Ex. Club IA, Bureau des stages…"
            autoComplete="organization"
            maxLength={ORGANISATION_MAX_LENGTH}
            required
          />
        )}
        <div className="register-card__row register-card__row--password">
          <FormField
            {...fieldProps("password")}
            label="Mot de passe"
            type="password"
            icon={LockIcon}
            placeholder="Entrez votre mot de passe"
            autoComplete="new-password"
            revealable
            revealLabel="le mot de passe"
            required
          />
          <FormField
            {...fieldProps("password_confirm")}
            label="Confirmation du mot de passe"
            type="password"
            icon={LockIcon}
            placeholder="Confirmez le mot de passe"
            autoComplete="new-password"
            revealable
            revealLabel="la confirmation du mot de passe"
            required
          />
        </div>

        <p className="register-card__note">
          <InfoIcon />
          <span>{config.note}</span>
        </p>

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
            {status === "submitting" ? "Inscription en cours…" : config.submit}
          </span>
          <ArrowRightIcon />
        </button>
      </form>
    </section>
  );
}
