import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { LogOutIcon } from "../components/icons";
import "./SpacePage.css";

/**
 * Page provisoire des espaces connectés (US02) : /accueil (étudiant) et
 * /organisateur. Sera remplacée par les vraies pages d'accueil.
 */
export default function SpacePage({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.title = `${title} · Synapse`;
  }, [title]);

  async function handleLogout() {
    setLeaving(true);
    await logout();
    navigate("/connexion", { replace: true });
  }

  return (
    <main className="space-page">
      <h1 className="space-page__title">Bonjour {user.first_name}</h1>
      <button
        type="button"
        className="space-page__logout"
        onClick={handleLogout}
        disabled={leaving}
        aria-busy={leaving || undefined}
      >
        <LogOutIcon />
        <span>Déconnexion</span>
      </button>
    </main>
  );
}
