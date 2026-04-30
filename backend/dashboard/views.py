from datetime import timedelta
from django.utils import timezone
from collections import defaultdict
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from usage.models import Usage
from usage.utils import calculate_bill


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
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

        # FIX: safe avg using active days
        active_dates = {u.date.date() for u in weekly_usage}
        active_days = len(active_dates)
        if active_days < 4:
            avg_daily = weekly_units / 7
        else:
            avg_daily = weekly_units / active_days
        predicted_units = avg_daily * 30
        predicted_bill = calculate_bill(predicted_units)

        # ───── MONTHLY CHANGE (NEW) ─────
        previous_60_days = now - timedelta(days=60)
        previous_month_usage = Usage.objects(
            user=request.user,
            date__gte=previous_60_days,
            date__lt=last_30_days
        )
        previous_month_units = sum(u.units_consumed for u in previous_month_usage)

        current_month_usage = Usage.objects(
            user=request.user,
            date__gte=last_30_days
        )
        current_month_units = sum(u.units_consumed for u in current_month_usage)

        monthly_change = 0
        if previous_month_units > 0:
            monthly_change = ((current_month_units - previous_month_units) / previous_month_units) * 100

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

        import datetime
        from django.utils.timezone import make_aware, is_naive

        for u in weekly_usage:
            dt = u.date
            if is_naive(dt):
                dt = make_aware(dt, timezone=datetime.timezone.utc)
            local_date = timezone.localtime(dt)
            day = local_date.strftime('%a')
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