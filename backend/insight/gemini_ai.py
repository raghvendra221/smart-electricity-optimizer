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

def generate_ai_insights(analysis):
    try:
        import json
        
        prompt = f"""
        Analyze the following electricity usage data and provide exactly 4 unique, highly dynamic, and actionable insights/recommendations to help the user save electricity.
        
        Data:
        - Monthly units used: {analysis.get('monthly_units', 0)} kWh
        - Estimated bill: ₹{analysis.get('total_cost', 0)}
        - Top consuming appliance: {analysis.get('top_appliance', 'None')} (consuming {analysis.get('top_units', 0)} kWh)
        - Today's units: {analysis.get('today_units', 0)} kWh
        - 7-day daily average: {analysis.get('daily_avg', 0)} kWh
        - Night usage vs Day usage: {analysis.get('night_units', 0)} kWh vs {analysis.get('day_units', 0)} kWh
        
        FORMAT RULES:
        - Return the response strictly as a JSON array of objects.
        - Do NOT wrap in markdown code blocks like ```json ... ```. Just raw JSON.
        - Each object must have these exactly 5 keys: "title", "description", "type", "potentialSaving", "recommended_actions".
        - "title": Short punchy title (2-4 words).
        - "description": 1-2 sentences of specific, data-driven advice referring to the data provided.
        - "type": Must be one of ["alert", "tip", "warning", "schedule", "good"]. Use "alert" for severe spikes, "warning" for high usage/trends, "tip" for general advice, "good" for efficient usage, "schedule" for timing advice.
        - "potentialSaving": A realistic estimated saving amount in ₹ (number only, e.g., 150).
        - "recommended_actions": An array of exactly 3 highly specific, data-driven strings. DO NOT use generic advice (like "Use eco-mode"). Instead, calculate metrics based on the provided data. For example: ["Heater contributes 51% of total monthly usage.", "Reducing runtime by 2 hours/day may save ₹1800/month.", "Shifting usage away from 6PM-10PM peak reduces load by 15%."]. Make the math roughly correlate with the provided consumption and bill data.
        
        Example:
        [
          {{
            "title": "Optimize AC Usage",
            "description": "Your AC is the top consumer (120 kWh). Setting it to 24°C can reduce your bill significantly.",
            "type": "tip",
            "potentialSaving": 250,
            "recommended_actions": ["AC accounts for 40% of your total energy cost.", "Increasing temp by 2°C saves approx ₹250/mo.", "Running it 1 hour less daily cuts 30 kWh/mo."]
          }}
        ]
        """

        # Use hardcoded list of preferred models (excluding retired gemini-1.5-flash)
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest",
            "gemini-flash-lite-latest"
        ]
            
        import time
        response = None
        last_error = None
        
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                print(f"Successfully used model: {model}")
                break
            except Exception as e:
                # If rate limited (429) or temporary service unavailable (503/500), retry after 1.2 seconds
                if "429" in str(e) or "503" in str(e):
                    print(f"Temporary error ({e}) for model {model}. Retrying in 1.2 seconds...")
                    time.sleep(1.2)
                    try:
                        response = client.models.generate_content(
                            model=model,
                            contents=prompt,
                        )
                        print(f"Successfully used model after retry: {model}")
                        break
                    except Exception as retry_e:
                        print(f"Retry failed for model {model}: {retry_e}")
                        e = retry_e
                last_error = e
                print(f"Model {model} failed: {e}. Trying next...")
                continue
        
        if not response:
            if last_error:
                raise last_error
            return None

        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        clean_text = clean_text.strip()
        insights = json.loads(clean_text)
        
        # Add metadata for UI
        type_meta = {
            "warning": {"icon": "⚠️", "type": "warning"},
            "tip": {"icon": "💡", "type": "tip"},
            "schedule": {"icon": "📅", "type": "schedule"},
            "alert": {"icon": "🔴", "type": "alert"},
            "good": {"icon": "✅", "type": "good"}
        }
        
        for idx, ins in enumerate(insights):
            ins["id"] = f"ai_insight_{idx}"
            meta = type_meta.get(ins.get("type", "tip"), {"icon": "✨", "type": "tip"})
            ins["icon"] = meta["icon"]
            ins["type"] = meta["type"]
            if "potentialSaving" not in ins:
                ins["potentialSaving"] = 0
            
        return insights

    except Exception as e:
        print("Error generating AI insights:", e)
        return None

def get_chat_response(message, context=None):
    try:
        prompt = f"""
        {context}
        
        User: {message}
        Personal Energy Analyst:"""
        # Use hardcoded list of preferred models (excluding retired gemini-1.5-flash)
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest",
            "gemini-flash-lite-latest"
        ]
            
        import time
        last_error = None
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                print(f"Chat successfully used model: {model}")
                return response.text
            except Exception as e:
                # If rate limited (429) or temporary service unavailable (503/500), retry after 1.2 seconds
                if "429" in str(e) or "503" in str(e):
                    print(f"Temporary error ({e}) for chat model {model}. Retrying in 1.2 seconds...")
                    time.sleep(1.2)
                    try:
                        response = client.models.generate_content(
                            model=model,
                            contents=prompt,
                        )
                        print(f"Chat successfully used model after retry: {model}")
                        return response.text
                    except Exception as retry_e:
                        print(f"Retry failed for chat model {model}: {retry_e}")
                        e = retry_e
                last_error = e
                print(f"Chat model {model} failed: {e}. Trying next...")
                continue
                
        # If all models failed
        if last_error and "429" in str(last_error):
            return "I am currently processing too many requests. Please wait a few seconds and try again."
        return "I'm having trouble analyzing your energy data right now. Could you please try again later?"
    except Exception as e:
        print("Error in chat:", e)
        return "I am experiencing technical difficulties. Please try again later."