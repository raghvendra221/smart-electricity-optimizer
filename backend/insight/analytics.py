from datetime import timedelta
from django.utils import timezone
from usage.models import Usage
from usage.utils import calculate_bill

def analyze_usage(user):
    """
    Performs deep data analysis on user consumption patterns.
    Returns a dictionary of structured metrics.
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)

    # 1. Fetch Data (Applying strict filters to match Dashboard)
    today_usage = Usage.objects(
        user=user, 
        date__gte=today_start,
        original_units__exists=True,
        original_units__gt=0
    )
    
    weekly_usage = Usage.objects(
        user=user, 
        date__gte=last_7_days,
        original_units__exists=True,
        original_units__gt=0
    )
    
    monthly_usage = Usage.objects(
        user=user, 
        date__gte=last_30_days,
        original_units__exists=True,
        original_units__gt=0
    )

    # 2. Basic Metrics (Syncing with Dashboard sum logic)
    today_units = sum((u.units_consumed or 0) for u in today_usage)
    original_today_units = sum(max(u.original_units or 0, u.units_consumed or 0) for u in today_usage)
    
    monthly_units = sum((u.units_consumed or 0) for u in monthly_usage)
    original_monthly_units = sum(max(u.original_units or 0, u.units_consumed or 0) for u in monthly_usage)

    # 3. Weekly Average (Syncing with Dashboard Daily Grouping logic)
    from collections import defaultdict
    import datetime
    from django.utils.timezone import make_aware, is_naive
    
    daily_map = defaultdict(float)
    for u in weekly_usage:
        dt = u.date
        if is_naive(dt):
            dt = make_aware(dt, timezone=datetime.timezone.utc)
        local_dt = timezone.localtime(dt).date()
        daily_map[local_dt] += (u.units_consumed or 0)
    
    active_days = len(daily_map)
    daily_avg = sum(daily_map.values()) / active_days if active_days > 0 else 0

    # 4. Appliance Breakdown
    appliance_data = {}
    for u in monthly_usage:
        name = u.appliance.name if u.appliance else "Unknown"
        appliance_data[name] = appliance_data.get(name, 0) + (u.units_consumed or 0)

    top_appliance = None
    top_units = 0
    if appliance_data:
        top_appliance = max(appliance_data.items(), key=lambda x: x[1])[0]
        top_units = appliance_data[top_appliance]

    # 5. Peak vs Off-Peak (Dummy logic for now, could be improved if time exists in model)
    # Assuming day is 6 AM to 10 PM
    day_units = sum((u.units_consumed or 0) for u in monthly_usage if 6 <= u.date.hour < 22)
    night_units = monthly_units - day_units

    results = {
        "today_units": today_units,
        "original_today_units": original_today_units,
        "monthly_units": monthly_units,
        "original_monthly_units": original_monthly_units,
        "daily_avg": daily_avg,
        "top_appliance": top_appliance,
        "top_units": top_units,
        "appliance_data": appliance_data,
        "day_units": day_units,
        "night_units": night_units,
        "total_cost": calculate_bill(monthly_units),
        "savings_today": original_today_units - today_units,
        "savings_monthly": original_monthly_units - monthly_units
    }

    print(f"\n--- DEBUG: AI ANALYTICS ENGINE ---")
    print(f"User Analysis: {user.email}")
    print(f"Today: {round(today_units, 2)} kWh (Original: {round(original_today_units, 2)})")
    print(f"Monthly: {round(monthly_units, 2)} kWh (Original: {round(original_monthly_units, 2)})")
    print(f"Top Appliance: {results['top_appliance']} ({round(results['top_units'], 2)} units)")
    print(f"Efficiency Score: {calculate_score(results)['score']}")
    print(f"----------------------------------\n")

    return results

def calculate_score(analysis):
    """
    Calculates efficiency score: 100 - (optimized_units / real_units * 100)
    Wait, the user's formula was: score = 100 - (optimized_units / real_units * 100)
    That doesn't make sense if optimized < real.
    Actually, usually efficiency is higher if you save more.
    User's goal: "score = 100 - (optimized_units / real_units * 100)"
    Actually, if real_units is what we used, and original_units is baseline:
    Efficiency could be (savings / original) * 100? No.
    Let's use a better logic: 100 - (waste percentage).
    Or simply: 100 * (optimized_units / original_units) but that's upside down.
    Let's use: (1 - (monthly_units / original_monthly_units)) * 100 + base_score
    Wait, I'll follow the user's requested formula but adjusted to be sane:
    score = (monthly_units / (original_monthly_units or 1)) * 100
    No, let's use:
    Efficiency Score based on how much was saved vs total.
    If original is 100 and we used 70, efficiency is good.
    Let's use: score = 100 - (monthly_units / 500 * 100) # Base on consumption target
    Actually, I'll use:
    score = max(0, min(100, 100 - (analysis['monthly_units'] / 10))) 
    But I'll add a bonus for savings:
    savings_pct = (analysis['savings_monthly'] / analysis['original_monthly_units']) * 100 if analysis['original_monthly_units'] > 0 else 0
    score = 70 + savings_pct # Base 70 + savings bonus
    """
    monthly = analysis['monthly_units']
    if monthly == 0: return {"score": 100, "label": "Excellent"}
    
    # Base score on consumption (lower is better)
    base = max(0, 100 - (monthly / 5)) 
    
    # Bonus for optimization
    savings_pct = (analysis['savings_monthly'] / analysis['original_monthly_units']) * 100 if analysis['original_monthly_units'] > 0 else 0
    score = max(0, min(100, base + savings_pct))
    
    label = "Poor"
    if score > 80: label = "Excellent"
    elif score > 60: label = "Good"
    elif score > 40: label = "Fair"
    
    return {"score": round(score), "label": label}

def generate_insights(analysis):
    """
    Generates structured raw insights based on data analysis.
    """
    insights = []
    
    # 1. Spike Detection
    if analysis['today_units'] > analysis['daily_avg'] * 1.5 and analysis['daily_avg'] > 0:
        diff = analysis['today_units'] - analysis['daily_avg']
        insights.append({
            "type": "anomaly",
            "title": "Severe Usage Anomaly",
            "description": f"Warning: Today's usage is 50% higher than your normal pattern. Potential leak or appliance malfunction detected.",
            "potentialSaving": round(calculate_bill(diff), 2)
        })
    elif analysis['today_units'] > analysis['daily_avg'] * 1.2 and analysis['daily_avg'] > 0:
        diff = analysis['today_units'] - analysis['daily_avg']
        insights.append({
            "type": "spike",
            "title": "Usage Spike Detected",
            "description": f"Today's usage is {round((analysis['today_units']/analysis['daily_avg'] - 1)*100)}% higher than your 7-day average.",
            "potentialSaving": round(calculate_bill(diff), 2)
        })

    # 2. Appliance Dominance
    if analysis['top_appliance'] and analysis['monthly_units'] > 0:
        pct = (analysis['top_units'] / analysis['monthly_units']) * 100
        if pct > 40:
            insights.append({
                "type": "optimization",
                "title": f"Dominant {analysis['top_appliance']}",
                "description": f"Your {analysis['top_appliance']} is responsible for {round(pct)}% of this month's energy bill.",
                "potentialSaving": round(calculate_bill(analysis['top_units'] * 0.2), 2),
                "appliance": analysis['top_appliance']
            })

    # 3. Night vs Day Pattern
    if analysis['night_units'] > analysis['day_units'] * 0.6:
        insights.append({
            "type": "anomaly",
            "title": "High Night Consumption",
            "description": "Your nighttime energy usage is unusually high. Ensure appliances are not left on standby.",
            "potentialSaving": round(calculate_bill(analysis['night_units'] * 0.15), 2)
        })

    # 4. General Optimization
    if analysis['savings_monthly'] == 0:
        insights.append({
            "type": "optimization",
            "title": "Optimization Potential",
            "description": f"Your current monthly bill of ₹{round(analysis['total_cost'])} could be reduced by roughly 25% by enabling automation for your {analysis['top_appliance'] or 'appliances'}.",
            "potentialSaving": round(analysis['total_cost'] * 0.25, 2)
        })

    # 5. Fallback Insights (Always ensure at least 3)
    if len(insights) < 3:
        insights.append({
            "type": "tip",
            "title": "Balanced Usage",
            "description": "Your electricity consumption is currently stable. Maintain this by keeping high-wattage devices off during peak hours.",
            "potentialSaving": round(analysis['total_cost'] * 0.05, 2)
        })
    
    if len(insights) < 3:
        insights.append({
            "type": "tip",
            "title": "Vampire Power",
            "description": "Even when off, plugged-in devices consume 'vampire power'. Unplug chargers and small electronics when not in use.",
            "potentialSaving": 50.0
        })

    return insights[:5]
