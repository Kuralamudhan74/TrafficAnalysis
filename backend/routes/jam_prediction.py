"""
Jam Prediction Routes
Handles traffic jam prediction with historical data simulation
"""

from flask import Blueprint, request, jsonify
import logging
import random
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database_config import get_db_connection
from services.influence_models import InfluenceModels
from services.lta_service import get_traffic_speed_bands

logger = logging.getLogger(__name__)

# Create blueprint
jam_prediction_bp = Blueprint('jam_prediction', __name__, url_prefix='/api/jam-prediction')

# Initialize influence models service
influence_models = InfluenceModels()

# Singapore region boundaries (lat/lon)
SINGAPORE_REGIONS = {
    'North': {'lat_min': 1.38, 'lat_max': 1.47, 'lon_min': 103.70, 'lon_max': 103.92},
    'South': {'lat_min': 1.24, 'lat_max': 1.32, 'lon_min': 103.76, 'lon_max': 103.90},
    'East': {'lat_min': 1.28, 'lat_max': 1.42, 'lon_min': 103.88, 'lon_max': 104.10},
    'West': {'lat_min': 1.28, 'lat_max': 1.44, 'lon_min': 103.60, 'lon_max': 103.80},
    'Central': {'lat_min': 1.26, 'lat_max': 1.38, 'lon_min': 103.78, 'lon_max': 103.88}
}


def is_in_region(lat, lon, region):
    """Check if coordinates are within a specific Singapore region."""
    if not region or region == 'All':
        return True
    if region not in SINGAPORE_REGIONS:
        return True
    bounds = SINGAPORE_REGIONS[region]
    return (bounds['lat_min'] <= lat <= bounds['lat_max'] and
            bounds['lon_min'] <= lon <= bounds['lon_max'])


# Singapore road data - major roads and expressways  
SINGAPORE_ROADS = [
    # Expressways
    {'id': 1, 'name': 'Pan Island Expressway (PIE)', 'lat': 1.3240, 'lon': 103.8518, 'type': 'expressway'},
    {'id': 2, 'name': 'Central Expressway (CTE)', 'lat': 1.3310, 'lon': 103.8467, 'type': 'expressway'},
    {'id': 3, 'name': 'East Coast Parkway (ECP)', 'lat': 1.2994, 'lon': 103.8783, 'type': 'expressway'},
    {'id': 4, 'name': 'Ayer Rajah Expressway (AYE)', 'lat': 1.3007, 'lon': 103.7868, 'type': 'expressway'},
    {'id': 5, 'name': 'Bukit Timah Expressway (BKE)', 'lat': 1.3657, 'lon': 103.7747, 'type': 'expressway'},
    {'id': 6, 'name': 'Tampines Expressway (TPE)', 'lat': 1.3694, 'lon': 103.9488, 'type': 'expressway'},
    {'id': 7, 'name': 'Kallang-Paya Lebar Expressway (KPE)', 'lat': 1.3172, 'lon': 103.8760, 'type': 'expressway'},
    {'id': 8, 'name': 'Marina Coastal Expressway (MCE)', 'lat': 1.2774, 'lon': 103.8456, 'type': 'expressway'},
    
    # Central Roads
    {'id': 9, 'name': 'Orchard Road', 'lat': 1.3048, 'lon': 103.8318, 'type': 'major'},
    {'id': 10, 'name': 'Shenton Way', 'lat': 1.2786, 'lon': 103.8476, 'type': 'major'},
    {'id': 11, 'name': 'Raffles Place', 'lat': 1.2844, 'lon': 103.8510, 'type': 'major'},
    {'id': 12, 'name': 'Marina Bay', 'lat': 1.2804, 'lon': 103.8592, 'type': 'major'},
    {'id': 13, 'name': 'Thomson Road', 'lat': 1.3283, 'lon': 103.8433, 'type': 'major'},
    {'id': 14, 'name': 'Serangoon Road', 'lat': 1.3193, 'lon': 103.8562, 'type': 'major'},
    {'id': 15, 'name': 'Beach Road', 'lat': 1.3000, 'lon': 103.8600, 'type': 'major'},
    
    # West Roads
    {'id': 16, 'name': 'Clementi Road', 'lat': 1.3147, 'lon': 103.7652, 'type': 'major'},
    {'id': 17, 'name': 'Jurong Town Hall Road', 'lat': 1.3404, 'lon': 103.7090, 'type': 'major'},
    {'id': 21, 'name': 'Jurong East Street', 'lat': 1.3329, 'lon': 103.7436, 'type': 'major'},
    {'id': 22, 'name': 'Pioneer Road North', 'lat': 1.3244, 'lon': 103.6975, 'type': 'major'},
    {'id': 23, 'name': 'Tuas Avenue', 'lat': 1.3201, 'lon': 103.6500, 'type': 'major'},
    
    # North Roads
    {'id': 18, 'name': 'Woodlands Avenue', 'lat': 1.4382, 'lon': 103.7890, 'type': 'major'},
    {'id': 24, 'name': 'Yishun Avenue', 'lat': 1.4274, 'lon': 103.8356, 'type': 'major'},
    {'id': 25, 'name': 'Sembawang Road', 'lat': 1.4491, 'lon': 103.8189, 'type': 'major'},
    {'id': 26, 'name': 'Mandai Road', 'lat': 1.4102, 'lon': 103.7852, 'type': 'major'},
    
    # East Roads
    {'id': 19, 'name': 'Pasir Ris Drive', 'lat': 1.3721, 'lon': 103.9474, 'type': 'major'},
    {'id': 20, 'name': 'Changi Airport Road', 'lat': 1.3644, 'lon': 103.9915, 'type': 'major'},
    {'id': 27, 'name': 'Bedok North Avenue', 'lat': 1.3347, 'lon': 103.9345, 'type': 'major'},
    {'id': 28, 'name': 'Simei Avenue', 'lat': 1.3431, 'lon': 103.9532, 'type': 'major'},
    {'id': 29, 'name': 'Upper Changi Road', 'lat': 1.3381, 'lon': 103.9618, 'type': 'major'},
    
    # South Roads  
    {'id': 30, 'name': 'West Coast Highway', 'lat': 1.2825, 'lon': 103.7541, 'type': 'major'},
]


