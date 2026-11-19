import { Link } from "react-router";
import "./AuthTopBar.css";

const SWITCH = {
  etudiant: {
    question: "Vous organisez des événements ?",
    to: "/organisateur/inscription",
    label: "Accéder à l'espace organisateur",
  },
  organisateur: {
    question: "Vous êtes étudiant ?",
    to: "/inscription",
    label: "Accéder à l'espace étudiant",
  },
};

/**
 * Barre au-dessus de la carte d'inscription : retour aux événements à gauche,
 * lien vers l'autre espace à droite.
 * `space` : "etudiant" (par défaut) ou "organisateur".
 */
export default function AuthTopBar({ space = "etudiant" }) {
  const { question, to, label } = SWITCH[space];

  return (
    <nav className="auth-topbar" aria-label="Navigation de l'inscription">
      <Link to="/" className="auth-topbar__link">
        <span aria-hidden="true">←</span> Retour aux événements
      </Link>
      <p className="auth-topbar__switch">
        <span>{question}</span>{" "}
        <Link to={to} className="auth-topbar__link">
          {label}
        </Link>
      </p>
    </nav>
  );
}
