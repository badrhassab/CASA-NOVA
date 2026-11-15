from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DestinationViewSet, MissionViewSet, AstronautViewSet,
    MissionCrewViewSet, EclssTelemetryViewSet, HealthBiometricViewSet,
    FoodInventoryViewSet, DailyNutritionTargetViewSet, MealLogViewSet,
    MedicalChatLogViewSet, astronaut_login, consult_medical_ai, get_astronaut_missions,
)
from .nutrition import (
    nutrition_alerts, nutrition_catalog, nutrition_delete_meal,
    nutrition_log_hydration, nutrition_log_meal, nutrition_recommendations,
    nutrition_request_review, nutrition_summary, nutrition_day_analysis,
)

router = DefaultRouter()
router.register(r'destinations', DestinationViewSet)
router.register(r'missions', MissionViewSet)
router.register(r'astronauts', AstronautViewSet)
router.register(r'crew', MissionCrewViewSet)
router.register(r'eclss', EclssTelemetryViewSet)
router.register(r'biometrics', HealthBiometricViewSet)
router.register(r'food', FoodInventoryViewSet)
router.register(r'nutrition-targets', DailyNutritionTargetViewSet)
router.register(r'meals', MealLogViewSet)
router.register(r'chat', MedicalChatLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('ai/consult/', consult_medical_ai, name='consult-medical-ai'),
    path('auth/login/', astronaut_login, name='astronaut-login'),
    path('my-missions/', get_astronaut_missions, name='my-astronaut-missions'),
    path('nutrition/catalog/', nutrition_catalog, name='nutrition-catalog'),
    path('nutrition/summary/', nutrition_summary, name='nutrition-summary'),
    path('nutrition/alerts/', nutrition_alerts, name='nutrition-alerts'),
    path('nutrition/recommendations/', nutrition_recommendations, name='nutrition-recommendations'),
    path('nutrition/me/day-analysis/', nutrition_day_analysis, name='nutrition-day-analysis'),
    path('nutrition/meals/', nutrition_log_meal, name='nutrition-log-meal'),
    path('nutrition/meals/<uuid:meal_id>/', nutrition_delete_meal, name='nutrition-delete-meal'),
    path('nutrition/hydration/', nutrition_log_hydration, name='nutrition-log-hydration'),
    path('nutrition/reviews/', nutrition_request_review, name='nutrition-request-review'),
]
