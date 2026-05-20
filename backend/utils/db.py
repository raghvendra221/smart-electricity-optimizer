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
        print(f"[SUCCESS] Registered MongoDB connection: {db_name}")
    except Exception as e:
        print(f"\n========================================================")
        print(f"[DATABASE ERROR] Could not connect to MongoDB Atlas!")
        print(f"Details: {e}")
        print(f"========================================================\n")
        
        import sys
        if 'collectstatic' in sys.argv:
            print("[WARNING] Database connection failed, but proceeding since 'collectstatic' is running.")
        else:
            raise e