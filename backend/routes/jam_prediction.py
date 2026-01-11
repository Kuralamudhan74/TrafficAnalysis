"""
Jam Prediction Routes
Handles traffic jam prediction with historical data simulation
"""

from flask import Blueprint, request, jsonify
import logging
import random
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Create blueprint
jam_prediction_bp = Blueprint('jam_prediction', __name__, url_prefix='/api/jam-prediction')


# Singapore road data - major roads and expressways
SINGAPORE_ROADS = [
    {'id': 1, 'name': 'Pan Island Expressway (PIE)', 'lat': 1.3240, 'lon': 103.8518, 'type': 'expressway'},
    {'id': 2, 'name': 'Central Expressway (CTE)', 'lat': 1.3310, 'lon': 103.8467, 'type': 'expressway'},
    {'id': 3, 'name': 'East Coast Parkway (ECP)', 'lat': 1.2994, 'lon': 103.8783, 'type': 'expressway'},
    {'id': 4, 'name': 'Ayer Rajah Expressway (AYE)', 'lat': 1.3007, 'lon': 103.7868, 'type': 'expressway'},
    {'id': 5, 'name': 'Bukit Timah Expressway (BKE)', 'lat': 1.3657, 'lon': 103.7747, 'type': 'expressway'},
    {'id': 6, 'name': 'Tampines Expressway (TPE)', 'lat': 1.3694, 'lon': 103.9488, 'type': 'expressway'},
    {'id': 7, 'name': 'Kallang-Paya Lebar Expressway (KPE)', 'lat': 1.3172, 'lon': 103.8760, 'type': 'expressway'},
    {'id': 8, 'name': 'Marina Coastal Expressway (MCE)', 'lat': 1.2774, 'lon': 103.8456, 'type': 'expressway'},
    {'id': 9, 'name': 'Orchard Road', 'lat': 1.3048, 'lon': 103.8318, 'type': 'major'},
    {'id': 10, 'name': 'Shenton Way', 'lat': 1.2786, 'lon': 103.8476, 'type': 'major'},
    {'id': 11, 'name': 'Raffles Place', 'lat': 1.2844, 'lon': 103.8510, 'type': 'major'},
    {'id': 12, 'name': 'Marina Bay', 'lat': 1.2804, 'lon': 103.8592, 'type': 'major'},
    {'id': 13, 'name': 'Thomson Road', 'lat': 1.3283, 'lon': 103.8433, 'type': 'major'},
    {'id': 14, 'name': 'Serangoon Road', 'lat': 1.3193, 'lon': 103.8562, 'type': 'major'},
    {'id': 15, 'name': 'Beach Road', 'lat': 1.3000, 'lon': 103.8600, 'type': 'major'},
    {'id': 16, 'name': 'Clementi Road', 'lat': 1.3147, 'lon': 103.7652, 'type': 'major'},
    {'id': 17, 'name': 'Jurong Town Hall Road', 'lat': 1.3404, 'lon': 103.7090, 'type': 'major'},
    {'id': 18, 'name': 'Woodlands Avenue', 'lat': 1.4382, 'lon': 103.7890, 'type': 'major'},
    {'id': 19, 'name': 'Pasir Ris Drive', 'lat': 1.3721, 'lon': 103.9474, 'type': 'major'},
    {'id': 20, 'name': 'Changi Airport Road', 'lat': 1.3644, 'lon': 103.9915, 'type': 'major'},
]


