"""
Supabase access for Assistronaut.

Reads astronaut, mission, destination, biometric, and ECLSS rows through the
Supabase REST API. Django ORM is only a fallback when this app is installed
in a project whose DATABASES already points at the same Postgres schema.
Models stay unmanaged so this app never migrates teammate tables.
"""

import json
import logging
import os
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from urllib import error, parse, request

logger = logging.getLogger(__name__)

DEFAULT_CONTEXT: Dict[str, Any] = {
    "id": "AST-001",
    "name": "Commander Alex Rivera",
    "callsign": "ARES-LEAD",
    "role": "Mission Commander",
    "blood_type": "O-POS",
    "data_source": "offline_sample",
    "mission": {
        "name": "ARES-01",
        "code": "ARES-01",
        "destination": "Mars",
        "phase": "Interplanetary transit",
        "mission_day": 126,
        "planned_duration_days": 900,
        "gravity_exposure": "Microgravity during transit",
        "surface_gravity_g": 0.38,
        "radiation_environment": "High GCR / Transit",
        "earth_comm_delay_seconds": 240,
    },
    "medical_profile": {"known_conditions": [], "allergies": []},
    "health_data": {
        "radiation_accumulated_msv": "42.5 mSv",
        "baseline_bone_density_tscore": "+0.5 T-score (launch)",
        "bone_density_loss_pct": "1.2%",
        "intracranial_pressure_est_mmhg": "14.2 mmHg",
        "optic_disc_edema_grade": 0,
        "t_cell_activity_index": "0.88",
        "viral_reactivation_flag": False,
        "vital_signs": "HR: 62 bpm, BP: 118/76 mmHg",
        "exercise_adherence": "85% adherence (ARED / T2 cycle)",
        "latest_bone_scan": "Mission Day 90 DXA scan",
        "immune_biomarkers": "Stable saliva sIgA & cortisol",
        "notes": "Baseline telemetry within expected microgravity adaptation curve.",
    },
    "eclss": {
        "cabin_oxygen_pct": 20.9,
        "cabin_pressure_kpa": 101.3,
        "co2_scrub_pp_mmhg": 2.20,
        "suit_oxygen_reserve_pct": 98.5,
        "suit_battery_pct": 95.0,
        "cabin_temp_c": 21.5,
        "status_level": "NORMAL",
    },
}


