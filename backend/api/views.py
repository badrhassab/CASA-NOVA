from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Destination
from .serializers import DestinationSerializer
from .life_support import MODES, NUMERIC, SCENARIOS, START, step

@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "project": "CASA-NOVA"})


class DestinationList(generics.ListAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer


class DestinationDetail(generics.RetrieveAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    lookup_field = "slug"

@api_view(["GET"])
def life_support_start(request):
    """Starting telemetry for a new session."""
    return Response(START)

@api_view(["POST"])
def life_support_step(request):
    """Body: {state, mode: cabin|eva, scenario: nominal|scrubber|leak}.
    Returns the state one second later."""
    mode = request.data.get("mode", "cabin")
    scenario = request.data.get("scenario", "nominal")
    if mode not in MODES or scenario not in SCENARIOS:
        return Response({"error": "Invalid mode or scenario."}, status=400)
    try:
        raw = request.data["state"]
        state = {k: float(raw[k]) for k in NUMERIC}
        state["hist"] = [float(x) for x in raw["hist"]][-40:]
    except (KeyError, TypeError, ValueError):
        return Response({"error": "State is missing or malformed."}, status=400)
    return Response(step(state, mode, scenario))