from rest_framework.permissions import BasePermission

from accounts.models import User

# Rôles qui utilisent l'espace organisateur (le professeur y crée ses événements).
ROLES_ORGANISATEUR = (User.Role.ORGANISATEUR, User.Role.PROFESSEUR)


class EstOrganisateurOuProfesseur(BasePermission):
    """Réservé aux rôles ORGANISATEUR et PROFESSEUR (403 pour les autres).

    À placer après IsAuthenticated : sans jeton, la réponse reste un 401.
    """

    message = "Seuls les organisateurs et les professeurs peuvent créer un événement."

    def has_permission(self, request, view):
        return request.user.role in ROLES_ORGANISATEUR
