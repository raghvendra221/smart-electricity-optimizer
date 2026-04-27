from django.urls import path
from .views import AddUsageView, UsageSummaryView, ApplianceUsageView

urlpatterns = [
    path('add/', AddUsageView.as_view()),
    path('summary/', UsageSummaryView.as_view()),
    path('appliance/', ApplianceUsageView.as_view()),
]