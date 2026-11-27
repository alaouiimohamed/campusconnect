import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { homePathFor } from "../../auth/roles";
import { useAuth } from "../../auth/useAuth";
import FormField from "../form/FormField";
import { ArrowRightIcon, LockIcon, LogInIcon, MailIcon } from "../icons";
// Même carte que l'inscription (fond, en-tête, alerte, bouton).
import "./RegisterForm.css";
import "./LoginForm.css";

const FIELDS = ["email", "password"];

const MESSAGES = {
  emailRequired: "Saisissez votre adresse e-mail.",
  passwordRequired: "Saisissez votre mot de passe.",
  invalidCredentials: "Identifiants invalides.",
  tooManyRequests: "Trop de tentatives, réessayez dans une minute.",
  network:
    "Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.",
  server: "Une erreur inattendue est survenue. Réessayez plus tard.",
};

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = MESSAGES.emailRequired;
  if (!values.password) errors.password = MESSAGES.passwordRequired;
  return errors;
}

function messageForError(error) {
  if (error?.isNetworkError) return MESSAGES.network;
  // 400 : champ manquant, déjà vérifié côté client ; même réponse qu'un 401.
  if (error?.status === 401 || error?.status === 400)
    return MESSAGES.invalidCredentials;
  if (error?.status === 429) return MESSAGES.tooManyRequests;
  return MESSAGES.server;
}

/**
 * Carte « Connexion » (US02) : POST /api/auth/login/ via AuthProvider,
 * puis redirection vers l'espace du rôle (/accueil ou /organisateur).
 * « Mot de passe oublié ? » fera l'objet d'une tâche séparée.
 */
export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setFormError("");

    const clientErrors = validate(values);
    setErrors(clientErrors);
    const firstError = FIELDS.find((name) => clientErrors[name]);
    if (firstError) {
      formRef.current?.elements.namedItem(firstError)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      });
      navigate(homePathFor(user), { replace: true });
    } catch (error) {
      setSubmitting(false);
      setFormError(messageForError(error));
    }
  }

  const fieldProps = (name) => ({
    id: `login-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    error: errors[name],
  });

  return (
    <section className="register-card login-card" aria-labelledby="login-title">
      <header className="register-card__header">
        <span className="register-card__badge" aria-hidden="true">
          <LogInIcon />
        </span>
        <div>
          <h1 id="login-title" className="register-card__title">
            Connexion
          </h1>
          <p className="register-card__subtitle">
            Bon retour ! Connectez-vous pour accéder à votre espace.
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
          {...fieldProps("email")}
          label="Adresse e-mail"
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
          placeholder="Entrez votre mot de passe"
          autoComplete="current-password"
          revealable
          revealLabel="le mot de passe"
          required
        />

        {formError && (
          <p className="register-card__alert" role="alert">
            Erreur : {formError}
          </p>
        )}

        <button
          type="submit"
          className="register-card__submit"
          disabled={submitting}
          aria-busy={submitting || undefined}
        >
          <LogInIcon />
          <span>{submitting ? "Connexion en cours…" : "Se connecter"}</span>
          <ArrowRightIcon />
        </button>
      </form>

      <p className="login-card__footer">
        <span>Pas encore de compte ?</span>{" "}
        <Link to="/inscription" className="login-card__link">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
