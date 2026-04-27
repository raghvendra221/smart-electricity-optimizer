from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Appliance
from .serializers import ApplianceSerializer
from bson import ObjectId

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

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # For now, return some dummy data so the frontend doesn't crash
            return Response({
                "totalUnits": 0,
                "estimatedBill": 0,
                "monthlyTrend": [0, 0, 0, 0, 0, 0],
                "dailyUsage": [0, 0, 0, 0, 0, 0, 0],
                "months": ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
                "days": ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            }, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class InsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            insights = [
                {
                    "id": "2",
                    "type": "tip",
                    "icon": "💡",
                    "title": "LED upgrade recommended",
                    "description": "Switching to LED bulbs reduces lighting costs by up to 75%.",
                    "potentialSaving": 150
                }
            ]
            return Response({"insights": insights}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)