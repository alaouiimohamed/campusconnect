import { useEffect } from "react";
import "./LoginPage.css";

/**
 * Page de connexion : simple emplacement pour la redirection après
 * l'inscription (US01). Le formulaire sera réalisé dans US02.
 */
export default function LoginPage() {
  useEffect(() => {
    document.title = "Connexion · Synapse";
  }, []);

  return (
    <main className="login-page">
      <h1 className="login-page__title">Connexion</h1>
    </main>
  );
}