def generate_fake_historical_data(time_horizon_minutes, model_type='LIM'):
    """
    Generate fake historical traffic congestion data for different time horizons

    Args:
        time_horizon_minutes: Time window (30, 60, 120, 720, 1440)
        model_type: Model type (LIM, LTM, SIR, SIS)

    Returns:
        List of predictions with congestion probabilities
    """
    predictions = []

    # Base congestion probability varies by time horizon
    base_probability_map = {
        30: 0.25,    # 30 minutes - lower probability
        60: 0.35,    # 1 hour - moderate probability
        120: 0.45,   # 2 hours - higher probability
        720: 0.55,   # 12 hours (half day) - significant probability
        1440: 0.65   # 24 hours (full day) - high probability
    }

    base_prob = base_probability_map.get(time_horizon_minutes, 0.30)

    # Model type affects prediction patterns
    model_multipliers = {
        'LIM': 1.0,    # Linear Independent Cascade - baseline
        'LTM': 0.9,    # Linear Threshold Model - slightly lower
        'SIR': 1.1,    # Susceptible-Infected-Recovered - slightly higher
        'SIS': 1.15    # Susceptible-Infected-Susceptible - highest spread
    }

    multiplier = model_multipliers.get(model_type, 1.0)

    # Generate predictions for each road
    for road in SINGAPORE_ROADS:
        # Expressways typically have higher congestion
        type_factor = 1.3 if road['type'] == 'expressway' else 1.0

        # Add randomness for realism
        random_factor = random.uniform(0.7, 1.3)

        # Calculate jam probability
        jam_probability = min(0.95, base_prob * multiplier * type_factor * random_factor)

        # Calculate expected congestion duration
        duration = int(time_horizon_minutes * jam_probability * random.uniform(0.5, 0.9))

        # Calculate affected vehicles estimate
        base_vehicles = random.randint(50, 200) if road['type'] == 'major' else random.randint(200, 800)
        affected_vehicles = int(base_vehicles * jam_probability)

        # Calculate average speed (lower speed = more congestion)
        normal_speed = 60 if road['type'] == 'expressway' else 40
        predicted_speed = int(normal_speed * (1 - jam_probability * 0.7))

        predictions.append({
            'road_id': road['id'],
            'road_name': road['name'],
            'road_type': road['type'],
            'coordinates': {
                'lat': road['lat'],
                'lon': road['lon']
            },
            'jam_probability': round(jam_probability, 3),
            'confidence': round(random.uniform(0.75, 0.95), 2),
            'time_horizon_minutes': time_horizon_minutes,
            'predicted_duration_minutes': duration,
            'affected_vehicles_estimate': affected_vehicles,
            'current_speed_kmh': random.randint(20, normal_speed),
            'predicted_speed_kmh': predicted_speed,
            'congestion_level': get_congestion_level(jam_probability),
            'timestamp': datetime.now().isoformat()
        })

    # Sort by jam probability (highest first)
    predictions.sort(key=lambda x: x['jam_probability'], reverse=True)

    return predictions


def get_congestion_level(probability):
    """Convert probability to congestion level"""
    if probability >= 0.7:
        return 'severe'
    elif probability >= 0.5:
        return 'heavy'
    elif probability >= 0.3:
        return 'moderate'
    else:
        return 'light'


