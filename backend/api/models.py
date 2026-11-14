import uuid
from django.db import models

# -----------------------------------------------------------------------------
# 1. DESTINATIONS TABLE (Planetary & Celestial Database)
# -----------------------------------------------------------------------------
class Destination(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    body_type = models.CharField(max_length=50)  # Planet, Moon, Low Earth Orbit
    surface_gravity_g = models.DecimalField(max_digits=5, decimal_places=3)  # 0.166 for Moon, 0.38 for Mars
    temperature_min_c = models.DecimalField(max_digits=5, decimal_places=1)
    temperature_max_c = models.DecimalField(max_digits=5, decimal_places=1)
    radiation_environment_msv_yr = models.DecimalField(max_digits=6, decimal_places=1)
    atmosphere_composition = models.TextField()
    day_length_hours = models.DecimalField(max_digits=6, decimal_places=2)
    earth_comm_delay_seconds = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'destinations'
        managed = False

    def __str__(self):
        return f"{self.name} ({self.body_type})"


# -----------------------------------------------------------------------------
# 2. MISSIONS TABLE
# -----------------------------------------------------------------------------
class Mission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    destination = models.ForeignKey(Destination, on_delete=models.SET_NULL, null=True, db_column='destination_id')
    start_date = models.DateField()
    end_date = models.DateField()
    mission_day = models.IntegerField(default=1)
    current_phase = models.CharField(max_length=100)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'missions'
        managed = False

    def __str__(self):
        return f"{self.mission_code} - {self.name}"


# -----------------------------------------------------------------------------
# 3. ASTRONAUTS TABLE
# -----------------------------------------------------------------------------
class Astronaut(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=100)
    callsign = models.CharField(max_length=50)
    email = models.CharField(max_length=100, unique=True)
    role = models.CharField(max_length=80)
    # Password hash stored in the astronauts table; never expose through the API.
    password = models.TextField(null=True, blank=True)
    blood_type = models.CharField(max_length=10)
    radiation_accumulated_msv = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    baseline_bone_density_tscore = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    avatar_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'astronauts'
        managed = False

    def __str__(self):
        return f"{self.full_name} ({self.callsign})"


# -----------------------------------------------------------------------------
# 4. MISSION CREW TABLE
# -----------------------------------------------------------------------------
class MissionCrew(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, db_column='mission_id')
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE, db_column='astronaut_id')
    crew_role = models.CharField(max_length=80)
    eva_qualified = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mission_crew'
        managed = False
        unique_together = (('mission', 'astronaut'),)


# -----------------------------------------------------------------------------
# 5. ECLSS TELEMETRY TABLE (Life Support & Oxygen)
# -----------------------------------------------------------------------------
class EclssTelemetry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, db_column='mission_id')
    cabin_oxygen_pct = models.DecimalField(max_digits=4, decimal_places=2, default=20.90)
    cabin_oxygen_pp_mmhg = models.DecimalField(max_digits=5, decimal_places=1, default=158.0)
    cabin_pressure_kpa = models.DecimalField(max_digits=5, decimal_places=2, default=101.30)
    co2_scrub_pp_mmhg = models.DecimalField(max_digits=4, decimal_places=2, default=2.20)
    suit_oxygen_reserve_pct = models.DecimalField(max_digits=4, decimal_places=1, default=98.5)
    suit_battery_pct = models.DecimalField(max_digits=4, decimal_places=1, default=95.0)
    cabin_temp_c = models.DecimalField(max_digits=4, decimal_places=1, default=21.5)
    status_level = models.CharField(max_length=20, default='NORMAL')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'eclss_telemetry'
        managed = False


