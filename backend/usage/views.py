from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UsageSerializer
from .models import Usage
from .utils import calculate_bill
from appliances.models import Appliance
from insight.models import AutomationRule
from bson import ObjectId

class AddUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            appliance_id = request.data.get("appliance_id")
            hours = float(request.data.get("hours_used", 0))
            quantity = int(request.data.get("quantity", 1))

            if hours < 0:
                return Response({"error": "hours_used must be >= 0"}, status=400)
            if hours > 24:
                return Response({"error": "Runtime cannot exceed 24 hours per day"}, status=400)
            if quantity < 1:
                return Response({"error": "quantity must be >= 1"}, status=400)

            appliance = Appliance.objects(
                id=ObjectId(appliance_id),
                user=request.user
            ).first()

            if not appliance:
                return Response({"error": "Appliance not found or not owned by user"}, status=404)

            # Logic: units = (wattage × hours_used × quantity) / 1000
            units = (appliance.wattage * hours * quantity) / 1000
            original_units = units
            is_automated = False
            total_hours = hours * quantity
            print(f"[DEBUG] AddUsageView: {appliance.name} x{quantity} original units calculation: {round(units, 4)}")

            # Apply automation rule if exists
            rule = AutomationRule.objects(user=request.user, appliance=appliance).first()
            if rule and rule.rule_type == "reduce_usage":
                # Reduce consumption based on the rule (e.g., 25% reduction)
                reduction = (rule.reduction_percent / 100)
                units *= (1 - reduction)
                is_automated = True
                print(f"[DEBUG] AddUsageView: Automation Rule detected! Reduction={rule.reduction_percent}%. New units: {round(units, 4)}")
            else:
                print(f"[DEBUG] AddUsageView: No automation rule found for {appliance.name}")

            # Update if record for today already exists, else create new
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Find existing usage for this appliance today
            usage = Usage.objects(
                user=request.user,
                appliance=appliance.id,
                date__gte=today_start
            ).order_by('-date').first()

            if usage:
                usage.hours_used = (usage.hours_used or 0) + total_hours
                usage.units_consumed = (usage.units_consumed or 0) + units
                usage.original_units = (usage.original_units or 0) + original_units
                usage.is_automated = is_automated or usage.is_automated
                usage.date = now 
            else:
                usage = Usage(
                    user=request.user,
                    appliance=appliance,
                    hours_used=total_hours,
                    units_consumed=units,
                    original_units=original_units,
                    is_automated=is_automated,
                    date=now
                )
            usage.save()

            user = request.user
            user.cached_insights = {}
            user.insights_updated_at = None
            user.save()

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
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        # Order by date ASC so that when building the dict, later records overwrite earlier ones
        usages = Usage.objects(user=request.user, date__gte=today_start).order_by('date')
        
        total_units = sum((u.units_consumed or 0) for u in usages)
        original_total_units = sum((u.original_units or u.units_consumed or 0) for u in usages)
        
        total_bill = calculate_bill(total_units)
        original_bill = calculate_bill(original_total_units)
        
        # Map appliance IDs to hours for frontend initialization
        # The latest record for each appliance today will be the one in the map
        hours_map = {}
        for u in usages:
            if u.appliance:
                hours_map[str(u.appliance.id)] = u.hours_used

        return Response({
            "total_units": round(total_units, 2),
            "original_total_units": round(original_total_units, 2),
            "estimated_bill": round(total_bill, 2),
            "original_estimated_bill": round(original_bill, 2),
            "hours_map": hours_map
        })

# GET /api/usage/appliance/
class ApplianceUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        usages = Usage.objects(user=request.user, date__gte=today_start)
        data = {}
        for u in usages:
            if u.appliance:
                id_str = str(u.appliance.id)
                data[id_str] = data.get(id_str, 0) + (u.units_consumed or 0)
        return Response(data)



class BillPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        # 1. Fetch current month total for fallback
        current_month_usage = Usage.objects(
            user=request.user,
            date__gte=last_30_days,
            original_units__exists=True,
            original_units__gt=0
        )
        current_month_units = sum((u.units_consumed or 0) for u in current_month_usage)

        # 2. Fetch last 7 days for projection
        usages = Usage.objects(
            user=request.user,
            date__gte=last_7_days,
            date__lte=now,
            original_units__exists=True,
            original_units__gt=0
        )

        if not usages:
            return Response({
                "avg_daily_units": 0,
                "predicted_units": round(current_month_units, 2),
                "predicted_bill": round(calculate_bill(current_month_units), 2),
                "message": "Showing current month usage (not enough data for forecast)"
            })

        total_units = sum((u.units_consumed or 0) for u in usages)
        active_dates = {u.date.date() for u in usages}
        active_days = len(active_dates)
        
        if active_days < 4:
            # Fallback to current month if data is sparse
            predicted_units = current_month_units
            avg_daily = total_units / active_days
        else:
            avg_daily = total_units / active_days
            proj_units = avg_daily * 30
            # Ensure prediction is at least what we've consumed
            predicted_units = max(proj_units, current_month_units)
            # Clamp to 4000
            predicted_units = min(predicted_units, 4000)

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

        start_date = timezone.now() - timedelta(days=days)

        usages = Usage.objects(
            user=request.user,
            date__gte=start_date
        )

        data = {}
        original_data = {}

        # Ensure we have consistent labels by using sorted keys
        for u in usages:
            day = u.date.strftime("%d %b")
            data[day] = data.get(day, 0) + (u.units_consumed or 0)
            original_data[day] = original_data.get(day, 0) + (u.original_units or u.units_consumed or 0)

        labels = list(data.keys())
        return Response({
            "labels": labels,
            "values": [round(data[label], 2) for label in labels],
            "original_values": [round(original_data[label], 2) for label in labels]
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
                "duration": f"{round((u.hours_used or 0) * 60)} mins",
                "energy": round(u.units_consumed or 0, 2),
                "original_energy": round(u.original_units or u.units_consumed or 0, 2),
                "is_automated": u.is_automated,
                "saved_energy": round((u.original_units or u.units_consumed or 0) - (u.units_consumed or 0), 2),
                "source": "Auto-Opt" if u.is_automated else "Manual"
            })

        return Response({"logs": logs})


