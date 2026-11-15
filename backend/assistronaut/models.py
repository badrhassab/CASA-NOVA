"""
models.py — Supabase Database Models for Assistronaut
Maps directly to existing Supabase PostgreSQL schema without modifying table structures.
All models use `managed = False` to prevent migration conflicts with team schema.
"""

import uuid
from django.db import models


class Destination(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    body_type = models.CharField(max_length=100)
    surface_gravity_g = models.DecimalField(max_digits=10, decimal_places=4)
    temperature_min_c = models.DecimalField(max_digits=10, decimal_places=2)
    temperature_max_c = models.DecimalField(max_digits=10, decimal_places=2)
    radiation_environment_msv_yr = models.DecimalField(max_digits=10, decimal_places=2)
    atmosphere_composition = models.TextField()
    day_length_hours = models.DecimalField(max_digits=10, decimal_places=2)
    earth_comm_delay_seconds = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'destinations'

    def __str__(self):
        return f"{self.name} ({self.body_type})"


class Mission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    destination = models.ForeignKey(Destination, on_delete=models.DO_NOTHING, null=True, blank=True, db_column='destination_id')
    start_date = models.DateField()
    end_date = models.DateField()
    mission_day = models.IntegerField(default=1)
    current_phase = models.CharField(max_length=100)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'missions'

    def __str__(self):
        return f"{self.mission_code} — {self.name}"


class Astronaut(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    callsign = models.CharField(max_length=100)
    email = models.CharField(max_length=255, unique=True)
    role = models.CharField(max_length=100)
    blood_type = models.CharField(max_length=10)
    radiation_accumulated_msv = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    baseline_bone_density_tscore = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    avatar_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'astronauts'

    def __str__(self):
        return f"{self.full_name} ({self.callsign})"


class MissionCrew(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(Mission, on_delete=models.DO_NOTHING, db_column='mission_id')
    astronaut = models.ForeignKey(Astronaut, on_delete=models.DO_NOTHING, db_column='astronaut_id')
    crew_role = models.CharField(max_length=100)
    eva_qualified = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'mission_crew'


class EclssTelemetry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(Mission, on_delete=models.DO_NOTHING, db_column='mission_id')
    cabin_oxygen_pct = models.DecimalField(max_digits=5, decimal_places=2, default=20.90)
    cabin_oxygen_pp_mmhg = models.DecimalField(max_digits=6, decimal_places=2, default=158.0)
    cabin_pressure_kpa = models.DecimalField(max_digits=6, decimal_places=2, default=101.30)
    co2_scrub_pp_mmhg = models.DecimalField(max_digits=5, decimal_places=2, default=2.20)
    suit_oxygen_reserve_pct = models.DecimalField(max_digits=5, decimal_places=2, default=98.5)
    suit_battery_pct = models.DecimalField(max_digits=5, decimal_places=2, default=95.0)
    cabin_temp_c = models.DecimalField(max_digits=5, decimal_places=2, default=21.5)
    status_level = models.CharField(max_length=50, default='NORMAL')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'eclss_telemetry'
        ordering = ['-recorded_at']


class HealthBiometrics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.DO_NOTHING, db_column='astronaut_id')
    body_system = models.CharField(max_length=100)
    heart_rate_bpm = models.IntegerField()
    blood_pressure_sys = models.IntegerField()
    blood_pressure_dia = models.IntegerField()
    intracranial_pressure_est_mmhg = models.DecimalField(max_digits=6, decimal_places=2)
    optic_disc_edema_grade = models.IntegerField(default=0)  # SANS
    t_cell_activity_index = models.DecimalField(max_digits=6, decimal_places=2)
    viral_reactivation_flag = models.BooleanField(default=False)
    bone_density_loss_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    notes = models.TextField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'health_biometrics'
        ordering = ['-recorded_at']


class MedicalChatLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    astronaut = models.ForeignKey(Astronaut, on_delete=models.DO_NOTHING, db_column='astronaut_id')
    session_id = models.UUIDField(default=uuid.uuid4)
    sender = models.CharField(max_length=50)  # 'astronaut' or 'assistronaut'
    message_text = models.TextField()
    hrp_hazard_tag = models.CharField(max_length=100, null=True, blank=True)
    triage_level = models.CharField(max_length=50, default='ROUTINE')  # 'ROUTINE', 'URGENT', 'EMERGENCY'
    suggested_countermeasure = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'medical_chat_logs'
        ordering = ['created_at']
