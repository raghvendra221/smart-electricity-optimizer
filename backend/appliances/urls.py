from django.urls import path
from .views import (
    AddApplianceView,
    ListApplianceView,
    UpdateApplianceView,
    DeleteApplianceView,
    ApplianceStatsView,

)

urlpatterns = [
    path('', ListApplianceView.as_view()),
    path('add/', AddApplianceView.as_view()),
    path('stats/', ApplianceStatsView.as_view()),
    # path('insights/', InsightsView.as_view()),
    path('<str:id>/', UpdateApplianceView.as_view()),
    path('<str:id>/delete/', DeleteApplianceView.as_view()),
]