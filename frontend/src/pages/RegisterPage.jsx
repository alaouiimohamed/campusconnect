import { useEffect } from "react";
import AuthPanel from "../components/auth/AuthPanel";
import RegisterForm from "../components/auth/RegisterForm";
import "./RegisterPage.css";

/**
 * Page de création de compte (US01) : panneau teal + carte « Créer un compte ».
 * La carte « Connexion » de la maquette sera ajoutée avec US02.
 */
export default function RegisterPage({ redirectDelayMs }) {
  useEffect(() => {
    document.title = "Créer un compte · Synapse";
  }, []);

  return (
    <div className="register-page">
      <AuthPanel />
      <main className="register-page__main">
        <RegisterForm redirectDelayMs={redirectDelayMs} />
      </main>
    </div>
  );
}
