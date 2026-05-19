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
            date__gte=today,
            original_units__exists=True,
            original_units__gt=0
        )

        daily_units = sum((u.units_consumed or 0) for u in today_usage)
        # Ensure original is at least the optimized value for each record
        original_daily_units = sum(max(u.original_units or 0, u.units_consumed or 0) for u in today_usage)

        # ───── WEEK ─────
        weekly_usage = Usage.objects(
            user=request.user,
            date__gte=last_7_days,
            date__lte=now,
            original_units__exists=True,
            original_units__gt=0
        )

        weekly_units = sum((u.units_consumed or 0) for u in weekly_usage)
        original_weekly_units = sum(max(u.original_units or 0, u.units_consumed or 0) for u in weekly_usage)

        # ───── MONTHLY USAGE (FIXED) ─────
        previous_60_days = now - timedelta(days=60)
        previous_month_usage = Usage.objects(
            user=request.user,
            date__gte=previous_60_days,
            date__lt=last_30_days,
            original_units__exists=True,
            original_units__gt=0
        )
        previous_month_units = sum((u.units_consumed or 0) for u in previous_month_usage)

        current_month_usage = Usage.objects(
            user=request.user,
            date__gte=last_30_days,
            original_units__exists=True,
            original_units__gt=0
        )
        current_month_units = sum((u.units_consumed or 0) for u in current_month_usage)
        original_monthly_units = sum(max(u.original_units or 0, u.units_consumed or 0) for u in current_month_usage)

        monthly_change = None
        if previous_month_units > 0:
            monthly_change = round(((current_month_units - previous_month_units) / previous_month_units) * 100, 2)

        # ───── PREDICTION (SMART AGGREGATION) ─────
        from collections import defaultdict
        import datetime
        from django.utils.timezone import make_aware, is_naive
        daily_opt_map = defaultdict(float)
        daily_orig_map = defaultdict(float)

        for u in weekly_usage:
            # Handle naive datetimes from older or imported data
            dt = u.date
            if is_naive(dt):
                dt = make_aware(dt, timezone=datetime.timezone.utc)
            
            # Now safely convert to local time and group by date
            local_dt = timezone.localtime(dt).date()
            daily_opt_map[local_dt] += (u.units_consumed or 0)
            daily_orig_map[local_dt] += (u.original_units or 0)

        active_days = len(daily_opt_map)
        
        if active_days < 4:
            # Not enough data for projection, use current month totals
            predicted_units = current_month_units
            orig_predicted_units = original_monthly_units
        else:
            # Calculate daily average from the grouped totals
            opt_totals = list(daily_opt_map.values())
            orig_totals = list(daily_orig_map.values())
            
            # Use a "Capped Average" to handle the 408 unit spike
            # We sort and ignore the extreme outlier if it's > 3x the median
            opt_totals.sort()
            orig_totals.sort()
            
            # For 7 days of data, we use the 5 middle days if there's a huge spike
            if len(opt_totals) >= 5 and opt_totals[-1] > (sum(opt_totals[:-1]) / (len(opt_totals)-1) * 3):
                 print(f"[DEBUG] Spike detected ({opt_totals[-1]}). Dampening for prediction.")
                 daily_avg = sum(opt_totals[:-1]) / (len(opt_totals) - 1)
                 orig_daily_avg = sum(orig_totals[:-1]) / (len(orig_totals) - 1)
            else:
                 daily_avg = sum(opt_totals) / len(opt_totals)
                 orig_daily_avg = sum(orig_totals) / len(orig_totals)
            
            # Forecast for 30 days
            proj_units = daily_avg * 30
            orig_proj_units = orig_daily_avg * 30
            
            # Sanity Clamps
            predicted_units = max(proj_units, current_month_units)
            orig_predicted_units = max(orig_proj_units, original_monthly_units)
            
            # Final safety: force original >= optimized
            orig_predicted_units = max(orig_predicted_units, predicted_units)
            
            # Cap at a realistic maximum
            predicted_units = min(predicted_units, 4000)
            orig_predicted_units = min(orig_predicted_units, 4000)

        predicted_bill = calculate_bill(predicted_units)
        orig_predicted_bill = calculate_bill(orig_predicted_units)
        
        # Final safety for bill (absolute guarantee)
        orig_predicted_bill = max(orig_predicted_bill, predicted_bill)

        # ───── APPLIANCE DISTRIBUTION ─────
        appliance_usage = defaultdict(float)

        for u in today_usage:
            name = u.appliance.name if u.appliance else "Unknown"
            appliance_usage[name] += (u.units_consumed or 0)

        appliance_usage = {k: round(v, 2) for k, v in appliance_usage.items()}

        # ───── TOP CONSUMER ─────
        top_consumer = None
        if appliance_usage:
            top_consumer = max(appliance_usage, key=appliance_usage.get)

        # ───── WEEKLY TREND (FIXED) ─────
        week_data = defaultdict(float)
        import datetime
        from django.utils.timezone import make_aware, is_naive

        # Initialize with last 7 days names
        days_order = []
        for i in range(6, -1, -1):
            d = now - timedelta(days=i)
            days_order.append(d.strftime('%a'))
            week_data[d.strftime('%a')] = 0.0

        for u in weekly_usage:
            dt = u.date
            if is_naive(dt):
                dt = make_aware(dt, timezone=datetime.timezone.utc)
            local_date = timezone.localtime(dt)
            day = local_date.strftime('%a')
            # Only add to the current week window
            if day in week_data:
                week_data[day] += (u.units_consumed or 0)

        # ───── DEBUG LOGS (NEW) ─────
        print(f"\n--- DEBUG: DASHBOARD CALCULATIONS ---")
        print(f"User: {request.user.email if hasattr(request.user, 'email') else 'Unknown'}")
        print(f"Today Actual: {round(daily_units, 2)} | Today Original: {round(original_daily_units, 2)}")
        print(f"Weekly Actual: {round(weekly_units, 2)} | Weekly Original: {round(original_weekly_units, 2)}")
        print(f"Month Actual: {round(current_month_units, 2)} | Month Original: {round(original_monthly_units, 2)}")
        print(f"Predicted Units: {round(predicted_units, 2)} | Predicted Bill: ₹{round(predicted_bill, 2)}")
        print(f"Original Prediction: {round(orig_predicted_units, 2)} | Original Bill: ₹{round(orig_predicted_bill, 2)}")
        print(f"--------------------------------------\n")

        # ───── RESPONSE ─────
        return Response({
            "daily_units": round(daily_units, 2),
            "original_daily_units": round(original_daily_units, 2),
            "estimated_bill": round(calculate_bill(daily_units), 2),
            "original_estimated_bill": round(calculate_bill(original_daily_units), 2),
            "predicted_bill": round(predicted_bill, 2),
            "original_predicted_bill": round(orig_predicted_bill, 2),
            "monthly_change": monthly_change,
            "top_consumer": top_consumer,
            "appliance_usage": appliance_usage,
            "weekly_trend": {d: round(week_data[d], 2) for d in days_order},
            "savings_today": round(calculate_bill(original_daily_units) - calculate_bill(daily_units), 2)
        })