import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import AuthPanel from "../components/auth/AuthPanel";
import AuthTopBar from "../components/auth/AuthTopBar";
import LoginForm from "../components/auth/LoginForm";
import { CheckIcon } from "../components/icons";
import "./RegisterPage.css";
import "./LoginPage.css";

const ACCOUNT_CREATED_MESSAGE =
  "Votre compte a été créé. Vous pouvez maintenant vous connecter.";

/**
 * Page de connexion (US02) : même panneau teal et même barre que
 * l'inscription étudiant, carte « Connexion ».
 *
 * Après une inscription, l'état de navigation { accountCreated: true }
 * affiche un bandeau de succès. L'état est lu une seule fois puis retiré de
 * l'historique : le bandeau ne réapparaît pas si la page est rechargée.
 */
export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [accountCreated] = useState(() => location.state?.accountCreated === true);

  useEffect(() => {
    document.title = "Connexion · Synapse";
  }, []);

  useEffect(() => {
    if (location.state?.accountCreated) {
      const { pathname, search, hash } = location;
      navigate({ pathname, search, hash }, { replace: true, state: null });
    }
  }, [location, navigate]);

  return (
    <div className="register-page">
      <AuthPanel space="etudiant" />
      <main className="register-page__main">
        <div className="register-page__column">
          <AuthTopBar space="etudiant" navLabel="Navigation de la connexion" />
          {accountCreated && (
            <p className="login-page__banner" role="status">
              <CheckIcon />
              <span>{ACCOUNT_CREATED_MESSAGE}</span>
            </p>
          )}
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
