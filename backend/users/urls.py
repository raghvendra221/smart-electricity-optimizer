from django.urls import path
from .views import RegisterView, LoginView,TestProtectedView

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('test/', TestProtectedView.as_view()),
]