from datetime import datetime, timedelta
from collections import defaultdict
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from usage.models import Usage
from usage.utils import calculate_bill


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = datetime.utcnow()
        today = now.date()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        # ───── TODAY ─────
        today_usage = Usage.objects(
            user=request.user,
            date__gte=today
        )

        daily_units = sum(u.units_consumed for u in today_usage)

        # ───── WEEK ─────
        weekly_usage = Usage.objects(
            user=request.user,
            date__gte=last_7_days
        )

        weekly_units = sum(u.units_consumed for u in weekly_usage)

        # FIX: safe avg
        avg_daily = weekly_units / 7 if weekly_units > 0 else 0
        predicted_units = avg_daily * 30
        predicted_bill = calculate_bill(predicted_units)

        # ───── MONTHLY CHANGE (NEW) ─────
        last_month_usage = Usage.objects(
            user=request.user,
            date__gte=last_30_days
        )

        last_month_units = sum(u.units_consumed for u in last_month_usage)

        current_projection = daily_units * 30

        monthly_change = 0
        if last_month_units > 0:
            monthly_change = ((current_projection - last_month_units) / last_month_units) * 100

        # ───── APPLIANCE DISTRIBUTION ─────
        appliance_usage = defaultdict(float)

        for u in today_usage:
            name = u.appliance.name if u.appliance else "Unknown"
            appliance_usage[name] += u.units_consumed

        appliance_usage = {k: round(v, 2) for k, v in appliance_usage.items()}

        # ───── TOP CONSUMER ─────
        top_consumer = None
        if appliance_usage:
            top_consumer = max(appliance_usage, key=appliance_usage.get)

        # ───── WEEKLY TREND FIX ─────
        week_data = defaultdict(float)

        for u in weekly_usage:
            day = u.date.strftime('%a')
            week_data[day] += u.units_consumed

        # FIX: ensure all days exist
        days_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        week_data = {day: round(week_data.get(day, 0), 2) for day in days_order}

        # ───── RESPONSE ─────
        return Response({
            "daily_units": round(daily_units, 2),
            "estimated_bill": round(calculate_bill(daily_units), 2),
            "predicted_bill": round(predicted_bill, 2),
            "monthly_change": round(monthly_change, 2),  # ✅ NEW
            "top_consumer": top_consumer,
            "appliance_usage": appliance_usage,
            "weekly_trend": week_data
        })