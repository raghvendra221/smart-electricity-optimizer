from usage.models import Usage
from appliances.models import Appliance
from users.models import User
from datetime import timedelta
from django.utils import timezone
import random

def seed_7_days():
    # Use the specific user from the logs
    user = User.objects(email="puneet@example.com").first() or User.objects.first()
    
    if not user:
        print("No user found")
        return

    # Clear recent data to avoid overlaps
    now = timezone.now()
    last_7_days = now - timedelta(days=7)
    Usage.objects(user=user, date__gte=last_7_days).delete()

    appliances = list(Appliance.objects(user=user))
    if not appliances:
        print("No appliances found for user")
        return

    print(f"Seeding 7 days of valid historical data for {user.email}...")

    # We want ~20 units/day optimized, ~30 units/day original
    for i in range(7):
        # We need a unique date for each day to count as an "active_day"
        # Using 12:00 PM for each day
        date = (now - timedelta(days=i)).replace(hour=12, minute=0, second=0, microsecond=0)
        
        for app in appliances:
            # Random hours between 1 and 4
            hours = random.uniform(1.0, 4.0)
            
            # Baseline (Original)
            base_units = (app.wattage * hours) / 1000
            
            # Optimized (simulating 20% savings)
            opt_units = base_units * 0.8
            
            Usage(
                user=user,
                appliance=app,
                hours_used=hours,
                units_consumed=round(opt_units, 2),
                original_units=round(base_units, 2),
                date=date,
                is_automated=True
            ).save()

    print("Success! You now have 7 active days of data.")
    print("Refresh the dashboard to see the 30-day projection logic in action.")

if __name__ == "__main__":
    seed_7_days()
