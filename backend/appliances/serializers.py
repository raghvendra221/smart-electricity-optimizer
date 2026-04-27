from rest_framework import serializers
from .models import Appliance


class ApplianceSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(max_length=100)
    wattage = serializers.FloatField()

    def validate_wattage(self, value):
        if value < 0:
            raise serializers.ValidationError("Wattage cannot be negative")
        return value

    def create(self, validated_data):
        user = self.context['user']
        appliance = Appliance(user=user, **validated_data)
        appliance.save()
        return appliance

    def update(self, instance, validated_data):
        instance.name = validated_data.get('name', instance.name)
        instance.wattage = validated_data.get('wattage', instance.wattage)
        instance.save()
        return instance