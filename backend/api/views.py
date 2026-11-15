from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.utils.crypto import constant_time_compare
from django.db.models import Sum
from .models import (
    Destination, Mission, Astronaut, MissionCrew,
    EclssTelemetry, HealthBiometric, FoodInventory,
    DailyNutritionTarget, MealLog, MedicalChatLog
)
from .serializers import (
    DestinationSerializer, MissionSerializer, AstronautSerializer,
    MissionCrewSerializer, EclssTelemetrySerializer, HealthBiometricSerializer,
    FoodInventorySerializer, DailyNutritionTargetSerializer, MealLogSerializer,
    MedicalChatLogSerializer
)
from .nasa_cdss import diagnose_symptom

ASTRONAUT_SESSION_SALT = 'nasa-health.astronaut-session'
ASTRONAUT_SESSION_MAX_AGE = 60 * 60 * 8


@api_view(['POST'])
def astronaut_login(request):
    """Verify a crew member's full name and password hash."""
    username = request.data.get('username', '')
    password = request.data.get('password', '')
    if not isinstance(username, str) or not isinstance(password, str) or not username.strip() or not password or len(password) > 1024:
        return Response({'error': 'Nom complet ou mot de passe invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    astronaut = Astronaut.objects.filter(full_name__iexact=username.strip()).first()
    password_matches = False
    if astronaut and astronaut.password:
        password_matches = check_password(password, astronaut.password)
        # Upgrade a legacy clear-text value after a successful login. New and
        # reset passwords are always written as Django hashes.
        if not password_matches and constant_time_compare(password, astronaut.password):
            Astronaut.objects.filter(pk=astronaut.pk).update(password=make_password(password))
            password_matches = True

    if not password_matches:
        return Response({'error': 'Nom complet ou mot de passe incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)

    token = signing.dumps({'astronaut_id': str(astronaut.id)}, salt=ASTRONAUT_SESSION_SALT)
    return Response({
        'access_token': token,
        'astronaut': {
            'id': str(astronaut.id),
            'full_name': astronaut.full_name,
            'callsign': astronaut.callsign,
            'role': astronaut.role,
        },
    })


def get_authenticated_astronaut(request):
    """Resolve the signed, expiring login token and return its crew member."""
    auth_header = request.headers.get('Authorization', '')
    scheme, _, token = auth_header.partition(' ')
    if scheme.lower() != 'bearer' or not token:
        return None
    try:
        session = signing.loads(token, salt=ASTRONAUT_SESSION_SALT, max_age=ASTRONAUT_SESSION_MAX_AGE)
        if not isinstance(session, dict):
            return None
        return Astronaut.objects.filter(id=session.get('astronaut_id')).first()
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return None


@api_view(['GET'])
def get_astronaut_missions(request):
    """Return only missions assigned to the authenticated astronaut."""
    astronaut = get_authenticated_astronaut(request)
    if not astronaut:
        return Response({'error': 'Your session has expired. Please sign in again.'}, status=status.HTTP_401_UNAUTHORIZED)

    assignments = MissionCrew.objects.filter(
        astronaut_id=astronaut.id
    ).select_related('mission', 'mission__destination').order_by('mission__start_date', 'mission__mission_code')

    missions = []
    for assignment in assignments:
        mission_data = MissionSerializer(assignment.mission).data
        mission_data['crew_assignment'] = {
            'crew_role': assignment.crew_role,
            'eva_qualified': assignment.eva_qualified,
            'assigned_at': assignment.assigned_at,
        }
        missions.append(mission_data)

    return Response({
        'astronaut': {
            'id': str(astronaut.id),
            'full_name': astronaut.full_name,
        },
        'missions': missions,
    })

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().order_by('name')
    serializer_class = DestinationSerializer

class MissionViewSet(viewsets.ModelViewSet):
    queryset = Mission.objects.all().order_by('-start_date')
    serializer_class = MissionSerializer

class AstronautViewSet(viewsets.ModelViewSet):
    queryset = Astronaut.objects.all().order_by('full_name')
    serializer_class = AstronautSerializer

class MissionCrewViewSet(viewsets.ModelViewSet):
    queryset = MissionCrew.objects.all()
    serializer_class = MissionCrewSerializer

class EclssTelemetryViewSet(viewsets.ModelViewSet):
    queryset = EclssTelemetry.objects.all().order_by('-recorded_at')
    serializer_class = EclssTelemetrySerializer

class HealthBiometricViewSet(viewsets.ModelViewSet):
    queryset = HealthBiometric.objects.all().order_by('-recorded_at')
    serializer_class = HealthBiometricSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        astronaut_id = self.request.query_params.get('astronaut_id')
        if astronaut_id:
            qs = qs.filter(astronaut_id=astronaut_id)
        return qs

class FoodInventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FoodInventory.objects.all().order_by('item_name')
    serializer_class = FoodInventorySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category and category != 'ALL':
            qs = qs.filter(category=category)
        return qs

class DailyNutritionTargetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailyNutritionTarget.objects.all()
    serializer_class = DailyNutritionTargetSerializer

    def get_queryset(self):
        astronaut = get_authenticated_astronaut(self.request)
        return super().get_queryset().filter(astronaut_id=astronaut.id) if astronaut else super().get_queryset().none()

    def create(self, request, *args, **kwargs):
        return Response({'error': 'Nutrition targets are managed by mission control.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def update(self, request, *args, **kwargs):
        return Response({'error': 'Nutrition targets are managed by mission control.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    partial_update = update

    def destroy(self, request, *args, **kwargs):
        return Response({'error': 'Nutrition targets are managed by mission control.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

class MealLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MealLog.objects.all().order_by('-logged_at')
    serializer_class = MealLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        astronaut = get_authenticated_astronaut(self.request)
        return qs.filter(astronaut_id=astronaut.id) if astronaut else qs.none()

class MedicalChatLogViewSet(viewsets.ModelViewSet):
    queryset = MedicalChatLog.objects.all().order_by('created_at')
    serializer_class = MedicalChatLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        astronaut_id = self.request.query_params.get('astronaut_id')
        if astronaut_id:
            qs = qs.filter(astronaut_id=astronaut_id)
        return qs

# -----------------------------------------------------------------------------
# LOGIQUE METIER HRP : AI SYMPTOM CHECKER CONSULTATION
# -----------------------------------------------------------------------------
@api_view(['POST'])
def consult_medical_ai(request):
    """
    Diagnostique les symptômes soumis par l'astronaute en appliquant les règles NASA HRP.
    """
    message_text = request.data.get('message_text', '')
    astronaut = get_authenticated_astronaut(request)
    if not astronaut:
        return Response({'error': 'Your session has expired. Please sign in again.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not isinstance(message_text, str) or not message_text.strip():
        return Response({'error': 'message_text is required'}, status=status.HTTP_400_BAD_REQUEST)

    astronaut_id = astronaut.id
    # Enregistrer le message une fois l'identité vérifiée.
    user_log = MedicalChatLog.objects.create(
        astronaut_id=astronaut_id,
        sender='ASTRONAUT',
        message_text=message_text
    )
    diag = diagnose_symptom(message_text, astronaut=astronaut)

    # Répondre en s'adressant à la personne connectée.
    greeting = f"Astronaute {astronaut.full_name}, voici mon évaluation :"
    ai_reply_text = f"{greeting}\n\n{diag['explanation']}\n\nProtocole et contre-mesures recommandés :\n{diag['countermeasure']}"
    ai_log = MedicalChatLog.objects.create(
        astronaut_id=astronaut_id,
        sender='AI_FLIGHT_SURGEON',
        message_text=ai_reply_text,
        hrp_hazard_tag=diag['hazard'],
        triage_level=diag['triage'],
        suggested_countermeasure=diag['countermeasure']
    )

    return Response({
        'astronaut_message': MedicalChatLogSerializer(user_log).data,
        'ai_response': MedicalChatLogSerializer(ai_log).data,
        'diagnostic': diag
    }, status=status.HTTP_201_CREATED)

# -----------------------------------------------------------------------------
# LOGIQUE METIER HRP : NUTRITION GAPS & SUMMARY
# -----------------------------------------------------------------------------
@api_view(['GET'])
def get_nutrition_summary(request):
    """Backward-compatible name; identity is always taken from the session token."""
    from .nutrition import nutrition_summary
    return nutrition_summary(request)
