"""Authenticated nutrition and meal-management API for the crew portal."""
import math
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import DatabaseError, connection, transaction
from django.db.models import Max, Min
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    DailyNutritionTarget, FoodInventory, HealthBiometric, HydrationLog,
    MealLog, NutritionReview,
)
from .serializers import FoodInventorySerializer
from .views import get_authenticated_astronaut

DEFAULT_TARGETS = {
    'target_calories_kcal': 2800,
    'target_protein_g': 110,
    'target_water_ml': 2500,
    'max_sodium_mg': 2000,
    'target_calcium_mg': 1200,
    'target_vitamin_d_iu': 1000,
    'is_eva_day': False,
}
SCHEMA_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'EVA_SNACK']
NUTRIENTS = {
    'calories_kcal': ('target_calories_kcal', 'Calories', 'kcal'),
    'protein_g': ('target_protein_g', 'Protein', 'g'),
    'calcium_mg': ('target_calcium_mg', 'Calcium', 'mg'),
    'vitamin_d_iu': ('target_vitamin_d_iu', 'Vitamin D', 'IU'),
    'water_ml': ('target_water_ml', 'Water', 'ml'),
}


def _requested_day(request):
    """Allow the signed-in crew member to advance a simulated nutrition day."""
    actual_today = timezone.localdate()
    value = request.headers.get('X-Nutrition-Date')
    if not value:
        return actual_today
    try:
        selected = datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None
    if selected < actual_today or selected > actual_today + timedelta(days=366):
        return None
    return selected


def _day_error():
    return Response({'error': 'The selected nutrition day is invalid. Refresh mission control and try again.'}, status=status.HTTP_400_BAD_REQUEST)


def _timestamp_for_day(day):
    current_time = timezone.localtime().time().replace(tzinfo=None)
    return timezone.make_aware(datetime.combine(day, current_time), timezone.get_current_timezone())


def _auth(request):
    astronaut = get_authenticated_astronaut(request)
    if not astronaut:
        return None, Response({'error': 'Your session has expired. Please sign in again.'}, status=status.HTTP_401_UNAUTHORIZED)
    return astronaut, None


def _table_exists(name):
    return name in connection.introspection.table_names()


def _target_for(astronaut, today):
    target = (DailyNutritionTarget.objects.filter(astronaut_id=astronaut.id, target_date=today).first()
              or DailyNutritionTarget.objects.filter(astronaut_id=astronaut.id).order_by('-target_date').first())
    values = DEFAULT_TARGETS.copy()
    if target:
        values.update({
            'target_calories_kcal': target.target_calories_kcal,
            'target_protein_g': float(target.target_protein_g),
            'target_water_ml': target.target_water_ml,
            'max_sodium_mg': float(target.max_sodium_mg),
            'target_calcium_mg': float(target.target_calcium_mg),
            'target_vitamin_d_iu': float(target.target_vitamin_d_iu),
            'is_eva_day': target.is_eva_day,
            'target_date': target.target_date.isoformat(),
        })
    return values


def _empty_totals():
    return {
        'calories_kcal': 0, 'protein_g': 0.0, 'water_ml': 0, 'sodium_mg': 0.0,
        'calcium_mg': 0.0, 'vitamin_d_iu': 0.0, 'potassium_mg': 0.0,
        'carbs_g': 0.0, 'fat_g': 0.0,
    }


def _round_totals(totals):
    totals['protein_g'] = round(totals['protein_g'], 1)
    for key in ('sodium_mg', 'calcium_mg', 'vitamin_d_iu', 'potassium_mg', 'carbs_g', 'fat_g'):
        totals[key] = round(totals[key], 1)
    return totals


def _whole_number(value):
    if isinstance(value, bool) or not str(value).strip().isdigit():
        raise ValueError('Expected a whole number.')
    return int(value)


