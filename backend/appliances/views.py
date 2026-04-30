from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Appliance
from .serializers import ApplianceSerializer
from bson import ObjectId
from usage.models import Usage
from usage.utils import calculate_bill
from datetime import datetime
from collections import defaultdict

class AddApplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ApplianceSerializer(
            data=request.data,
            context={'user': request.user}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "Appliance added",
                "appliance": {
                    "id": str(serializer.instance.id),
                    "name": serializer.instance.name,
                    "wattage": serializer.instance.wattage,
                }
            }, status=201)

        return Response(serializer.errors, status=400)
    
class ListApplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        appliances = Appliance.objects(user=request.user)
        serializer = ApplianceSerializer(appliances, many=True)
        return Response({"appliances": serializer.data}, status=200)
    
class UpdateApplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, id):
        try:
            appliance = Appliance.objects(
                id=ObjectId(id),
                user=request.user
            ).first()
        except:
            return Response({"error": "Invalid ID"}, status=400)

        if not appliance:
            return Response({"error": "Not found"}, status=404)

        serializer = ApplianceSerializer(appliance, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "id": str(appliance.id),
                "name": appliance.name,
                "wattage": appliance.wattage,
            }, status=200)

        return Response(serializer.errors, status=400)
    
class DeleteApplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        try:
            appliance = Appliance.objects(
                id=ObjectId(id),
                user=request.user
            ).first()
        except:
            return Response({"error": "Invalid ID"}, status=400)

        if not appliance:
            return Response({"error": "Not found"}, status=404)

        appliance.delete()
        return Response({"message": "Deleted"}, status=200)



class ApplianceStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        appliances = Appliance.objects(user=request.user)

        today = datetime.utcnow().date()

        usage_data = Usage.objects(
            user=request.user,
            date__gte=today
        )

        usage_map = defaultdict(lambda: {"hours": 0, "units": 0})

        for u in usage_data:
            aid = str(u.appliance.id)
            usage_map[aid]["hours"] += u.hours_used
            usage_map[aid]["units"] += u.units_consumed

        # Compute total bill once from total units (slab-based)
        total_units = sum(v["units"] for v in usage_map.values())
        total_bill = calculate_bill(total_units)

        # Build result with proportional cost + remainder adjustment
        result = []
        remaining_bill = total_bill

        appliance_list = list(appliances)
        for i, a in enumerate(appliance_list):
            aid = str(a.id)
            hours = usage_map[aid]["hours"]
            units = usage_map[aid]["units"]

            # Last appliance absorbs rounding remainder
            if i == len(appliance_list) - 1 and total_units > 0:
                cost = round(remaining_bill, 2)
            elif total_units > 0:
                cost = round((units / total_units) * total_bill, 2)
                remaining_bill -= cost
            else:
                cost = 0

            result.append({
                "id": aid,
                "name": a.name,
                "wattage": a.wattage,
                "hours_used": round(hours, 2),
                "units": round(units, 2),
                "cost": cost,
                "status": "active" if hours > 0 else "standby",
                "current_draw_kw": round(a.wattage / 1000, 2)
            })

        return Response({"appliances": result})

