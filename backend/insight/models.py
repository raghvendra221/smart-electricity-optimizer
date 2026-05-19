from mongoengine import Document, ReferenceField, StringField, FloatField, DateTimeField
from django.utils import timezone
from users.models import User
from appliances.models import Appliance

class AutomationRule(Document):
    user = ReferenceField(User, required=True)
    appliance = ReferenceField(Appliance, required=True)
    rule_type = StringField(required=True)  # "reduce_usage"
    reduction_percent = FloatField(default=30)
    created_at = DateTimeField(default=timezone.now)

    meta = {
        'collection': 'automation_rules',
        'strict': False,
        'indexes': [
            'user'
        ]
    }
