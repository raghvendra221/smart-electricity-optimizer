from mongoengine import Document, StringField, EmailField, DateTimeField
from datetime import datetime
import bcrypt


class User(Document):
    name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'users'}

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(password.encode(), salt).decode()

    def check_password(self, password):
        return bcrypt.checkpw(password.encode(), self.password.encode())