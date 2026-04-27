from django.contrib import admin
from django.urls import path,include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/appliances/', include('appliances.urls')),
    path('api/usage/', include('usage.urls')),
]
