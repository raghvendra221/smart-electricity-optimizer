import os
import sys
from datetime import timedelta
from django.utils import timezone
from usage.models import Usage
from appliances.models import Appliance
from users.models import User

def seed():
    user = User.objects.first()

    if not user:
        print("No user found")
        return

    appliances = Appliance.objects(user=user)
    if not appliances:
        print("No appliances found")
        return

    now = timezone.now()

    print("Seeding fresh data...")
    for i in range(7):
        date = now - timedelta(days=i)
        for app in appliances:
            hours = 2.0  # realistic hours
            units = (app.wattage * hours) / 1000
            Usage(
                user=user,
                appliance=app,
                hours_used=hours,
                units_consumed=units,
                date=date
            ).save()

    print("Done seeding.")

    last_7_days = now - timedelta(days=7)
    weekly_usage = Usage.objects(
        user=user,
        date__gte=last_7_days,
        date__lte=now
    )

    weekly_units = sum(u.units_consumed for u in weekly_usage)
    print(f"Verified weekly_units manually: {weekly_units}")

seed()
