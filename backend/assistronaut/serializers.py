from rest_framework import serializers


class MedicalProfileSerializer(serializers.Serializer):
    known_conditions = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    allergies = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    baseline_bone_assessment = serializers.CharField(required=False, allow_null=True, default=None)
    notes = serializers.CharField(required=False, allow_null=True, default=None)


class HealthDataSerializer(serializers.Serializer):
    latest_bone_scan = serializers.CharField(required=False, allow_null=True, default=None)
    exercise_adherence = serializers.CharField(required=False, allow_null=True, default=None)
    immune_biomarkers = serializers.CharField(required=False, allow_null=True, default=None)
    last_physical = serializers.CharField(required=False, allow_null=True, default=None)
    reported_symptoms = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class MissionSerializer(serializers.Serializer):
    name = serializers.CharField(default="ARES-01")
    destination = serializers.CharField(default="Mars")
    phase = serializers.CharField(default="Interplanetary transit")
    mission_day = serializers.IntegerField(default=126)
    planned_duration_days = serializers.IntegerField(default=900)
    gravity_exposure = serializers.CharField(default="Microgravity during transit")


class AstronautContextSerializer(serializers.Serializer):
    id = serializers.CharField(default="AST-001")
    name = serializers.CharField(default="Commander Alex Rivera")
    age = serializers.IntegerField(default=35)
    mission = MissionSerializer()
    medical_profile = MedicalProfileSerializer(required=False, default=dict)
    health_data = HealthDataSerializer(required=False, default=dict)


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField()


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField()
    astronaut_id = serializers.CharField(required=False, allow_null=True, default=None)
    astronaut_context = AstronautContextSerializer(required=False, allow_null=True, default=None)
    conversation_history = ChatMessageSerializer(many=True, required=False, default=list)
    conversation_id = serializers.CharField(required=False, allow_null=True, default=None)


class SourceSerializer(serializers.Serializer):
    title = serializers.CharField()
    url = serializers.CharField()
    source = serializers.CharField()


class ChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    intent = serializers.CharField()
    sources = SourceSerializer(many=True, default=list)
    escalation_flag = serializers.BooleanField(default=False)
    escalation_reason = serializers.CharField(allow_null=True, required=False, default=None)
    suggested_followup = serializers.ListField(child=serializers.CharField(), default=list)
    conversation_id = serializers.CharField()