def generate_fake_historical_data(time_horizon_minutes, model_type='LIM', region=None):
    """
    Generate fake historical traffic congestion data for different time horizons

    Args:
        time_horizon_minutes: Time window (30, 60, 120, 720, 1440)
        model_type: Model type (LIM, LTM, SIR, SIS)
        region: Singapore region filter (North, South, East, West, Central, or None for all)
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
    filtered_roads = []
    for road in SINGAPORE_ROADS:
        # Filter by region if specified
        if region and not is_in_region(road['lat'], road['lon'], region):
            continue
        filtered_roads.append(road)
    
    logger.info(f"Generating predictions for {len(filtered_roads)} roads in region: {region}")
    
    for road in filtered_roads:
            
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
        
        # Create a simple LineString geometry for the road segment
        # For demo purposes, create a small road segment around the center point
        lat = road['lat']
        lon = road['lon']
        # Create a road segment approximately 1km long in a random direction
        offset = 0.005  # Approximately 0.5km at Singapore's latitude
        angle = random.uniform(0, 360)
        import math
        angle_rad = math.radians(angle)
        lon_start = lon - offset * math.cos(angle_rad)
        lat_start = lat - offset * math.sin(angle_rad)
        lon_end = lon + offset * math.cos(angle_rad)
        lat_end = lat + offset * math.sin(angle_rad)
        
        # If region filter is active, ensure segment endpoints stay within bounds
        if region:
            region_bounds = SINGAPORE_REGIONS.get(region)
            if region_bounds:
                # Clamp the start point to region bounds
                lat_start = max(region_bounds['lat_min'], min(region_bounds['lat_max'], lat_start))
                lon_start = max(region_bounds['lon_min'], min(region_bounds['lon_max'], lon_start))
                # Clamp the end point to region bounds
                lat_end = max(region_bounds['lat_min'], min(region_bounds['lat_max'], lat_end))
                lon_end = max(region_bounds['lon_min'], min(region_bounds['lon_max'], lon_end))

        predictions.append({
            'road_id': road['id'],
            'road_name': road['name'],
            'road_type': road['type'],
            'geometry': {
                'type': 'LineString',
                'coordinates': [[lon_start, lat_start], [lon_end, lat_end]]
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


def get_latest_processed_session():
    """Get the latest session that has been preprocessed and is ready for analysis"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT session_id
            FROM upload_sessions
            WHERE status = 'ready' 
            AND is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        row = cursor.fetchone()
        return row[0] if row else None
        
    except Exception as e:
        logger.error(f"Error getting latest session: {str(e)}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def get_jammed_roads_from_realtime():
    """Get currently jammed roads from real-time LTA traffic data"""
    try:
        logger.info("Fetching real-time traffic data from LTA...")
        traffic_data = get_traffic_speed_bands()
        
        if not traffic_data:
            logger.warning("No real-time traffic data available")
            return []
        
        jammed_roads = []
        
        for road in traffic_data:
            # MinimumSpeed and MaximumSpeed indicate current conditions
            # Speed band 1-2 = heavy congestion (< 20 km/h)
            min_speed = road.get('MinimumSpeed', 0)
            max_speed = road.get('MaximumSpeed', 0)
            avg_speed = (min_speed + max_speed) / 2 if max_speed > 0 else min_speed
            
            # Consider road jammed if average speed < 20 km/h
            if avg_speed > 0 and avg_speed < 20:
                road_name = road.get('RoadName', '')
                link_id = road.get('LinkID', '')
                
                if road_name:
                    jammed_roads.append({
                        'road_name': road_name,
                        'link_id': link_id,
                        'speed': avg_speed,
                        'location': road.get('Location', '')
                    })
        
        logger.info(f"Found {len(jammed_roads)} jammed roads from real-time data")
        return jammed_roads
        
    except Exception as e:
        logger.error(f"Error getting real-time jammed roads: {str(e)}")
        return []


def predict_from_realtime_data(time_horizon, model_type):
    """Generate predictions based on real-time traffic data"""
    try:
        # Get currently jammed roads from live data
        jammed_roads = get_jammed_roads_from_realtime()
        
        if not jammed_roads:
            logger.info("No jammed roads in real-time data, generating varied predictions")
            return generate_fake_historical_data(time_horizon, model_type)
        
        logger.info(f"Using {len(jammed_roads)} jammed roads as seeds for prediction")
        
        # Create predictions based on real-time seeds
        predictions = []
        jammed_road_names = {r['road_name'].lower() for r in jammed_roads}
        
        # Base probability increases with time horizon
        base_probability_map = {
            30: 0.30,
            60: 0.40,
            120: 0.50,
            720: 0.60,
            1440: 0.70
        }
        base_prob = base_probability_map.get(time_horizon, 0.35)
        
        # Model multipliers
        model_multipliers = {
            'LIM': 1.0,
            'LTM': 0.9,
            'SIR': 1.1,
            'SIS': 1.15
        }
        multiplier = model_multipliers.get(model_type, 1.0)
        
        for road in SINGAPORE_ROADS:
            road_name_lower = road['name'].lower()
            
            # Check if this road is currently jammed
            is_currently_jammed = any(
                jammed_name in road_name_lower or road_name_lower in jammed_name
                for jammed_name in jammed_road_names
            )
            
            if is_currently_jammed:
                # High probability for currently jammed roads
                jam_probability = min(0.95, random.uniform(0.75, 0.90) * multiplier)
            else:
                # Calculate probability based on proximity to jammed roads
                type_factor = 1.3 if road['type'] == 'expressway' else 1.0
                random_factor = random.uniform(0.6, 1.2)
                jam_probability = min(0.85, base_prob * multiplier * type_factor * random_factor)
            
            # Generate prediction data
            normal_speed = 60 if road['type'] == 'expressway' else 40
            predicted_speed = int(normal_speed * (1 - jam_probability * 0.7))
            duration = int(time_horizon * jam_probability * random.uniform(0.5, 0.9))
            base_vehicles = random.randint(50, 200) if road['type'] == 'major' else random.randint(200, 800)
            affected_vehicles = int(base_vehicles * jam_probability)
            
            # Create geometry
            lat = road['lat']
            lon = road['lon']
            offset = 0.005
            angle = random.uniform(0, 360)
            import math
            angle_rad = math.radians(angle)
            lon_start = lon - offset * math.cos(angle_rad)
            lat_start = lat - offset * math.sin(angle_rad)
            lon_end = lon + offset * math.cos(angle_rad)
            lat_end = lat + offset * math.sin(angle_rad)
            
            predictions.append({
                'road_id': road['id'],
                'road_name': road['name'],
                'road_type': road['type'],
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [[lon_start, lat_start], [lon_end, lat_end]]
                },
                'jam_probability': round(jam_probability, 3),
                'confidence': round(random.uniform(0.80, 0.95), 2),
                'time_horizon_minutes': time_horizon,
                'predicted_duration_minutes': duration,
                'affected_vehicles_estimate': affected_vehicles,
                'current_speed_kmh': random.randint(20, normal_speed),
                'predicted_speed_kmh': predicted_speed,
                'congestion_level': get_congestion_level(jam_probability),
                'timestamp': datetime.now().isoformat(),
                'based_on_realtime': True
            })
        
        predictions.sort(key=lambda x: x['jam_probability'], reverse=True)
        return predictions
        
    except Exception as e:
        logger.error(f"Error predicting from real-time data: {str(e)}")
        return generate_fake_historical_data(time_horizon, model_type)


