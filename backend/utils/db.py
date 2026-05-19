import os
from mongoengine import connect
from dotenv import load_dotenv

load_dotenv()

def connect_db():
    db_name = "electricity_optimizer_db"

    uri = os.getenv(
        "MONGO_URI",
        f"mongodb://localhost:27017/{db_name}"
    )

    try:
        connect(host=uri)
        # Try to ping the database to verify active connection/authentication
        from mongoengine.connection import get_db
        db = get_db()
        db.command('ping')
        print(f"[SUCCESS] Successfully connected and pinged MongoDB: {db_name}")
    except Exception as e:
        print(f"\n========================================================")
        print(f"[DATABASE ERROR] Could not connect to MongoDB Atlas!")
        print(f"Details: {e}")
        print(f"Please check your network connection, username/password,")
        print(f"and make sure your IP is whitelisted on MongoDB Atlas.")
        print(f"========================================================\n")
        raise e