from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from django.conf import settings
from .models import User


class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return None

        try:
            token = auth_header.split(' ')[1]

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=['HS256']
            )

            user = User.objects(id=payload['user_id']).first()

            if not user:
                raise AuthenticationFailed("User not found")

            return (user, None)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expired")

        except Exception:
            raise AuthenticationFailed("Invalid token")