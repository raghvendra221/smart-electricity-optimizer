from mongoengine import Document, StringField, EmailField, DateTimeField, DictField
from django.utils import timezone
import bcrypt


class User(Document):
    name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    created_at = DateTimeField(default=timezone.now)
    cached_insights = DictField()
    insights_updated_at = DateTimeField()

    meta = {'collection': 'users'}

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(password.encode(), salt).decode()

    def check_password(self, password):
        return bcrypt.checkpw(password.encode(), self.password.encode())
    
    @property
    def is_authenticated(self):
        return True
    
