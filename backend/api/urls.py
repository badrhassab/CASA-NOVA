from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DestinationViewSet, MissionViewSet, AstronautViewSet,
    MissionCrewViewSet, EclssTelemetryViewSet, HealthBiometricViewSet,
    FoodInventoryViewSet, DailyNutritionTargetViewSet, MealLogViewSet,
    MedicalChatLogViewSet, astronaut_login, consult_medical_ai, get_astronaut_missions,
    get_nutrition_summary
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
    path('nutrition/summary/', get_nutrition_summary, name='nutrition-summary'),
]
