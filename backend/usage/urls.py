from django.urls import path
from .views import AddUsageView, UsageSummaryView, ApplianceUsageView, BillPredictionView,UsageHistoryView,UsageLogsView

urlpatterns = [
    path('add/', AddUsageView.as_view()),
    path('summary/', UsageSummaryView.as_view()),
    path('appliance/', ApplianceUsageView.as_view()),
    path('predict/', BillPredictionView.as_view()),
    path('history/', UsageHistoryView.as_view()),
    path('logs/', UsageLogsView.as_view()),
]