from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField()

    def create(self, validated_data):
        user = User(
            name=validated_data['name'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()