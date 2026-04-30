from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UsageSerializer
from .models import Usage
from .utils import calculate_bill
from appliances.models import Appliance
from bson import ObjectId
from datetime import timedelta, datetime



class AddUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            appliance_id = request.data.get("appliance_id")
            hours = float(request.data.get("hours_used", 0))

            if hours < 0:
                return Response({"error": "hours_used must be >= 0"}, status=400)

            appliance = Appliance.objects(
                id=ObjectId(appliance_id),
                user=request.user
            ).first()

            if not appliance:
                return Response({"error": "Appliance not found or not owned by user"}, status=404)

            # Logic: units = (wattage × hours_used) / 1000
            units = (appliance.wattage * hours) / 1000

            # Update if record for today already exists, else create new
            # Use UTC date to find today's start
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Find existing usage for this appliance today
            usage = Usage.objects(
                user=request.user,
                appliance=appliance.id,
                date__gte=today_start
            ).order_by('-date').first()

            if usage:
                usage.hours_used += hours
                usage.units_consumed += units
                usage.date = now # Update to latest save time
            else:
                usage = Usage(
                    user=request.user,
                    appliance=appliance,
                    hours_used=hours,
                    units_consumed=units,
                    date=now
                )
            
            usage.save()

            return Response({
                "message": "Usage updated",
                "units": round(units, 2)
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

# GET /api/usage/summary/
class UsageSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Filter for today's records
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        # Order by date ASC so that when building the dict, later records overwrite earlier ones
        usages = Usage.objects(user=request.user, date__gte=today_start).order_by('date')
        
        total_units = sum(u.units_consumed for u in usages)
        total_bill = calculate_bill(total_units)
        
        # Map appliance IDs to hours for frontend initialization
        # The latest record for each appliance today will be the one in the map
        hours_map = {}
        for u in usages:
            if u.appliance:
                hours_map[str(u.appliance.id)] = u.hours_used

        return Response({
            "total_units": round(total_units, 2),
            "estimated_bill": round(total_bill, 2),
            "hours_map": hours_map
        })

# GET /api/usage/appliance/
class ApplianceUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        usages = Usage.objects(user=request.user, date__gte=today_start)
        data = {}
        for u in usages:
            if u.appliance:
                id_str = str(u.appliance.id)
                data[id_str] = data.get(id_str, 0) + u.units_consumed
        return Response(data)



class BillPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Last 7 days data
        last_7_days = datetime.utcnow() - timedelta(days=7)

        usages = Usage.objects(
            user=request.user,
            date__gte=last_7_days
        )

        if not usages:
            return Response({
                "predicted_units": 0,
                "predicted_bill": 0,
                "message": "Not enough data"
            })

        total_units = sum(u.units_consumed for u in usages)
        avg_daily = total_units / 7

        predicted_units = avg_daily * 30
        predicted_bill = calculate_bill(predicted_units)

        return Response({
            "avg_daily_units": round(avg_daily, 2),
            "predicted_units": round(predicted_units, 2),
            "predicted_bill": round(predicted_bill, 2)
        })

class UsageHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        range_type = request.GET.get("range", "7d")

        if range_type == "7d":
            days = 7
        elif range_type == "30d":
            days = 30
        else:
            days = 365

        start_date = datetime.utcnow() - timedelta(days=days)

        usages = Usage.objects(
            user=request.user,
            date__gte=start_date
        )

        data = {}

        for u in usages:
            day = u.date.strftime("%d %b")
            data[day] = data.get(day, 0) + u.units_consumed

        return Response({
            "labels": list(data.keys()),
            "values": [round(v, 2) for v in data.values()]
        })

class UsageLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usages = Usage.objects(user=request.user).order_by('-date')[:10]

        logs = []

        for u in usages:
            logs.append({
                "appliance": u.appliance.name if u.appliance else "Unknown",
                "timestamp": u.date.strftime("%d %b %I:%M %p"),
                "duration": f"{round(u.hours_used * 60)} mins",
                "energy": round(u.units_consumed, 2),
                "source": "Manual"
            })

        return Response({"logs": logs})