def _totals_for_day(astronaut, day, include_hydration=True):
    totals = _empty_totals()
    logs = MealLog.objects.filter(astronaut_id=astronaut.id, logged_at__date=day).select_related('food').order_by('-logged_at')
    meal_list = []
    for log in logs:
        food = log.food
        portion = float(log.portion_size)
        totals['calories_kcal'] += food.calories_kcal * portion
        for key, field in (
            ('protein_g', 'protein_g'), ('sodium_mg', 'sodium_mg'), ('calcium_mg', 'calcium_mg'),
            ('vitamin_d_iu', 'vitamin_d_iu'), ('potassium_mg', 'potassium_mg'),
            ('carbs_g', 'carbs_g'), ('fat_g', 'fat_g'),
        ):
            totals[key] += float(getattr(food, field)) * portion
        totals['water_ml'] += log.water_consumed_ml + food.water_required_ml * portion
        meal_list.append({
            'id': str(log.id), 'food_id': str(food.id), 'food_name': food.item_name,
            'category': food.category, 'portion_size': float(log.portion_size),
            'meal_type': log.meal_type, 'calories_kcal': round(food.calories_kcal * portion),
            'logged_at': log.logged_at.isoformat(), 'water_consumed_ml': log.water_consumed_ml,
        })
    hydration_available = False
    if include_hydration:
        try:
            if _table_exists('hydration_logs'):
                hydration_available = True
                totals['water_ml'] += sum(HydrationLog.objects.filter(astronaut_id=astronaut.id, logged_at__date=day).values_list('amount_ml', flat=True))
        except DatabaseError:
            hydration_available = False
    return _round_totals(totals), meal_list, hydration_available


def _recommendations(astronaut, totals, targets, priority_weights=None, limit=3, day=None):
    remaining = {key: max(0, float(targets[target_key]) - float(totals[key])) for key, (target_key, _, _) in NUTRIENTS.items()}
    if not any(remaining.values()) and float(totals['sodium_mg']) <= float(targets['max_sodium_mg']):
        return {'objectives_reached': True, 'remaining': remaining, 'items': []}
    categories_today = set(MealLog.objects.filter(astronaut_id=astronaut.id, logged_at__date=day or timezone.localdate()).values_list('food__category', flat=True))
    eva = bool(targets.get('is_eva_day'))
    nutrient_weights = {'calories_kcal': 1.0, 'protein_g': 1.4 if eva else 1.1, 'calcium_mg': .8, 'vitamin_d_iu': .7, 'water_ml': 1.3 if eva else .8}
    sodium_left = float(targets['max_sodium_mg']) - float(totals['sodium_mg'])
    candidates = []
    for food in FoodInventory.objects.filter(stock_quantity__gt=0).order_by('item_name'):
        points = {
            'calories_kcal': food.calories_kcal,
            'protein_g': float(food.protein_g),
            'calcium_mg': float(food.calcium_mg),
            'vitamin_d_iu': float(food.vitamin_d_iu),
            'water_ml': food.water_required_ml,
        }
        score = 0.0
        explanations = []
        for key, contribution in points.items():
            missing = remaining[key]
            if missing <= 0 or contribution <= 0:
                continue
            share = min(contribution, missing) / missing
            priority = float((priority_weights or {}).get(key, 1))
            score += share * nutrient_weights[key] * priority
            if share >= .08 and priority > 0:
                explanations.append(f"Covers {round(share * 100)}% of your remaining {NUTRIENTS[key][1].lower()}")
        calories_left = remaining['calories_kcal']
        if calories_left <= 0:
            score -= max(0, food.calories_kcal / max(1, targets['target_calories_kcal'])) * 1.5
        elif food.calories_kcal > calories_left:
            score -= min(1.5, (food.calories_kcal - calories_left) / max(1, calories_left))
        if sodium_left <= 0:
            score -= 1.0 + float(food.sodium_mg) / max(1, float(targets['max_sodium_mg']))
        elif float(food.sodium_mg) > sodium_left:
            score -= min(1.4, (float(food.sodium_mg) - sodium_left) / max(1, sodium_left))
        if food.category not in categories_today:
            score += .12
        if score > 0:
            candidates.append((score, food, explanations))
    candidates.sort(key=lambda entry: (-entry[0], entry[1].item_name))
    items = []
    for score, food, explanations in candidates[:limit]:
        item = FoodInventorySerializer(food).data
        item['score'] = round(score, 3)
        item['explanation'] = ' · '.join(explanations[:2]) or 'A balanced option from available stock.'
        items.append(item)
    return {'objectives_reached': False, 'remaining': remaining, 'items': items}


