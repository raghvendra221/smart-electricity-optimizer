from mongoengine import Document, ReferenceField, FloatField, DateTimeField, BooleanField
from django.utils import timezone
from users.models import User
from appliances.models import Appliance


class Usage(Document):
    user = ReferenceField(User, required=True)
    appliance = ReferenceField(Appliance, required=True)
    hours_used = FloatField(required=True)
    units_consumed = FloatField(required=True)
    original_units = FloatField()
    is_automated = BooleanField(default=False)
    date = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'usage',
        'strict': False,
        'indexes': [
            'user',
            'date',
            ('user', 'date'),
            ('user', '-date')
        ]
    }