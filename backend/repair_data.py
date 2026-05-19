import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from usage.models import Usage
from appliances.models import Appliance

def repair():
    print("Starting repair...")
    usages = Usage.objects(units_consumed=None)
    print(f"Found {len(usages)} records with None units_consumed")
    
    count = 0
    for u in usages:
        if u.appliance:
            # Re-calculate units
            u.units_consumed = (u.appliance.wattage * u.hours_used) / 1000
            # Ensure original_units is also set if missing
            if u.original_units is None:
                u.original_units = u.units_consumed
            u.save()
            count += 1
            print(f"Repaired {u.appliance.name} for {u.date}: {u.units_consumed} kWh")
        else:
            print(f"Skipping record with no appliance: {u.id}")
            
    print(f"Finished. Repaired {count} records.")

if __name__ == "__main__":
    repair()
