from rest_framework import serializers
from .models import (
    Destination, Mission, Astronaut, MissionCrew,
    EclssTelemetry, HealthBiometric, FoodInventory,
    DailyNutritionTarget, MealLog, MedicalChatLog
)

class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = '__all__'

class MissionSerializer(serializers.ModelSerializer):
    destination_id = serializers.UUIDField(read_only=True)
    destination_details = DestinationSerializer(source='destination', read_only=True)
    class Meta:
        model = Mission
        fields = (
            'id', 'mission_code', 'name', 'destination_id', 'start_date', 'end_date',
            'mission_day', 'current_phase', 'progress_percent', 'status', 'created_at',
            'destination_details',
        )

class AstronautSerializer(serializers.ModelSerializer):
    class Meta:
        model = Astronaut
        exclude = ('password',)

class MissionCrewSerializer(serializers.ModelSerializer):
    astronaut_details = AstronautSerializer(source='astronaut', read_only=True)
    class Meta:
        model = MissionCrew
        fields = '__all__'

class EclssTelemetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = EclssTelemetry
        fields = '__all__'

class HealthBiometricSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthBiometric
        fields = '__all__'

class FoodInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodInventory
        fields = '__all__'

class DailyNutritionTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyNutritionTarget
        fields = '__all__'

class MealLogSerializer(serializers.ModelSerializer):
    food_details = FoodInventorySerializer(source='food', read_only=True)
    class Meta:
        model = MealLog
        fields = '__all__'

class MedicalChatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalChatLog
        fields = '__all__'