def _risk_level_below(percent, high_below, moderate_below):
    if percent < high_below:
        return 'High'
    if percent < moderate_below:
        return 'Moderate'
    return 'Low'


def _raise_risk(level):
    return {'Low': 'Moderate', 'Moderate': 'High', 'High': 'High'}[level]


def _day_metrics(totals, targets):
    specs = {
        'calories_kcal': ('Calories', targets['target_calories_kcal'], 'kcal'),
        'protein_g': ('Protein', targets['target_protein_g'], 'g'),
        'carbs_g': ('Carbohydrates', None, 'g'),
        'fat_g': ('Fat', None, 'g'),
        'calcium_mg': ('Calcium', targets['target_calcium_mg'], 'mg'),
        'vitamin_d_iu': ('Vitamin D', targets['target_vitamin_d_iu'], 'IU'),
        'sodium_mg': ('Sodium', targets['max_sodium_mg'], 'mg'),
        'potassium_mg': ('Potassium', None, 'mg'),
        'water_ml': ('Water', targets['target_water_ml'], 'ml'),
    }
    result = {}
    for key, (label, target, unit) in specs.items():
        consumed = float(totals[key])
        percent = round(consumed / float(target) * 100, 1) if target and float(target) > 0 else None
        result[key] = {
            'label': label, 'consumed': round(consumed, 1), 'target': float(target) if target is not None else None,
            'percent': percent, 'unit': unit,
        }
    return result


def _prioritized_foods(astronaut, metrics, is_eva_day, weights, day=None):
    keys = ('calories_kcal', 'protein_g', 'calcium_mg', 'vitamin_d_iu', 'water_ml')
    totals = {key: metrics[key]['consumed'] for key in keys}
    totals['sodium_mg'] = metrics['sodium_mg']['consumed']
    targets = {
        'target_calories_kcal': metrics['calories_kcal']['target'] or 0,
        'target_protein_g': metrics['protein_g']['target'] or 0,
        'target_calcium_mg': metrics['calcium_mg']['target'] or 0,
        'target_vitamin_d_iu': metrics['vitamin_d_iu']['target'] or 0,
        'target_water_ml': metrics['water_ml']['target'] or 0,
        'max_sodium_mg': metrics['sodium_mg']['target'] or 2000,
        'is_eva_day': is_eva_day,
    }
    return _recommendations(astronaut, totals, targets, weights, day=day)['items']


def _latest_biometrics(astronaut):
    fields = ('t_cell_activity_index', 'bone_density_loss_pct', 'viral_reactivation_flag')
    preferred_systems = {'t_cell_activity_index': 'IMMUNE', 'viral_reactivation_flag': 'IMMUNE'}
    latest = {}
    for field in fields:
        records = HealthBiometric.objects.filter(astronaut_id=astronaut.id)
        preferred = preferred_systems.get(field)
        if preferred:
            matching = records.filter(body_system=preferred)
            if matching.exists():
                records = matching
        row = records.order_by('-recorded_at').values(field, 'body_system', 'recorded_at').first()
        latest[field] = ({
            'value': float(row[field]) if field != 'viral_reactivation_flag' else bool(row[field]),
            'body_system': row['body_system'],
            'recorded_at': row['recorded_at'].isoformat(),
        } if row else None)
    ranges = HealthBiometric.objects.aggregate(
        t_cell_min=Min('t_cell_activity_index'), t_cell_max=Max('t_cell_activity_index'),
        bone_loss_min=Min('bone_density_loss_pct'), bone_loss_max=Max('bone_density_loss_pct'),
    )
    comparison = {
        't_cell_activity_index': {
            'min': float(ranges['t_cell_min']) if ranges['t_cell_min'] is not None else None,
            'max': float(ranges['t_cell_max']) if ranges['t_cell_max'] is not None else None,
        },
        'bone_density_loss_pct': {
            'min': float(ranges['bone_loss_min']) if ranges['bone_loss_min'] is not None else None,
            'max': float(ranges['bone_loss_max']) if ranges['bone_loss_max'] is not None else None,
        },
    }
    return latest, comparison, any(value is not None for value in latest.values())


