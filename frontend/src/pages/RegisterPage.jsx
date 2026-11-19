import { useEffect } from "react";
import AuthPanel from "../components/auth/AuthPanel";
import AuthTopBar from "../components/auth/AuthTopBar";
import RegisterForm from "../components/auth/RegisterForm";
import "./RegisterPage.css";

/**
 * Inscription de l'espace étudiant (US01) : panneau teal + carte « Créer un compte ».
 * Le compte est créé avec role=ETUDIANT. Le quiz de première connexion est une
 * tâche séparée.
 */
export default function RegisterPage() {
  useEffect(() => {
    document.title = "Créer un compte · Synapse";
  }, []);

  return (
    <div className="register-page">
      <AuthPanel space="etudiant" />
      <main className="register-page__main">
        <div className="register-page__column">
          <AuthTopBar space="etudiant" />
          <RegisterForm space="etudiant" />
        </div>
      </main>
    </div>
  );
}
