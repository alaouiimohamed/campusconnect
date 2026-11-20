/**
 * Espace d'arrivée après la connexion, selon le rôle.
 * ORGANISATEUR → /organisateur ; ETUDIANT (et, en attendant leurs espaces,
 * PROFESSEUR et ADMIN) → /accueil.
 */
export function homePathFor(user) {
  return user?.role === "ORGANISATEUR" ? "/organisateur" : "/accueil";
}
