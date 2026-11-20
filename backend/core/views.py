import logging

from django.db import DatabaseError, connection, transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organisateur
from .permissions import EstOrganisateurOuProfesseur
from .serializers import EvenementCreateSerializer

logger = logging.getLogger(__name__)


class HealthView(APIView):
    """GET /api/health/ : vérifie que l'API et la base répondent."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except DatabaseError:
            logger.exception("Health check : base de données injoignable")
            return Response(
                {"status": "error", "database": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok"})


class EvenementCreateView(generics.CreateAPIView):
    """POST /api/evenements/ : création d'un événement (US07).

    Réservé aux rôles ORGANISATEUR et PROFESSEUR (401 sans jeton, 403 sinon).
    L'organisateur est l'utilisateur connecté ; un professeur (ou un compte
    créé sans profil, par exemple depuis l'admin) reçoit son profil
    Organisateur à sa première création, dans la même transaction.
    """

    serializer_class = EvenementCreateSerializer
    permission_classes = [IsAuthenticated, EstOrganisateurOuProfesseur]

    def perform_create(self, serializer):
        with transaction.atomic():
            organisateur, _ = Organisateur.objects.get_or_create(user=self.request.user)
            serializer.save(organisateur=organisateur)
