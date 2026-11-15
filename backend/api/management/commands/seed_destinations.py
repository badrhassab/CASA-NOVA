from django.core.management.base import BaseCommand
from api.models import Destination

DATA = [
    dict(
        slug="mars", name="Mars", body_type="planet", orbits="Sun",
        summary="A cold, dusty desert world with the most Earth-like day of any other planet.",
        radius_km=3389.5, gravity_ms2=3.72,
        temp_min_c=-140, temp_max_c=20, temp_mean_c=-63,
        atmosphere_summary="Thin and carbon-dioxide-dominated; breathable by nothing we know of.",
        atmosphere_composition={"Carbon dioxide": 95.3, "Nitrogen": 2.7, "Argon": 1.6},
        surface_pressure_kpa=0.636,
        radiation_msv_per_day=0.67,
        radiation_notes="Measured at the surface by Curiosity's RAD instrument. No global magnetic field and a thin atmosphere offer little shielding.",
        day_length_hours=24.62, year_length_days=687, distance_from_sun_au=1.524,
        extra_facts=["A Martian day is called a sol.", "Dust storms can cover the whole planet."],
        comm_delay_min_s=1.2, comm_delay_max_s=1.4, one_way_trip_days=3,
    ),
    dict(
        slug="moon", name="Moon", body_type="moon", orbits="Earth",
        summary="Earth's only natural satellite and the nearest crewed destination.",
        radius_km=1737.4, gravity_ms2=1.62,
        temp_min_c=-173, temp_max_c=127,
        atmosphere_summary="Essentially none, only a trace exosphere. A pressurized suit or habitat is required.",
        atmosphere_composition={},
        radiation_msv_per_day=1.37,
        radiation_notes="Measured on the surface by Chang'e-4. Solar flares can add a much larger dose.",
        day_length_hours=708.7, distance_from_sun_au=1.0,
        extra_facts=["Day length is the synodic day: about 29.5 Earth days of sunrise-to-sunrise.", "Permanently shadowed polar craters may hold water ice."],
        comm_delay_min_s=180, comm_delay_max_s=1320, one_way_trip_days=210,
    ),
    dict(
        slug="venus", name="Venus", body_type="planet", orbits="Sun",
        summary="The hottest planet, with a crushing atmosphere and sulfuric acid clouds.",
        radius_km=6051.8, gravity_ms2=8.87,
        temp_mean_c=464,
        atmosphere_summary="Extremely dense carbon dioxide with clouds of sulfuric acid.",
        atmosphere_composition={"Carbon dioxide": 96.5, "Nitrogen": 3.5},
        surface_pressure_kpa=9200,
        radiation_notes="The dense atmosphere blocks most space radiation at the surface. The extreme heat and pressure are the real hazards.",
        day_length_hours=5832.5, year_length_days=224.7, distance_from_sun_au=0.723,
        extra_facts=["It spins backwards (retrograde) compared with most planets.", "A Venusian day (sidereal) is longer than its year."],
        comm_delay_min_s=126, comm_delay_max_s=870, one_way_trip_days=150,
    ),
    dict(
        slug="europa", name="Europa", body_type="moon", orbits="Jupiter",
        summary="An ice-covered moon with a global subsurface ocean, a top target in the search for life.",
        radius_km=1560.8, gravity_ms2=1.315,
        temp_min_c=-220, temp_max_c=-150, temp_mean_c=-160,
        atmosphere_summary="A very thin oxygen exosphere.",
        atmosphere_composition={},
        radiation_msv_per_day=5400,
        radiation_notes="Estimated surface dose from Jupiter's radiation belts, lethal to humans within a day or so without heavy shielding.",
        day_length_hours=85.2, year_length_days=4332.6, distance_from_sun_au=5.2,
        extra_facts=["Day length equals its orbital period because it is tidally locked to Jupiter."],
        comm_delay_min_s=1980, comm_delay_max_s=3240, one_way_trip_days=2000,
    ),
    dict(
        slug="sun", name="The Sun", body_type="star", orbits="",
        summary="A G2V main-sequence star, 99.8% of the mass of the solar system.",
        radius_km=695700, gravity_ms2=274,
        temp_mean_c=5505,
        atmosphere_summary="No solid surface. The visible layer (photosphere) is about 5,772 K.",
        atmosphere_composition={"Hydrogen": 73.5, "Helium": 24.9, "Other": 1.6},
        radiation_notes="Emits the full spectrum plus the solar wind. Flares and coronal mass ejections drive space weather.",
        day_length_hours=609.1,
        extra_facts=["Day length here is the equatorial rotation period (about 25.4 days).", "Temperature shown is the photosphere; the corona exceeds 1,000,000 K."],
        comm_delay_min_s=499, comm_delay_max_s=499,
    ),
]


class Command(BaseCommand):
    help = "Seed or update destination data"

    def handle(self, *args, **opts):
        for row in DATA:
            obj, created = Destination.objects.update_or_create(slug=row["slug"], defaults=row)
            self.stdout.write(f"{'Created' if created else 'Updated'} {obj.name}")