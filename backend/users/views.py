from requests import request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializers import RegisterSerializer, LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from mongoengine.errors import NotUniqueError
from rest_framework_simplejwt.exceptions import TokenError

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                refresh = RefreshToken.for_user(user)
                return Response({
                    "message": "User registered",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": {
                        "id": str(user.id),
                        "name": user.name,
                        "email": user.email,
                    },
                }, status=201)
            except NotUniqueError:
                return Response(
                    {"error": "Email already exists"},
                    status=400
                )

        return Response(serializer.errors, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user = User.objects(email=email).first()

            if not user:
                return Response({"error": "User not found"}, status=404)

            if not user.check_password(password):
                return Response({"error": "Invalid password"}, status=400)

            refresh = RefreshToken.for_user(user)

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                },
            })

        return Response(serializer.errors, status=400)

class RefreshView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=400)
            
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                "access": str(refresh.access_token),
            }, status=200)
        except TokenError:
            return Response({"error": "Invalid or expired refresh token"}, status=401)

class TestProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "message": "Authenticated",
            "user": str(user.email) if user else "No user"
        })
        print("USER:", request.user)
        print("TYPE:", type(request.user))