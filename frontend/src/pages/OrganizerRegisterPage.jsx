import { useEffect } from "react";
import AuthPanel from "../components/auth/AuthPanel";
import RegisterForm from "../components/auth/RegisterForm";
import "./RegisterPage.css";

/**
 * Inscription de l'espace organisateur (US01) : panneau « Espace organisateur »
 * + carte « Créer un compte organisateur ». Le compte est créé avec
 * role=ORGANISATEUR et le nom de l'organisation ; l'e-mail est libre.
 */
export default function OrganizerRegisterPage({ redirectDelayMs }) {
  useEffect(() => {
    document.title = "Espace organisateur · Synapse";
  }, []);

  return (
    <div className="register-page">
      <AuthPanel space="organisateur" />
      <main className="register-page__main">
        <RegisterForm space="organisateur" redirectDelayMs={redirectDelayMs} />
      </main>
    </div>
  );
}
