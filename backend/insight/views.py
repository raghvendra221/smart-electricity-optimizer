from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from usage.models import Usage
from .gemini_ai import generate_ai_insights
import re

class GeminiInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usages = Usage.objects(user=request.user)

        if not usages:
            return Response({
                "total_units": 0,
                "total_cost": 0,
                "top_appliance": None,
                "insights": []
            })

        # Calculate total consumption
        total_units = sum(u.units_consumed for u in usages)
        total_cost = sum(u.units_consumed * 9 for u in usages)  # ₹9 per unit (adjust as needed)

        # Calculate appliance breakdown
        appliance_data = {}
        appliance_cost = {}
        for u in usages:
            name = u.appliance.name
            cost_unit = 9  # ₹9 per unit
            units = u.units_consumed
            cost = units * cost_unit
            
            appliance_data[name] = appliance_data.get(name, 0) + units
            appliance_cost[name] = appliance_cost.get(name, 0) + cost

        # Find top appliance
        top_appliance = max(appliance_data.items(), key=lambda x: x[1])[0] if appliance_data else None
        top_appliance_cost = appliance_cost.get(top_appliance, 0) if top_appliance else 0

        # Prepare data for AI analysis
        data = {
            "total_units": round(total_units, 2),
            "total_cost": round(total_cost, 2),
            "top_appliance": top_appliance,
            "appliances": appliance_data
        }

        # Get AI insights
        ai_response = generate_ai_insights(data)
        
        # Parse AI response into structured insights
        insights = self._parse_ai_insights(ai_response, appliance_data, appliance_cost, total_cost)

        return Response({
            "total_units": round(total_units, 2),
            "total_cost": round(total_cost, 2),
            "top_appliance": top_appliance,
            "top_appliance_cost": round(top_appliance_cost, 2),
            "appliances": appliance_data,
            "appliance_costs": appliance_cost,
            "insights": insights
        })

    def _parse_ai_insights(self, ai_response, appliance_data, appliance_cost, total_cost):
        """Parse AI response and structure insights with metadata"""
        insights = []
        
        # Split AI response into lines/points
        lines = [line.strip() for line in ai_response.split('\n') if line.strip()]
        
        # Default insight types and icons mapping
        insight_types = [
            {'type': 'warning', 'icon': '⚠️'},
            {'type': 'tip', 'icon': '💡'},
            {'type': 'alert', 'icon': '🔴'},
        ]
        
        for idx, line in enumerate(lines[:3]):  # Take first 3 insights
            # Remove numbering (1., 2., 3., etc.)
            clean_text = re.sub(r'^\d+\.\s*', '', line)
            
            # Determine type and icon
            type_config = insight_types[idx % len(insight_types)]
            
            # Estimate potential saving (5-15% of total cost)
            potential_saving = round((total_cost * (0.05 + idx * 0.05)), 2)
            
            # Split title and description
            parts = clean_text.split(':', 1)
            title = parts[0].strip()[:50]
            description = parts[1].strip() if len(parts) > 1 else clean_text
            
            insight = {
                "id": f"insight_{idx}",
                "title": title,
                "description": description,
                "type": type_config['type'],
                "icon": type_config['icon'],
                "potentialSaving": potential_saving
            }
            insights.append(insight)
        
        # If no insights from AI, create default ones
        if not insights:
            insights = [
                {
                    "id": "insight_0",
                    "title": "Reduce Peak Usage",
                    "description": "Your peak usage hours have the highest electricity cost. Try shifting non-essential tasks to off-peak hours.",
                    "type": "tip",
                    "icon": "💡",
                    "potentialSaving": round(total_cost * 0.10, 2)
                },
                {
                    "id": "insight_1", 
                    "title": "Monitor Top Appliance",
                    "description": f"Your {list(appliance_data.keys())[0]} consumes the most energy. Consider upgrading to an energy-efficient model.",
                    "type": "warning",
                    "icon": "⚠️",
                    "potentialSaving": round(total_cost * 0.15, 2)
                }
            ]
        
        return insights