def _make_risk_domains(astronaut, metrics, biometrics, observed_ranges, is_eva_day, day=None):
    calcium = metrics['calcium_mg']['percent'] or 0
    vitamin_d = metrics['vitamin_d_iu']['percent'] or 0
    calories = metrics['calories_kcal']['percent'] or 0
    protein = metrics['protein_g']['percent'] or 0
    water = metrics['water_ml']['percent'] or 0

    bone_level = _risk_level_below(min(calcium, vitamin_d), 50, 80)
    bone_measure = biometrics['bone_density_loss_pct']
    bone_max = observed_ranges['bone_density_loss_pct']['max']
    bone_context = []
    if bone_measure:
        bone_context.append(f"Latest bone-density loss estimate: {bone_measure['value']:.2f}% ({bone_measure['body_system']}).")
        if bone_max is not None and bone_measure['value'] >= bone_max and bone_level != 'High':
            bone_level = _raise_risk(bone_level)
            bone_context.append(f"This is at the upper end of the observed {observed_ranges['bone_density_loss_pct']['min']:.2f}–{bone_max:.2f}% range.")
    else:
        bone_context.append('No bone-density biometrics are available; this domain is assessed from nutrition only.')
    bone_domain = {
        'id': 'bone', 'title': 'Bones', 'level': bone_level,
        'metrics': [{'label': 'Calcium', 'percent': calcium}, {'label': 'Vitamin D', 'percent': vitamin_d}],
        'biometric_notes': bone_context,
        'explanation': f"Calcium is at {calcium:.1f}% and vitamin D at {vitamin_d:.1f}% of today’s goals. Repeated shortfalls could potentially affect bone density.",
        'long_term': 'Possible long-term concern: reduced bone strength and increased fragility.',
        'recommendations': _prioritized_foods(astronaut, metrics, is_eva_day, {'calcium_mg': 4, 'vitamin_d_iu': 4, 'calories_kcal': 0, 'protein_g': 0, 'water_ml': 0}, day),
    }

    immune_average = (calories + protein + vitamin_d) / 3
    immune_level = _risk_level_below(immune_average, 50, 75)
    immune_context = []
    t_cell = biometrics['t_cell_activity_index']
    t_cell_min = observed_ranges['t_cell_activity_index']['min']
    if t_cell:
        immune_context.append(f"Latest T-cell activity index: {t_cell['value']:.2f} ({t_cell['body_system']}); observed range {t_cell_min:.2f}–{observed_ranges['t_cell_activity_index']['max']:.2f}.")
        if t_cell_min is not None and t_cell['value'] <= t_cell_min:
            immune_level = _raise_risk(immune_level)
            immune_context.append('This value is at the lower end of the observed range.')
    viral = biometrics['viral_reactivation_flag']
    if viral:
        immune_context.append(f"Latest viral-reactivation flag: {'positive' if viral['value'] else 'negative'} ({viral['body_system']}).")
        if viral['value']:
            immune_level = _raise_risk(immune_level)
    if not t_cell and not viral:
        immune_context.append('No immune biometrics are available; this domain is assessed from nutrition only.')
    immune_domain = {
        'id': 'immunity', 'title': 'Immunity', 'level': immune_level,
        'metrics': [{'label': 'Calories', 'percent': calories}, {'label': 'Protein', 'percent': protein}, {'label': 'Vitamin D', 'percent': vitamin_d}, {'label': 'Combined average', 'percent': immune_average}],
        'biometric_notes': immune_context,
        'explanation': f"The average of calories, protein, and vitamin D is {immune_average:.1f}% of today’s goals. Repeated gaps may be associated with reduced immune support.",
        'long_term': 'Possible long-term concern: reduced defenses or viral reactivation.',
        'recommendations': _prioritized_foods(astronaut, metrics, is_eva_day, {'calories_kcal': 2, 'protein_g': 2, 'vitamin_d_iu': 2, 'calcium_mg': 0, 'water_ml': 0}, day),
    }

    if is_eva_day:
        if min(calories, water) < 75:
            energy_level = 'High'
        elif min(calories, water) >= 90:
            energy_level = 'Low'
        else:
            energy_level = 'Moderate'
        muscle_level = _risk_level_below(protein, 55, 80)
    else:
        energy_level = 'High' if min(calories, water) < 60 else 'Moderate' if min(calories, water) < 80 else 'Low'
        muscle_level = _risk_level_below(protein, 50, 75)
    energy_domain = {
        'id': 'energy', 'title': 'Energy & hydration', 'level': energy_level,
        'metrics': [{'label': 'Calories', 'percent': calories}, {'label': 'Water', 'percent': water}],
        'biometric_notes': [],
        'explanation': f"Calories are at {calories:.1f}% and water at {water:.1f}% of today’s goals. Repeated shortfalls may contribute to fatigue or reduced EVA performance.",
        'long_term': 'Possible long-term concern: fatigue and lower performance during EVA tasks.',
        'recommendations': _prioritized_foods(astronaut, metrics, is_eva_day, {'calories_kcal': 2.5, 'water_ml': 2.5, 'protein_g': 0, 'calcium_mg': 0, 'vitamin_d_iu': 0}, day),
    }
    muscle_domain = {
        'id': 'muscle', 'title': 'Muscle', 'level': muscle_level,
        'metrics': [{'label': 'Protein', 'percent': protein}],
        'biometric_notes': ['Nutrition-only estimate; no muscle biomarker is available in this database.'],
        'explanation': f"Protein intake is at {protein:.1f}% of today’s goal. This is a nutrition-only estimate because no muscle biomarker is available.",
        'long_term': 'Possible long-term concern: reduced muscle mass if low protein intake persists.',
        'recommendations': _prioritized_foods(astronaut, metrics, is_eva_day, {'protein_g': 4, 'calories_kcal': 0, 'calcium_mg': 0, 'vitamin_d_iu': 0, 'water_ml': 0}, day),
    }
    return [bone_domain, immune_domain, energy_domain, muscle_domain]


