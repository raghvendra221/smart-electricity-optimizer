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

        # Dynamically fetch available models
        try:
            available_models = [m.name.replace("models/", "") for m in client.models.list()]
            
            # Prioritize flash or pro models if available
            preferred = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-flash-latest"]
            models_to_try = [m for m in preferred if m in available_models] + available_models
            if not models_to_try:
                models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash"]
        except Exception:
            models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
            
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
                last_error = e
                print(f"Model {model} failed, trying next...")
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
        You are an AI Electricity Usage Assistant for the Smart Electricity Optimizer app. 
        Your goal is to help users understand their energy consumption and save money.
        Be professional, friendly, and concise.
        
        User Context: {context}
        
        User: {message}
        AI Assistant:"""
        
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print("Error in chat:", e)
        return "I'm here to help! Could you please rephrase that or ask about something else related to your electricity usage?"