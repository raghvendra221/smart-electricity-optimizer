from django.contrib import admin
from django.urls import path,include
from insight.views import ApplyAutomationView, ChatView, RemoveAutomationView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/appliances/', include('appliances.urls')),
    path('api/usage/', include('usage.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/insight/', include('insight.urls')),
    path('api/automation/apply/', ApplyAutomationView.as_view()),
    path('api/automation/remove/', RemoveAutomationView.as_view()),
    path('api/chat/', ChatView.as_view()),
]
