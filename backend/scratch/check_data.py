from usage.models import Usage
from datetime import timedelta
from django.utils import timezone

now = timezone.now()
last_30_days = now - timedelta(days=30)
records = Usage.objects(date__gte=last_30_days, original_units__exists=True)

print(f"Total records found with original_units: {len(records)}")
inconsistent = []

for u in records:
    opt = u.units_consumed or 0
    orig = u.original_units or 0
    if orig < opt:
        inconsistent.append(u)
        print(f"BAD RECORD -> ID: {u.id} | Date: {u.date} | Opt: {opt} | Orig: {orig}")

print(f"\nSummary: Found {len(inconsistent)} inconsistent records out of {len(records)} checked.")