@jam_prediction_bp.route('/predict', methods=['POST'])
def predict_jam():
    """
    Run jam prediction for specified time horizon
    """
    try:
        data = request.get_json()

        time_horizon = data.get('time_horizon', 30)
        model_type = data.get('model_type', 'LIM')

        # Validate time horizon
        valid_horizons = [30, 60, 120, 720, 1440]
        if time_horizon not in valid_horizons:
            return jsonify({
                'success': False,
                'error': f'Invalid time horizon. Must be one of: {valid_horizons}'
            }), 400

        # Validate model type
        valid_models = ['LIM', 'LTM', 'SIR', 'SIS']
        if model_type not in valid_models:
            return jsonify({
                'success': False,
                'error': f'Invalid model type. Must be one of: {valid_models}'
            }), 400

        logger.info(f"Running jam prediction: horizon={time_horizon}min, model={model_type}")

        # Generate predictions
        predictions = generate_fake_historical_data(time_horizon, model_type)

        # Calculate statistics
        high_risk_count = sum(1 for p in predictions if p['jam_probability'] >= 0.7)
        medium_risk_count = sum(1 for p in predictions if 0.3 <= p['jam_probability'] < 0.7)
        low_risk_count = sum(1 for p in predictions if p['jam_probability'] < 0.3)

        avg_probability = sum(p['jam_probability'] for p in predictions) / len(predictions)

        return jsonify({
            'success': True,
            'predictions': predictions,
            'statistics': {
                'total_roads': len(predictions),
                'high_risk_roads': high_risk_count,
                'medium_risk_roads': medium_risk_count,
                'low_risk_roads': low_risk_count,
                'average_jam_probability': round(avg_probability, 3),
                'time_horizon_minutes': time_horizon,
                'model_type': model_type
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error running jam prediction: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to run prediction: {str(e)}'
        }), 500


@jam_prediction_bp.route('/time-horizons', methods=['GET'])
def get_time_horizons():
    """
    Get available time horizons for prediction
    """
    return jsonify({
        'success': True,
        'time_horizons': [
            {'value': 30, 'label': '30 minutes', 'description': 'Short-term immediate congestion'},
            {'value': 60, 'label': '1 hour', 'description': 'Near-term traffic buildup'},
            {'value': 120, 'label': '2 hours', 'description': 'Medium-term congestion patterns'},
            {'value': 720, 'label': '12 hours (Half Day)', 'description': 'Extended period analysis'},
            {'value': 1440, 'label': '24 hours (Full Day)', 'description': 'Full day congestion forecast'}
        ]
    }), 200


@jam_prediction_bp.route('/models', methods=['GET'])
def get_models():
    """
    Get available prediction models
    """
    return jsonify({
        'success': True,
        'models': [
            {
                'value': 'LIM',
                'label': 'LIM (Linear Independent Cascade)',
                'description': 'Uses Monte Carlo simulations with probabilistic spread. Best for general traffic prediction.'
            },
            {
                'value': 'LTM',
                'label': 'LTM (Linear Threshold Model)',
                'description': 'Threshold-based activation. Good for sudden congestion events.'
            },
            {
                'value': 'SIR',
                'label': 'SIR (Susceptible-Infected-Recovered)',
                'description': 'Epidemic model with recovery. Models temporary jams well.'
            },
            {
                'value': 'SIS',
                'label': 'SIS (Susceptible-Infected-Susceptible)',
                'description': 'Epidemic model without immunity. For recurring congestion patterns.'
            }
        ]
    }), 200


@jam_prediction_bp.route('/historical-comparison', methods=['GET'])
def get_historical_comparison():
    """
    Get historical comparison data for all time horizons
    """
    try:
        model_type = request.args.get('model_type', 'LIM')

        # Generate data for all time horizons
        comparison_data = []
        for horizon in [30, 60, 120, 720, 1440]:
            predictions = generate_fake_historical_data(horizon, model_type)

            # Calculate summary stats
            high_risk = sum(1 for p in predictions if p['jam_probability'] >= 0.7)
            medium_risk = sum(1 for p in predictions if 0.3 <= p['jam_probability'] < 0.7)
            avg_prob = sum(p['jam_probability'] for p in predictions) / len(predictions)

            comparison_data.append({
                'time_horizon': horizon,
                'high_risk_count': high_risk,
                'medium_risk_count': medium_risk,
                'average_probability': round(avg_prob, 3),
                'top_congested_roads': [
                    {'name': p['road_name'], 'probability': p['jam_probability']}
                    for p in predictions[:5]
                ]
            })

        return jsonify({
            'success': True,
            'comparison': comparison_data,
            'model_type': model_type
        }), 200

    except Exception as e:
        logger.error(f"Error getting historical comparison: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get comparison: {str(e)}'
        }), 500


@jam_prediction_bp.route('/road-details/<int:road_id>', methods=['GET'])
def get_road_details(road_id):
    """
    Get detailed prediction for a specific road across all time horizons
    """
    try:
        model_type = request.args.get('model_type', 'LIM')

        # Find the road
        road = next((r for r in SINGAPORE_ROADS if r['id'] == road_id), None)
        if not road:
            return jsonify({
                'success': False,
                'error': 'Road not found'
            }), 404

        # Generate predictions for all time horizons
        timeline = []
        for horizon in [30, 60, 120, 720, 1440]:
            predictions = generate_fake_historical_data(horizon, model_type)
            road_prediction = next((p for p in predictions if p['road_id'] == road_id), None)
            if road_prediction:
                timeline.append(road_prediction)

        return jsonify({
            'success': True,
            'road': road,
            'timeline': timeline
        }), 200

    except Exception as e:
        logger.error(f"Error getting road details: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get road details: {str(e)}'
        }), 500
