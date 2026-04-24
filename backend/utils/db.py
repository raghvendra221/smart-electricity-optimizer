import os
from mongoengine import connect
from dotenv import load_dotenv

load_dotenv()

def connect_db():
    db_name = "electricity_optimizer_db"   # ✅ NEW DATABASE NAME

    uri = os.getenv(
        "MONGO_URI",
        f"mongodb://localhost:27017/{db_name}"
    )

    connect(host=uri)

    print(f"[SUCCESS] Connected to MongoDB: {db_name}")
    print("Connecting to DB:", uri)