from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat_view, name='assistronaut-chat'),
    path('context/', views.context_view, name='assistronaut-context'),
    path('ingest/', views.ingest_view, name='assistronaut-ingest'),
    path('health/', views.health_view, name='assistronaut-health'),
]
