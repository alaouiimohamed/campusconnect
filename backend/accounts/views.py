from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

from .serializers import RegisterSerializer


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