# -----------------------------------------------------------------------------
# 6. HEALTH BIOMETRICS TABLE (Anatomy 3D & NASA HRP Markers)
# -----------------------------------------------------------------------------
class HealthBiometric(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE, db_column='astronaut_id')
    body_system = models.CharField(max_length=50)  # NEURO_OPHTHALMIC, CARDIOVASCULAR, MUSCULOSKELETAL, IMMUNE
    heart_rate_bpm = models.IntegerField()
    blood_pressure_sys = models.IntegerField()
    blood_pressure_dia = models.IntegerField()
    intracranial_pressure_est_mmhg = models.DecimalField(max_digits=4, decimal_places=1)
    optic_disc_edema_grade = models.IntegerField(default=0)  # Frisén Scale 0-4
    t_cell_activity_index = models.DecimalField(max_digits=4, decimal_places=2)
    viral_reactivation_flag = models.BooleanField(default=False)
    bone_density_loss_pct = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    notes = models.TextField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'health_biometrics'
        managed = False


# -----------------------------------------------------------------------------
# 7. FOOD INVENTORY TABLE
# -----------------------------------------------------------------------------
class FoodInventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_name = models.CharField(max_length=120)
    category = models.CharField(max_length=50)  # REHYDRATABLE, THERMOSTABILIZED, READY_TO_EAT
    calories_kcal = models.IntegerField()
    protein_g = models.DecimalField(max_digits=5, decimal_places=1)
    carbs_g = models.DecimalField(max_digits=5, decimal_places=1)
    fat_g = models.DecimalField(max_digits=5, decimal_places=1)
    sodium_mg = models.DecimalField(max_digits=6, decimal_places=1)
    potassium_mg = models.DecimalField(max_digits=6, decimal_places=1)
    calcium_mg = models.DecimalField(max_digits=6, decimal_places=1)
    vitamin_d_iu = models.DecimalField(max_digits=6, decimal_places=1)
    water_required_ml = models.IntegerField(default=0)
    stock_quantity = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'food_inventory'
        managed = False

    def __str__(self):
        return f"{self.item_name} [{self.category}]"


# -----------------------------------------------------------------------------
# 8. DAILY NUTRITION TARGETS
# -----------------------------------------------------------------------------
class DailyNutritionTarget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE, db_column='astronaut_id')
    target_date = models.DateField()
    target_calories_kcal = models.IntegerField(default=2800)
    target_protein_g = models.DecimalField(max_digits=5, decimal_places=1, default=110.0)
    target_water_ml = models.IntegerField(default=2500)
    max_sodium_mg = models.DecimalField(max_digits=6, decimal_places=1, default=2000.0)
    target_calcium_mg = models.DecimalField(max_digits=6, decimal_places=1, default=1200.0)
    target_vitamin_d_iu = models.DecimalField(max_digits=6, decimal_places=1, default=1000.0)
    is_eva_day = models.BooleanField(default=False)

    class Meta:
        db_table = 'daily_nutrition_targets'
        managed = False
        unique_together = (('astronaut', 'target_date'),)


# -----------------------------------------------------------------------------
# 9. MEAL LOGS
# -----------------------------------------------------------------------------
class MealLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE, db_column='astronaut_id')
    food = models.ForeignKey(FoodInventory, on_delete=models.CASCADE, db_column='food_id')
    portion_size = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    meal_type = models.CharField(max_length=30)
    water_consumed_ml = models.IntegerField(default=250)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'meal_logs'
        managed = False


# -----------------------------------------------------------------------------
# 10. MEDICAL CHAT LOGS (AI Clinical Decision Support)
# -----------------------------------------------------------------------------
class MedicalChatLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.CASCADE, db_column='astronaut_id')
    session_id = models.UUIDField(default=uuid.uuid4)
    sender = models.CharField(max_length=30)  # ASTRONAUT, AI_FLIGHT_SURGEON
    message_text = models.TextField()
    hrp_hazard_tag = models.CharField(max_length=50, null=True, blank=True)
    triage_level = models.CharField(max_length=20, default='ROUTINE')
    suggested_countermeasure = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'medical_chat_logs'
        managed = False
