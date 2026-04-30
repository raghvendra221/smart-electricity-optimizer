from django.urls import path
from .views import GeminiInsightsView

urlpatterns = [
   path('ai-insights/', GeminiInsightsView.as_view()),   
]




