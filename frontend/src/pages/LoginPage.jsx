import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { CheckIcon } from "../components/icons";
import "./LoginPage.css";

const ACCOUNT_CREATED_MESSAGE =
  "Votre compte a été créé. Vous pouvez maintenant vous connecter.";

/**
 * Page de connexion : simple emplacement pour la redirection après
 * l'inscription (US01). Le formulaire sera réalisé dans US02.
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
    <main className="login-page">
      <div className="login-page__content">
        {accountCreated && (
          <p className="login-page__banner" role="status">
            <CheckIcon />
            <span>{ACCOUNT_CREATED_MESSAGE}</span>
          </p>
        )}
        <h1 className="login-page__title">Connexion</h1>
      </div>
    </main>
  );
}
