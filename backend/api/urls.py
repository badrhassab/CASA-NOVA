from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("destinations/", views.DestinationList.as_view()),
    path("destinations/<slug:slug>/", views.DestinationDetail.as_view()),
    path("life-support/", views.life_support_start),
    path("life-support/step/", views.life_support_step),
]