def _alerts(astronaut, today, totals, targets):
    alerts = []
    current_hour = timezone.localtime().hour if today == timezone.localdate() else 0
    if float(totals['sodium_mg']) > float(targets['max_sodium_mg']):
        pct = round(float(totals['sodium_mg']) / max(1, float(targets['max_sodium_mg'])) * 100)
        alerts.append({'nutrient': 'Sodium', 'level': 'warning', 'percent': pct, 'message': f'Sodium is at {pct}% of its maximum limit.'})
    for key, (target_key, label, _) in NUTRIENTS.items():
        target = float(targets[target_key])
        if target <= 0:
            continue
        pct = float(totals[key]) / target * 100
        if key == 'water_ml' and current_hour >= 12 and pct < 60:
            alerts.append({'nutrient': label, 'level': 'warning', 'percent': round(pct), 'message': f'Possible low water intake: {round(pct)}% of today’s goal.'})
        if current_hour >= 20 and pct < 70:
            alerts.append({'nutrient': label, 'level': 'warning', 'percent': round(pct), 'message': f'Possible low {label.lower()} intake: {round(pct)}% of today’s goal.'})
    three_days_ago = today - timedelta(days=2)
    three_day_logs = MealLog.objects.filter(astronaut_id=astronaut.id, logged_at__date__gte=three_days_ago, logged_at__date__lte=today).select_related('food')
    by_day = {three_days_ago + timedelta(days=i): _empty_totals() for i in range(3)}
    for log in three_day_logs:
        day = timezone.localtime(log.logged_at).date()
        values = by_day.get(day)
        if values is None:
            continue
        portion = float(log.portion_size)
        values['calories_kcal'] += log.food.calories_kcal * portion
        values['water_ml'] += log.water_consumed_ml + log.food.water_required_ml * portion
        for key in ('protein_g', 'calcium_mg', 'vitamin_d_iu'):
            values[key] += float(getattr(log.food, key)) * portion
    if _table_exists('hydration_logs'):
        for entry in HydrationLog.objects.filter(astronaut_id=astronaut.id, logged_at__date__gte=three_days_ago, logged_at__date__lte=today):
            day_values = by_day.get(timezone.localtime(entry.logged_at).date())
            if day_values is not None:
                day_values['water_ml'] += entry.amount_ml
    for key in ('calories_kcal', 'protein_g', 'calcium_mg', 'vitamin_d_iu', 'water_ml'):
        target_key, label, _ = NUTRIENTS[key]
        target = max(1, float(targets[target_key]))
        avg_pct = sum(day_values[key] / target * 100 for day_values in by_day.values()) / 3
        if avg_pct < 50:
            alerts.append({'nutrient': label, 'level': 'strong', 'percent': round(avg_pct), 'message': f'Possible low {label.lower()} intake over the last three days: {round(avg_pct)}% on average.'})
    if float(totals['calories_kcal']) > float(targets['target_calories_kcal']) * 1.2:
        pct = round(float(totals['calories_kcal']) / max(1, float(targets['target_calories_kcal'])) * 100)
        alerts.append({'nutrient': 'Calories', 'level': 'info', 'percent': pct, 'message': f'Calories are at {pct}% of today’s target.'})
    return alerts