def _load_dotenv() -> None:
    """Load KEY=VALUE lines from nearby .env files without overriding the process env."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, "..", "..", ".env"),
        os.path.join(here, "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for path in candidates:
        path = os.path.normpath(path)
        if not os.path.isfile(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as handle:
                for line in handle:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
        except OSError as exc:
            logger.debug("Could not read %s: %s", path, exc)


def _credentials() -> Optional[tuple]:
    _load_dotenv()
    url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").strip().rstrip("/")
    key = (
        os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or ""
    ).strip()
    if not url or not key or "YOUR_PROJECT" in url or key.startswith("your-"):
        return None
    return url, key


def _rest(method: str, table: str, query: Optional[Dict[str, str]] = None, body: Any = None) -> Any:
    creds = _credentials()
    if not creds:
        raise RuntimeError("Supabase is not configured")
    base, key = creds
    url = f"{base}/rest/v1/{table}"
    if query:
        url = f"{url}?{parse.urlencode(query)}"
    payload = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if method in ("POST", "PATCH"):
        headers["Prefer"] = "return=representation"
    req = request.Request(url, data=payload, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Supabase {method} {table} failed ({exc.code}): {detail}") from exc


def _first(table: str, filters: Dict[str, str], order: Optional[str] = None) -> Optional[Dict[str, Any]]:
    query = {"select": "*", "limit": "1"}
    query.update(filters)
    if order:
        query["order"] = order
    rows = _rest("GET", table, query)
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _find_astronaut(astronaut_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if astronaut_id and _is_uuid(astronaut_id):
        row = _first("astronauts", {"id": f"eq.{astronaut_id}"})
        if row:
            return row
    if astronaut_id and not _is_uuid(astronaut_id):
        for column in ("callsign", "full_name", "email"):
            row = _first("astronauts", {column: f"ilike.{astronaut_id}"})
            if row:
                return row
    return _first("astronauts", {}, order="created_at.asc")


def _duration_days(mission: Dict[str, Any]) -> Optional[int]:
    start = mission.get("start_date")
    end = mission.get("end_date")
    try:
        start_d = date.fromisoformat(str(start)[:10])
        end_d = date.fromisoformat(str(end)[:10])
        return max((end_d - start_d).days, 1)
    except (TypeError, ValueError):
        return None


def _gravity_note(phase: str, destination: str, surface_g: Any) -> str:
    phase_l = (phase or "").lower()
    if "surface" in phase_l or "land" in phase_l:
        return f"Partial surface gravity ({surface_g}g) on {destination}"
    if "orbit" in phase_l and "transit" not in phase_l:
        return f"Orbital microgravity around {destination}"
    return "Microgravity during transit"


def _build_context(
    astro: Dict[str, Any],
    mission: Optional[Dict[str, Any]],
    destination: Optional[Dict[str, Any]],
    bio: Optional[Dict[str, Any]],
    eclss: Optional[Dict[str, Any]],
    crew_role: Optional[str],
) -> Dict[str, Any]:
    mission = mission or {}
    destination = destination or {}
    bio = bio or {}
    eclss = eclss or {}
    dest_name = destination.get("name") or "Unknown destination"
    surface_g = destination.get("surface_gravity_g")
    phase = mission.get("current_phase") or "Unknown phase"
    duration = _duration_days(mission)

    health = {
        "radiation_accumulated_msv": _fmt(astro.get("radiation_accumulated_msv"), " mSv"),
        "baseline_bone_density_tscore": _fmt(astro.get("baseline_bone_density_tscore"), " T-score"),
        "bone_density_loss_pct": _fmt(bio.get("bone_density_loss_pct"), "%"),
        "intracranial_pressure_est_mmhg": _fmt(bio.get("intracranial_pressure_est_mmhg"), " mmHg"),
        "optic_disc_edema_grade": bio.get("optic_disc_edema_grade"),
        "t_cell_activity_index": bio.get("t_cell_activity_index"),
        "viral_reactivation_flag": bio.get("viral_reactivation_flag"),
        "body_system": bio.get("body_system"),
        "vital_signs": _vitals(bio),
        "notes": bio.get("notes"),
        "recorded_at": bio.get("recorded_at"),
        "latest_bone_scan": None,
        "exercise_adherence": None,
        "immune_biomarkers": None,
    }
    return {
        "id": str(astro.get("id")),
        "name": astro.get("full_name") or "Astronaut",
        "callsign": astro.get("callsign"),
        "role": crew_role or astro.get("role"),
        "blood_type": astro.get("blood_type"),
        "email": astro.get("email"),
        "age": astro.get("age"),
        "data_source": "supabase",
        "mission": {
            "name": mission.get("name") or "Unassigned mission",
            "code": mission.get("mission_code"),
            "destination": dest_name,
            "phase": phase,
            "mission_day": mission.get("mission_day"),
            "planned_duration_days": duration,
            "progress_percent": mission.get("progress_percent"),
            "status": mission.get("status"),
            "gravity_exposure": _gravity_note(phase, dest_name, surface_g),
            "surface_gravity_g": surface_g,
            "body_type": destination.get("body_type"),
            "temperature_min_c": destination.get("temperature_min_c"),
            "temperature_max_c": destination.get("temperature_max_c"),
            "radiation_environment_msv_yr": destination.get("radiation_environment_msv_yr"),
            "atmosphere_composition": destination.get("atmosphere_composition"),
            "day_length_hours": destination.get("day_length_hours"),
            "earth_comm_delay_seconds": destination.get("earth_comm_delay_seconds"),
        },
        "medical_profile": {"known_conditions": [], "allergies": []},
        "health_data": health,
        "eclss": {
            "cabin_oxygen_pct": eclss.get("cabin_oxygen_pct"),
            "cabin_pressure_kpa": eclss.get("cabin_pressure_kpa"),
            "co2_scrub_pp_mmhg": eclss.get("co2_scrub_pp_mmhg"),
            "suit_oxygen_reserve_pct": eclss.get("suit_oxygen_reserve_pct"),
            "suit_battery_pct": eclss.get("suit_battery_pct"),
            "cabin_temp_c": eclss.get("cabin_temp_c"),
            "status_level": eclss.get("status_level"),
            "recorded_at": eclss.get("recorded_at"),
        },
    }


def _fmt(value: Any, suffix: str) -> Optional[str]:
    if value is None or value == "":
        return None
    return f"{value}{suffix}"


def _vitals(bio: Dict[str, Any]) -> Optional[str]:
    hr = bio.get("heart_rate_bpm")
    sys = bio.get("blood_pressure_sys")
    dia = bio.get("blood_pressure_dia")
    if hr is None and sys is None:
        return None
    return f"HR: {hr} bpm, BP: {sys}/{dia} mmHg"


def _context_from_supabase(astronaut_id: Optional[str]) -> Optional[Dict[str, Any]]:
    astro = _find_astronaut(astronaut_id)
    if not astro:
        return None
    crew = _first(
        "mission_crew",
        {"astronaut_id": f"eq.{astro['id']}"},
        order="assigned_at.desc",
    )
    mission = None
    destination = None
    eclss = None
    if crew and crew.get("mission_id"):
        mission = _first("missions", {"id": f"eq.{crew['mission_id']}"})
    if mission and mission.get("destination_id"):
        destination = _first("destinations", {"id": f"eq.{mission['destination_id']}"})
    if mission:
        eclss = _first(
            "eclss_telemetry",
            {"mission_id": f"eq.{mission['id']}"},
            order="recorded_at.desc",
        )
    bio = _first(
        "health_biometrics",
        {"astronaut_id": f"eq.{astro['id']}"},
        order="recorded_at.desc",
    )
    return _build_context(
        astro,
        mission,
        destination,
        bio,
        eclss,
        crew.get("crew_role") if crew else None,
    )


def _context_from_orm(astronaut_id: Optional[str], user: Any) -> Optional[Dict[str, Any]]:
    from .models import Astronaut, EclssTelemetry, HealthBiometrics, MissionCrew

    target = astronaut_id or (getattr(user, "username", None) if user else None)
    astro = None
    if target:
        if _is_uuid(str(target)):
            astro = Astronaut.objects.filter(id=target).first()
        if astro is None:
            astro = (
                Astronaut.objects.filter(callsign__iexact=str(target)).first()
                or Astronaut.objects.filter(full_name__icontains=str(target)).first()
                or Astronaut.objects.filter(email__iexact=str(target)).first()
            )
    if astro is None:
        astro = Astronaut.objects.order_by("created_at").first()
    if astro is None:
        return None

    crew = MissionCrew.objects.filter(astronaut=astro).select_related("mission__destination").first()
    mission = crew.mission if crew else None
    destination = mission.destination if mission else None
    bio = HealthBiometrics.objects.filter(astronaut=astro).order_by("-recorded_at").first()
    eclss = (
        EclssTelemetry.objects.filter(mission=mission).order_by("-recorded_at").first()
        if mission
        else None
    )

    def dump(obj: Any, fields: List[str]) -> Dict[str, Any]:
        if obj is None:
            return {}
        data = {}
        for field in fields:
            value = getattr(obj, field, None)
            if isinstance(value, (datetime, date)):
                value = value.isoformat()
            elif hasattr(value, "is_finite"):
                value = float(value)
            data[field] = value
        return data

    astro_row = dump(
        astro,
        [
            "id",
            "full_name",
            "callsign",
            "email",
            "role",
            "blood_type",
            "radiation_accumulated_msv",
            "baseline_bone_density_tscore",
        ],
    )
    mission_row = dump(
        mission,
        ["id", "mission_code", "name", "start_date", "end_date", "mission_day", "current_phase", "progress_percent", "status", "destination_id"],
    )
    if destination is not None:
        mission_row["destination_id"] = str(destination.id)
    dest_row = dump(
        destination,
        [
            "name",
            "body_type",
            "surface_gravity_g",
            "temperature_min_c",
            "temperature_max_c",
            "radiation_environment_msv_yr",
            "atmosphere_composition",
            "day_length_hours",
            "earth_comm_delay_seconds",
        ],
    )
    bio_row = dump(
        bio,
        [
            "body_system",
            "heart_rate_bpm",
            "blood_pressure_sys",
            "blood_pressure_dia",
            "intracranial_pressure_est_mmhg",
            "optic_disc_edema_grade",
            "t_cell_activity_index",
            "viral_reactivation_flag",
            "bone_density_loss_pct",
            "notes",
            "recorded_at",
        ],
    )
    eclss_row = dump(
        eclss,
        [
            "cabin_oxygen_pct",
            "cabin_pressure_kpa",
            "co2_scrub_pp_mmhg",
            "suit_oxygen_reserve_pct",
            "suit_battery_pct",
            "cabin_temp_c",
            "status_level",
            "recorded_at",
        ],
    )
    context = _build_context(
        astro_row,
        mission_row or None,
        dest_row or None,
        bio_row or None,
        eclss_row or None,
        crew.crew_role if crew else None,
    )
    context["data_source"] = "django_orm"
    return context


def get_astronaut_context_from_db(astronaut_id: Optional[str] = None, user: Any = None) -> Dict[str, Any]:
    """Return live mission context, or the offline sample when Supabase is unreachable."""
    if _credentials():
        try:
            live = _context_from_supabase(astronaut_id)
            if live:
                return live
            logger.warning("Supabase responded but no astronaut row was returned.")
        except Exception as exc:
            logger.warning("Supabase lookup failed: %s", exc)

    try:
        live = _context_from_orm(astronaut_id, user)
        if live:
            return live
    except Exception as exc:
        logger.debug("Django ORM lookup skipped: %s", exc)

    context = json.loads(json.dumps(DEFAULT_CONTEXT))
    if astronaut_id:
        context["id"] = str(astronaut_id)
    return context


def log_medical_chat_interaction(
    astronaut_id: str,
    session_id: str,
    user_message: str,
    assistant_response: str,
    hrp_hazard_tag: Optional[str] = None,
    triage_level: str = "ROUTINE",
    suggested_countermeasure: Optional[str] = None,
) -> bool:
    """Write both turns into medical_chat_logs. Missing table or crew id is non-fatal."""
    if not astronaut_id or not _is_uuid(str(astronaut_id)):
        return False
    rows = [
        {
            "astronaut_id": str(astronaut_id),
            "session_id": str(session_id),
            "sender": "astronaut",
            "message_text": user_message,
            "hrp_hazard_tag": hrp_hazard_tag,
            "triage_level": triage_level,
        },
        {
            "astronaut_id": str(astronaut_id),
            "session_id": str(session_id),
            "sender": "assistronaut",
            "message_text": assistant_response,
            "hrp_hazard_tag": hrp_hazard_tag,
            "triage_level": triage_level,
            "suggested_countermeasure": suggested_countermeasure,
        },
    ]
    if _credentials():
        try:
            _rest("POST", "medical_chat_logs", body=rows)
            return True
        except Exception as exc:
            logger.warning("Supabase chat log skipped: %s", exc)

    try:
        from .models import Astronaut, MedicalChatLog

        astro = Astronaut.objects.filter(id=astronaut_id).first()
        if not astro:
            return False
        for row in rows:
            MedicalChatLog.objects.create(
                astronaut=astro,
                session_id=row["session_id"],
                sender=row["sender"],
                message_text=row["message_text"],
                hrp_hazard_tag=row.get("hrp_hazard_tag"),
                triage_level=row["triage_level"],
                suggested_countermeasure=row.get("suggested_countermeasure"),
            )
        return True
    except Exception as exc:
        logger.debug("ORM chat log skipped: %s", exc)
    return False
