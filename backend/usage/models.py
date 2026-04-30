from mongoengine import Document, ReferenceField, FloatField, DateTimeField
from django.utils import timezone
from users.models import User
from appliances.models import Appliance


class Usage(Document):
    user = ReferenceField(User, required=True)
    appliance = ReferenceField(Appliance, required=True)
    hours_used = FloatField(required=True)
    units_consumed = FloatField(required=True)
    date = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'usage',
        'strict': False
    }