@api_view(['GET'])
def nutrition_catalog(request):
    astronaut, error = _auth(request)
    if error:
        return error
    category = request.query_params.get('category', '').strip()
    try:
        categories = list(FoodInventory.objects.order_by().values_list('category', flat=True).distinct())
        if category and category != 'ALL' and category not in categories:
            return Response({'error': 'Unknown food category.'}, status=status.HTTP_400_BAD_REQUEST)
        foods = FoodInventory.objects.all().order_by('item_name')
        if category and category != 'ALL':
            foods = foods.filter(category=category)
        meal_types = list(MealLog.objects.order_by().values_list('meal_type', flat=True).distinct()) or SCHEMA_MEAL_TYPES
        return Response({'categories': categories, 'meal_types': meal_types, 'foods': FoodInventorySerializer(foods, many=True).data})
    except DatabaseError:
        return Response({'error': 'Nutrition data is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
def nutrition_summary(request):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        today = _requested_day(request)
        if today is None:
            return _day_error()
        target = _target_for(astronaut, today)
        totals, meals, hydration_available = _totals_for_day(astronaut, today)
        recommendations = _recommendations(astronaut, totals, target, day=today)
        alerts = _alerts(astronaut, today, totals, target)
        return Response({
            'date': today.isoformat(), 'consumed': totals, 'targets': target,
            'meals': meals, 'alerts': alerts, 'recommendations': recommendations['items'],
            'objectives_reached': recommendations['objectives_reached'],
            'remaining': recommendations['remaining'],
            'hydration_available': hydration_available,
            'simulated_values': True,
        })
    except DatabaseError:
        return Response({'error': 'Nutrition data is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
def nutrition_recommendations(request):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        today = _requested_day(request)
        if today is None:
            return _day_error()
        totals, _, _ = _totals_for_day(astronaut, today)
        result = _recommendations(astronaut, totals, _target_for(astronaut, today), day=today)
        if not result['objectives_reached'] and not result['items']:
            result['message'] = 'No suitable food is currently available in stock.'
        elif result['objectives_reached']:
            result['message'] = 'Today’s nutrition objectives have been reached.'
        return Response(result)
    except DatabaseError:
        return Response({'error': 'Recommendations are temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
def nutrition_alerts(request):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        today = _requested_day(request)
        if today is None:
            return _day_error()
        totals, _, _ = _totals_for_day(astronaut, today)
        alerts = _alerts(astronaut, today, totals, _target_for(astronaut, today))
        return Response({'alerts': alerts, 'recommendations': _recommendations(astronaut, totals, _target_for(astronaut, today), day=today)['items']})
    except DatabaseError:
        return Response({'error': 'Nutrition alerts are temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
def nutrition_day_analysis(request):
    """Generate a non-clinical end-of-day nutrition interpretation on demand."""
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        today = _requested_day(request)
        if today is None:
            return _day_error()
        totals, meals, _ = _totals_for_day(astronaut, today)
        if not meals:
            return Response({
                'code': 'no_meals',
                'error': 'Log at least one meal today before starting the analysis.',
            }, status=status.HTTP_409_CONFLICT)

        targets = _target_for(astronaut, today)
        metrics = _day_metrics(totals, targets)
        biometrics, observed_ranges, biometrics_available = _latest_biometrics(astronaut)
        domains = _make_risk_domains(astronaut, metrics, biometrics, observed_ranges, targets['is_eva_day'], today)
        severity = {'Low': 0, 'Moderate': 1, 'High': 2}
        highest = max(domains, key=lambda domain: severity[domain['level']])['level']
        coverage_keys = ('calories_kcal', 'protein_g', 'calcium_mg', 'vitamin_d_iu', 'water_ml')
        score = round(sum(min(100, metrics[key]['percent'] or 0) for key in coverage_keys) / len(coverage_keys))
        sodium_pct = metrics['sodium_mg']['percent'] or 0
        information = []
        if sodium_pct > 100:
            information.append({
                'nutrient': 'Sodium', 'percent': sodium_pct,
                'message': f"Sodium is at {sodium_pct:.1f}% of its daily maximum. This is an intake note, not a risk domain.",
            })
        try:
            reviews_available = _table_exists('nutrition_reviews')
        except DatabaseError:
            reviews_available = False
        return Response({
            'date': today.isoformat(), 'next_day': (today + timedelta(days=1)).isoformat(), 'is_eva_day': bool(targets['is_eva_day']),
            'macros': metrics, 'biometrics': biometrics,
            'biometrics_available': biometrics_available,
            'biometrics_message': None if biometrics_available else 'No biometric data available; this analysis uses nutrition data only.',
            'observed_biometric_ranges': observed_ranges,
            'domains': domains, 'overall_level': highest, 'score': score,
            'verdict': 'Your day is complete: all tracked needs are covered.' if highest == 'Low' else f'Nutrition review: {highest.lower()} potential risk level.',
            'additional_information': information,
            'reviews_available': reviews_available,
            'hrp_context': 'The logic is inspired by NASA HRP risks: Inadequate Food and Nutrition, Spaceflight-Induced Bone Changes, and Altered Immune System Responses.',
        })
    except DatabaseError:
        return Response({'error': 'The day analysis is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
def nutrition_log_meal(request):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        nutrition_day = _requested_day(request)
        if nutrition_day is None:
            return _day_error()
        food_id = request.data.get('food_id')
        meal_type = request.data.get('meal_type')
        portion = Decimal(str(request.data.get('portion_size', '')))
        water_ml = _whole_number(request.data.get('water_consumed_ml', 0))
        if not food_id or not isinstance(meal_type, str) or not meal_type.strip() or len(meal_type) > 30 or not portion.is_finite() or portion <= 0 or portion > 5 or portion.as_tuple().exponent < -1:
            return Response({'error': 'Choose a food, meal type, and a portion greater than 0 and no more than 5.'}, status=status.HTTP_400_BAD_REQUEST)
        if water_ml < 0 or water_ml > 5000:
            return Response({'error': 'Meal water must be between 0 and 5000 ml.'}, status=status.HTTP_400_BAD_REQUEST)
        meal_types = set(MealLog.objects.order_by().values_list('meal_type', flat=True).distinct()) or set(SCHEMA_MEAL_TYPES)
        if meal_type not in meal_types:
            return Response({'error': 'Unknown meal type.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            food = FoodInventory.objects.select_for_update().filter(pk=food_id).first()
            if not food:
                return Response({'error': 'Food item was not found.'}, status=status.HTTP_404_NOT_FOUND)
            stock_units = max(1, math.ceil(float(portion)))
            if food.stock_quantity < stock_units:
                return Response({'error': 'There is not enough stock for this portion.'}, status=status.HTTP_409_CONFLICT)
            log = MealLog.objects.create(
                astronaut_id=astronaut.id, food=food, portion_size=portion,
                meal_type=meal_type, water_consumed_ml=water_ml,
            )
            if nutrition_day != timezone.localdate():
                MealLog.objects.filter(pk=log.pk).update(logged_at=_timestamp_for_day(nutrition_day))
            food.stock_quantity -= stock_units
            food.save(update_fields=['stock_quantity'])
        return Response({'meal': {'id': str(log.id)}, 'message': 'Meal added to today’s log.'}, status=status.HTTP_201_CREATED)
    except (InvalidOperation, ValueError, TypeError):
        return Response({'error': 'Invalid meal details.'}, status=status.HTTP_400_BAD_REQUEST)
    except DatabaseError:
        return Response({'error': 'The meal could not be saved right now.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['DELETE'])
def nutrition_delete_meal(request, meal_id):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        with transaction.atomic():
            log = MealLog.objects.select_for_update().filter(pk=meal_id, astronaut_id=astronaut.id).select_related('food').first()
            if not log:
                return Response({'error': 'Meal log was not found.'}, status=status.HTTP_404_NOT_FOUND)
            food = FoodInventory.objects.select_for_update().get(pk=log.food_id)
            food.stock_quantity += max(1, math.ceil(float(log.portion_size)))
            food.save(update_fields=['stock_quantity'])
            log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except DatabaseError:
        return Response({'error': 'The meal could not be cancelled right now.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
def nutrition_log_hydration(request):
    astronaut, error = _auth(request)
    if error:
        return error
    try:
        nutrition_day = _requested_day(request)
        if nutrition_day is None:
            return _day_error()
        amount = _whole_number(request.data.get('amount_ml'))
        if amount < 1 or amount > 2000:
            return Response({'error': 'Water amount must be between 1 and 2000 ml.'}, status=status.HTTP_400_BAD_REQUEST)
        if not _table_exists('hydration_logs'):
            return Response({'error': 'Water logging is unavailable until the nutrition_phase2.sql table is created in Supabase.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        with transaction.atomic():
            entry = HydrationLog.objects.create(astronaut_id=astronaut.id, amount_ml=amount)
            if nutrition_day != timezone.localdate():
                HydrationLog.objects.filter(pk=entry.pk).update(logged_at=_timestamp_for_day(nutrition_day))
        return Response({'id': str(entry.id), 'message': f'{amount} ml of water logged.'}, status=status.HTTP_201_CREATED)
    except (ValueError, TypeError):
        return Response({'error': 'Enter a valid water amount.'}, status=status.HTTP_400_BAD_REQUEST)
    except DatabaseError:
        return Response({'error': 'Water logging is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['POST'])
def nutrition_request_review(request):
    astronaut, error = _auth(request)
    if error:
        return error
    nutrient = request.data.get('nutrient', '')
    message = request.data.get('message', '')
    if not isinstance(nutrient, str) or not isinstance(message, str) or len(nutrient) > 80 or len(message) > 2000:
        return Response({'error': 'Review details are invalid.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        if not _table_exists('nutrition_reviews'):
            return Response({'error': 'Review requests are unavailable until the nutrition_phase2.sql table is created in Supabase.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        review = NutritionReview.objects.create(astronaut_id=astronaut.id, nutrient=nutrient.strip(), message=message.strip())
        return Response({'id': str(review.id), 'status': review.status, 'message': 'Review request sent to the nutrition team.'}, status=status.HTTP_201_CREATED)
    except DatabaseError:
        return Response({'error': 'The review request could not be sent right now.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
