from mongoengine import Document, StringField, FloatField, DateTimeField, ReferenceField
from django.utils import timezone
from users.models import User


class Appliance(Document):
    user = ReferenceField(User, required=True)
    name = StringField(required=True, max_length=100)
    wattage = FloatField(required=True)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'appliances',
        'strict': False
    }