from django.db import models


class Destination(models.Model):
    class BodyType(models.TextChoices):
        PLANET = "planet", "Planet"
        MOON = "moon", "Moon"
        STAR = "star", "Star"

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    body_type = models.CharField(max_length=10, choices=BodyType.choices)
    orbits = models.CharField(max_length=100, blank=True)
    summary = models.TextField(blank=True)

    radius_km = models.FloatField(null=True, blank=True)
    gravity_ms2 = models.FloatField(null=True, blank=True)

    temp_min_c = models.FloatField(null=True, blank=True)
    temp_max_c = models.FloatField(null=True, blank=True)
    temp_mean_c = models.FloatField(null=True, blank=True)

    atmosphere_summary = models.TextField(blank=True)
    atmosphere_composition = models.JSONField(default=dict, blank=True)  # {"CO2": 95.3, ...} in %
    surface_pressure_kpa = models.FloatField(null=True, blank=True)

    radiation_msv_per_day = models.FloatField(null=True, blank=True)
    radiation_notes = models.TextField(blank=True)

    day_length_hours = models.FloatField(null=True, blank=True)
    year_length_days = models.FloatField(null=True, blank=True)
    distance_from_sun_au = models.FloatField(null=True, blank=True)

    extra_facts = models.JSONField(default=list, blank=True)  # list of strings

    comm_delay_min_s = models.FloatField(null=True, blank=True)  # one-way radio delay, seconds
    comm_delay_max_s = models.FloatField(null=True, blank=True)
    one_way_trip_days = models.FloatField(null=True, blank=True)  # typical transit time from Earth

    class Meta:
        ordering = ["distance_from_sun_au", "name"]

    def __str__(self):
        return self.name