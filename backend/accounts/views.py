from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ : création de compte (US01).

    Accessible sans authentification ; limité par le scope de throttling
    "register" (voir REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]).
    """

    serializer_class = RegisterSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ : email + mot de passe -> access, refresh, user (US02).

    Public ; limité par le scope de throttling "login" (5 tentatives par minute
    et par adresse IP par défaut).
    """

    serializer_class = LoginSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ : refresh -> nouveaux access et refresh (US02).

    Rotation activée : l'ancien jeton de rafraîchissement passe en liste noire.
    """

    authentication_classes = []
    permission_classes = [AllowAny]


class LogoutView(TokenBlacklistView):
    """POST /api/auth/logout/ : met le jeton de rafraîchissement en liste noire (US02).

    Public : posséder le jeton de rafraîchissement suffit, pour pouvoir se
    déconnecter même quand le jeton d'accès a expiré.
    """

    authentication_classes = []
    permission_classes = [AllowAny]


class MeView(APIView):
    """GET /api/auth/me/ : utilisateur connecté (US02). 401 sans jeton valide."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
