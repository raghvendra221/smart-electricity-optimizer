from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializers import RegisterSerializer, LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered"}, status=201)

        return Response(serializer.errors, status=400)


class LoginView(APIView):
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

            refresh = RefreshToken()
            refresh['user_id'] = str(user.id)
            refresh['email'] = user.email

            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            })

        return Response(serializer.errors, status=400)

class TestProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "message": "Authenticated",
            "user": request.user.email
        })