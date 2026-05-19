from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from usage.models import Usage
from usage.utils import calculate_bill
from appliances.models import Appliance
from .models import AutomationRule
from .gemini_ai import generate_ai_insights, get_chat_response
from bson import ObjectId
import re

from .analytics import analyze_usage, generate_insights, calculate_score

from django.core.cache import cache

class GeminiInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cache_key = f"insights_response_{request.user.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
            
        # 1. Analyze Usage
        analysis = analyze_usage(request.user)
        
        if analysis['monthly_units'] == 0 and analysis['today_units'] == 0:
            return Response({
                "total_units": 0,
                "estimated_bill": 0,
                "top_appliance": None,
                "insights": [],
                "efficiency_score": 100,
                "automated_appliances": []
            })

        # 2. Generate Real Data-Driven Insights
        raw_insights = generate_insights(analysis)
        
        # Add metadata for UI (icons and types are needed by frontend)
        type_meta = {
            "spike": {"icon": "🔴", "type": "alert"},
            "optimization": {"icon": "💡", "type": "tip"},
            "anomaly": {"icon": "⚠️", "type": "warning"}
        }
        
        for ins in raw_insights:
            meta = type_meta.get(ins['type'], {"icon": "✨", "type": "tip"})
            ins.update(meta)

        # 3. AI NLP Improvement (Real Dynamic AI Recommendations)
        insights = generate_ai_insights(analysis)
        if not insights:
            print("Failed to get dynamic AI insights, using fallback")
            for idx, ins in enumerate(raw_insights):
                ins['id'] = f"insight_{idx}"
            insights = raw_insights

        # 4. Calculate Real Efficiency Score
        efficiency = calculate_score(analysis)

        # 5. Get automated appliances feedback
        automated_rules = AutomationRule.objects(user=request.user)
        automated_data = []
        for rule in automated_rules:
            if rule.appliance:
                units = analysis['appliance_data'].get(rule.appliance.name, 0)
                reduction = rule.reduction_percent / 100
                orig_units = units / (1 - reduction) if reduction < 1 else units
                saved_cost = calculate_bill(orig_units - units)
                
                automated_data.append({
                    "id": str(rule.appliance.id),
                    "name": rule.appliance.name,
                    "reduction": rule.reduction_percent,
                    "savings": round(saved_cost, 2)
                })

        response_data = {
            "total_units": round(analysis['monthly_units'], 2),
            "estimated_bill": round(analysis['total_cost'], 2),
            "top_appliance": analysis['top_appliance'],
            "top_appliance_cost": round(calculate_bill(analysis['top_units']), 2),
            "appliances": analysis['appliance_data'],
            "appliance_costs": {name: round(calculate_bill(u), 2) for name, u in analysis['appliance_data'].items()},
            "insights": insights,
            "efficiency_score": efficiency['score'],
            "efficiency_label": efficiency['label'],
            "automated_appliances": automated_data
        }
        
        cache.set(cache_key, response_data, timeout=60*60*24) # Cache for 24 hours
        return Response(response_data)

class ApplyAutomationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            appliance_id = request.data.get("appliance_id")
            if not appliance_id:
                usages = Usage.objects(user=request.user).order_by('-units_consumed').first()
                if usages and usages.appliance:
                    appliance_id = str(usages.appliance.id)
                else:
                    return Response({"error": "No appliance found"}, status=400)

            appliance = Appliance.objects(id=ObjectId(appliance_id), user=request.user).first()
            if not appliance:
                return Response({"error": "Appliance not found"}, status=404)

            rule = AutomationRule.objects(user=request.user, appliance=appliance).first()
            if not rule:
                rule = AutomationRule(user=request.user, appliance=appliance, rule_type="reduce_usage")
            
            rule.reduction_percent = 30
            rule.save()

            cache.delete(f"insights_response_{request.user.id}")

            return Response({
                "message": f"Automation applied: {appliance.name} will now consume 30% less energy.",
                "rule": {
                    "appliance": appliance.name,
                    "reduction": "30%",
                    "type": "Energy Optimization"
                }
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class RemoveAutomationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            appliance_id = request.data.get("appliance_id")
            if not appliance_id:
                usages = Usage.objects(user=request.user).order_by('-units_consumed').first()
                if usages and usages.appliance:
                    appliance_id = str(usages.appliance.id)
                else:
                    return Response({"error": "No appliance found"}, status=400)
            
            appliance = Appliance.objects(id=ObjectId(appliance_id), user=request.user).first()
            if not appliance:
                return Response({"error": "Appliance not found"}, status=404)
            
            AutomationRule.objects(user=request.user, appliance=appliance).delete()
            
            cache.delete(f"insights_response_{request.user.id}")
            
            return Response({"message": f"Automation deactivated for {appliance.name}"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            message = request.data.get("message", "")
            
            # 1. Fetch real-time analysis
            analysis = analyze_usage(request.user)
            
            # 2. Build rich context for Gemini
            appliance_details = ""
            total_units = analysis.get('monthly_units', 0)
            if total_units > 0:
                sorted_appliances = sorted(analysis['appliance_data'].items(), key=lambda item: item[1], reverse=True)
                for name, units in sorted_appliances:
                    percentage = round((units / total_units) * 100, 1)
                    appliance_details += f"  - {name}: {round(units, 1)} kWh ({percentage}% of total)\n"
            else:
                appliance_details = "  - No appliance usage logged yet."

            today_mult = round(analysis['today_units'] / max(analysis['daily_avg'], 1), 1)

            context = f"""
            You are a "Personal Energy Analyst". Your job is to answer queries using the exact data provided below. Do not use generic answers; ALWAYS use the data.

            DATA SUMMARY:
            - Current Bill Estimated: ₹{round(analysis['total_cost'], 2)}
            - Total Monthly Usage: {round(analysis['monthly_units'], 1)} kWh
            - Today's Usage: {round(analysis['today_units'], 1)} kWh (7-Day Average: {round(analysis['daily_avg'], 1)} kWh)
            - Today's usage is {today_mult}x the daily average.
            - Total Savings: ₹{round(calculate_bill(analysis['savings_monthly']), 2)}
            
            APPLIANCE BREAKDOWN (Highest to Lowest):
{appliance_details}
            
            GUIDELINES FOR YOUR BEHAVIOR:
            1. Explain High Consumption: If asked why a bill is high, explicitly name the top contributing appliances and their % contribution. Suggest specific hour/runtime reductions and calculate the ₹ savings.
            2. Appliance-Specific Suggestions: If asked about a specific appliance, mention its exact kWh usage and provide 3 actionable bullet points (like eco-mode, temp adjustments, avoiding peak hours) with estimated ₹ savings.
            3. Anomaly Detection: If asked about unusual activity, compare today's usage with the daily average. State if it's "X times higher" and blame the top appliance.
            4. Bill Forecasting: If asked about the bill, quote the exact "Current Bill Estimated" above, and suggest how optimizations can reduce it.
            5. Smart Comparisons: If asked what wastes the most electricity, output a numbered list of the top appliances and their kWh.

            Maintain a highly intelligent, analytical, and data-driven tone. Keep responses extremely concise and to the point.
            """
            
            reply = get_chat_response(message, context)
            return Response({"reply": reply})
        except Exception as e:
            return Response({"reply": "I'm having trouble analyzing your energy data right now. Could you please try again?"}, status=200)