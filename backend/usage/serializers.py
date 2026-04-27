from rest_framework import serializers
from .models import Usage
from appliances.models import Appliance


class UsageSerializer(serializers.Serializer):
    appliance_id = serializers.CharField()
    hours_used = serializers.FloatField()

    def create(self, validated_data):
        user = self.context['user']

        appliance = Appliance.objects(
            id=validated_data['appliance_id'],
            user=user
        ).first()

        if not appliance:
            raise serializers.ValidationError("Appliance not found")

        units = (appliance.wattage * validated_data['hours_used']) / 1000

        usage = Usage(
            user=user,
            appliance=appliance,
            hours_used=validated_data['hours_used'],
            units_consumed=units
        )
        usage.save()

        return usage