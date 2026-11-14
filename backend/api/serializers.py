from rest_framework import serializers
from .models import Destination

EARTH_G = 9.80665


class DestinationSerializer(serializers.ModelSerializer):
    gravity_g = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = "__all__"

    def get_gravity_g(self, obj):
        return round(obj.gravity_ms2 / EARTH_G, 3) if obj.gravity_ms2 else None