import uuid
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .serializers import ChatRequestSerializer
from .nasa_cdss import AssistronAutEngine
from .db import get_astronaut_context_from_db, log_medical_chat_interaction

HAZARD_TAGS = {
    "bone_question": "bone",
    "immune_question": "immune",
    "symptom_report": "symptom",
    "mission_question": "mission",
    "astronomy_question": "mission_science",
    "countermeasure": "countermeasure",
    "emergency": "medical_emergency",
    "general_health": "general",
}

logger = logging.getLogger(__name__)

# Singleton engine instance (loaded once per Django worker process)
_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = AssistronAutEngine()
    return _engine


@api_view(['GET'])
@permission_classes([AllowAny])
def health_view(request):
    """Health check endpoint to verify Assistronaut backend is running."""
    return Response({'status': 'ok', 'service': 'Assistronaut API', 'version': '1.0.0'})


@api_view(['GET'])
@permission_classes([AllowAny])
def context_view(request):
    """
    Live astronaut context for the chat page.
    GET /api/assistronaut/context/?astronaut_id=<uuid-or-callsign>
    """
    astronaut_id = request.query_params.get('astronaut_id') or None
    context = get_astronaut_context_from_db(
        astronaut_id=astronaut_id,
        user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
    )
    return Response(context, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def chat_view(request):
    """
    Main chat endpoint.
    POST /api/assistronaut/chat/
    """
    serializer = ChatRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    conversation_id = data.get('conversation_id') or str(uuid.uuid4())

    # Dynamically pull from Supabase / Django ORM if context is not explicitly passed
    astronaut_ctx = data.get('astronaut_context')
    if not astronaut_ctx:
        target_id = data.get('astronaut_id')
        astronaut_ctx = get_astronaut_context_from_db(
            astronaut_id=target_id,
            user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        )

    try:
        engine = get_engine()
        result = engine.chat(
            message=data['message'],
            astronaut_context=astronaut_ctx,
            conversation_history=data.get('conversation_history', []),
        )
        result['conversation_id'] = conversation_id
        result['data_source'] = astronaut_ctx.get('data_source')
        log_medical_chat_interaction(
            astronaut_id=str(astronaut_ctx.get('id') or ''),
            session_id=conversation_id,
            user_message=data['message'],
            assistant_response=result.get('response') or '',
            hrp_hazard_tag=HAZARD_TAGS.get(result.get('intent'), 'general'),
            triage_level='EMERGENCY' if result.get('escalation_flag') else (
                'URGENT' if result.get('intent') == 'symptom_report' else 'ROUTINE'
            ),
            suggested_countermeasure=(result.get('suggested_followup') or [None])[0],
        )
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error handling chat request: {e}", exc_info=True)
        return Response(
            {
                'response': f"Assistronaut internal processing error: {str(e)}",
                'intent': 'general_health',
                'sources': [],
                'escalation_flag': False,
                'escalation_reason': None,
                'suggested_followup': [],
                'conversation_id': conversation_id,
            },
            status=status.HTTP_200_OK,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def ingest_view(request):
    """
    Trigger knowledge base ingestion.
    POST /api/assistronaut/ingest/
    """
    try:
        engine = get_engine()
        result = engine.ingest_knowledge_base()
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error ingesting knowledge base: {e}", exc_info=True)
        return Response(
            {'status': 'error', 'message': str(e), 'documents_processed': 0},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
