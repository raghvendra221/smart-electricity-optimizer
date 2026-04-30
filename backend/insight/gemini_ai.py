from google import genai
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_available_models():
    """Get list of available models"""
    try:
        models = client.models.list()
        available_models = [m.name.split('/')[-1] for m in models]
        print("Available models:", available_models)
        return available_models
    except Exception as e:
        print("Error fetching models:", e)
        return []

def generate_ai_insights(data):
    try:
        prompt = f"""
        Analyze electricity usage data and give 3 short insights.

        Data:
        {data}

        Rules:
        - Simple language
        - Mention savings
        - Max 3 points
        """

        # Dynamically fetch available models
        try:
            available_models = []
            for m in client.models.list():
                if "generateContent" in m.supported_generation_methods:
                    available_models.append(m.name.replace("models/", ""))
            
            # Prioritize flash or pro models if available
            preferred = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.5-flash-latest"]
            models_to_try = [m for m in preferred if m in available_models] + available_models
            if not models_to_try:
                models_to_try = ["gemini-1.5-flash", "gemini-1.5-pro"]
        except Exception:
            models_to_try = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
            
        response = None
        last_error = None
        
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                print(f"Successfully used model: {model}")
                return response.text
            except Exception as e:
                last_error = e
                print(f"Model {model} failed, trying next...")
                continue
        
        # If all models failed, raise the last error
        if last_error:
            raise last_error

    except Exception as e:
        print("Error generating AI insights:", e)
        # Return default insights if API fails
        return """1. Monitor peak usage hours - Shifting tasks to off-peak times can reduce your electricity bill.
2. Your top appliance is consuming significant energy - Consider upgrading to an energy-efficient model.
3. Regular maintenance of appliances ensures optimal energy efficiency and extends their lifespan."""