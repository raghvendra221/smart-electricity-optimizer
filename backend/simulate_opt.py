import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from usage.models import Usage
from django.utils import timezone

def simulate_optimization():
    print("Simulating optimization for demonstration...")
    today = timezone.now().date()
    usages = Usage.objects(date__gte=today)
    
    for u in usages:
        if u.appliance.name.lower() in ['ac', 'refrigerator']:
            # Assume 30% optimization
            u.original_units = u.units_consumed
            u.units_consumed = u.original_units * 0.7
            u.is_automated = True
            u.save()
            print(f"Simulated optimization for {u.appliance.name}: {u.original_units} -> {u.units_consumed}")

if __name__ == "__main__":
    simulate_optimization()
