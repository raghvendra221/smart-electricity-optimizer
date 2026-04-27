from mongoengine import Document, StringField, FloatField, DateTimeField, ReferenceField
from datetime import datetime
from users.models import User


class Appliance(Document):
    user = ReferenceField(User, required=True)
    name = StringField(required=True, max_length=100)
    wattage = FloatField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'appliances',
        'strict': False
    }