def transform_predictions_to_geojson(predictions, time_horizon):
    """Transform real prediction results to GeoJSON format with geometry"""
    conn = None
    cursor = None
    results = []
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for pred in predictions:
            road_node_id = pred.get('road_node_id')
            
            # Get road geometry from database
            cursor.execute("""
                SELECT road_id, road_name, 
                       ST_AsGeoJSON(geometry) as geom_json
                FROM road_nodes
                WHERE id = %s
            """, (road_node_id,))
            
            row = cursor.fetchone()
            
            if row:
                road_id = row[0]
                road_name = row[1]
                geom_json = row[2]
                
                # Parse geometry
                import json
                geom = json.loads(geom_json) if geom_json else None
                
                # If no geometry, create a simple line
                if not geom or geom['type'] != 'LineString':
                    # Use default Singapore location with offset
                    lat = 1.35 + random.uniform(-0.05, 0.05)
                    lon = 103.82 + random.uniform(-0.05, 0.05)
                    offset = 0.005
                    angle = random.uniform(0, 360)
                    import math
                    angle_rad = math.radians(angle)
                    lon_start = lon - offset * math.cos(angle_rad)
                    lat_start = lat - offset * math.sin(angle_rad)
                    lon_end = lon + offset * math.cos(angle_rad)
                    lat_end = lat + offset * math.sin(angle_rad)
                    
                    geom = {
                        'type': 'LineString',
                        'coordinates': [[lon_start, lat_start], [lon_end, lat_end]]
                    }
                
                jam_probability = pred.get('jam_probability', 0)
                
                # Estimate speed based on jam probability
                normal_speed = 60
                predicted_speed = int(normal_speed * (1 - jam_probability * 0.7))
                
                results.append({
                    'road_id': road_id,
                    'road_name': road_name,
                    'road_type': 'major',
                    'geometry': geom,
                    'jam_probability': round(jam_probability, 3),
                    'confidence': 0.85,
                    'time_horizon_minutes': time_horizon,
                    'predicted_duration_minutes': int(time_horizon * jam_probability),
                    'affected_vehicles_estimate': int(random.uniform(50, 500) * jam_probability),
                    'current_speed_kmh': random.randint(20, normal_speed),
                    'predicted_speed_kmh': predicted_speed,
                    'congestion_level': get_congestion_level(jam_probability),
                    'timestamp': datetime.now().isoformat()
                })
        
        return results
        
    except Exception as e:
        logger.error(f"Error transforming predictions: {str(e)}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@jam_prediction_bp.route('/predict', methods=['GET', 'POST'])
def predict_jam():
    """
    Run jam prediction for specified time horizon with optional region filter
    """
    try:
        # Support both GET and POST
        if request.method == 'GET':
            time_horizon = int(request.args.get('horizon', 30))
            model_type = request.args.get('model', 'LIM')
            region = request.args.get('region', None)
        else:
            data = request.get_json()
            time_horizon = data.get('time_horizon', 30)
            model_type = data.get('model_type', 'LIM')
            region = data.get('region', None)

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

        logger.info(f"Running jam prediction: horizon={time_horizon}min, model={model_type}, region={region}")

        # Generate predictions (use demo data for now, can be enhanced with real-time later)
        predictions = generate_fake_historical_data(time_horizon, model_type, region)
        
        logger.info(f"Generated {len(predictions)} predictions for region {region}")

        # Calculate statistics
        high_risk_count = sum(1 for p in predictions if p['jam_probability'] >= 0.7)
        medium_risk_count = sum(1 for p in predictions if 0.3 <= p['jam_probability'] < 0.7)
        low_risk_count = sum(1 for p in predictions if p['jam_probability'] < 0.3)

        avg_probability = sum(p['jam_probability'] for p in predictions) / len(predictions) if predictions else 0

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
                'model_type': model_type,
                'region': region or 'All'
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
