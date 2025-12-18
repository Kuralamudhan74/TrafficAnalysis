"""
Bottleneck Routes
Handles bottleneck analysis and predictions
"""

from flask import Blueprint, request, jsonify
import logging
import os
import sys

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.bottleneck_finder import BottleneckFinder
from services.influence_models import InfluenceModels
from database_config import DatabaseConfig

logger = logging.getLogger(__name__)

# Create blueprint
bottlenecks_bp = Blueprint('bottlenecks', __name__, url_prefix='/api/bottlenecks')


def get_db_connection():
    """Get database connection"""
    db_config = DatabaseConfig()
    return db_config.get_db_connection()


@bottlenecks_bp.route('/run-model', methods=['POST'])
def run_model():
    """
    Run bottleneck analysis model on uploaded data
    """
    try:
        data = request.get_json()

        session_id = data.get('session_id')
        k = data.get('k', 10)
        time_horizon = data.get('time_horizon', 30)
        model_type = data.get('model_type', 'LIM')

        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id is required'
            }), 400

        # Validate session status
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT status
            FROM upload_sessions
            WHERE session_id = %s
        """, (session_id,))

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Session not found'
            }), 404

        status = session[0]

        if status != 'ready':
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': f'Session is not ready. Current status: {status}'
            }), 400

        cursor.close()
        conn.close()

        logger.info(f"Running bottleneck model for session {session_id}")

        # Initialize services
        influence_models = InfluenceModels()
        bottleneck_finder = BottleneckFinder()

        # Check if influence probabilities are learned
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM influence_probabilities
            WHERE session_id = %s
        """, (session_id,))

        prob_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        # Learn influence probabilities if not already done
        if prob_count == 0:
            logger.info(f"Learning influence probabilities for session {session_id}")
            influence_models.learn_influence_probabilities(
                session_id,
                time_horizons=[5, 15, 30],
                model_type=model_type
            )
            logger.info(f"Successfully learned influence probabilities")

        # Find top-K bottlenecks
        logger.info(f"Finding top-{k} bottlenecks")
        result = bottleneck_finder.find_top_k_bottlenecks(
            session_id=session_id,
            k=k,
            time_horizon=time_horizon,
            model_type=model_type,
            force_recalculate=True
        )

        logger.info(f"Successfully found {len(result.get('bottlenecks', []))} bottlenecks")

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error running bottleneck model: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to run model: {str(e)}'
        }), 500


@bottlenecks_bp.route('/top-k', methods=['GET'])
def get_top_bottlenecks():
    """
    Get top K bottlenecks (cached or calculate new)
    """
    try:
        k = int(request.args.get('k', 10))
        time_horizon = int(request.args.get('time_horizon', 30))
        model_type = request.args.get('model_type', 'LIM')
        force_recalculate = request.args.get('force', 'false').lower() == 'true'

        # Get active session
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT session_id
            FROM upload_sessions
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """)

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'No active session found'
            }), 404

        session_id = str(session[0])

        cursor.close()
        conn.close()

        # Find bottlenecks
        bottleneck_finder = BottleneckFinder()
        result = bottleneck_finder.find_top_k_bottlenecks(
            session_id=session_id,
            k=k,
            time_horizon=time_horizon,
            model_type=model_type,
            force_recalculate=force_recalculate
        )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting top bottlenecks: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get bottlenecks: {str(e)}'
        }), 500


@bottlenecks_bp.route('/calculate', methods=['POST'])
def calculate_bottlenecks():
    """
    Trigger bottleneck calculation
    """
    try:
        data = request.get_json()

        k = data.get('k', 10)
        time_horizon = data.get('time_horizon', 30)
        model_type = data.get('model_type', 'LIM')

        # Get active session
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT session_id
            FROM upload_sessions
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """)

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'No active session found'
            }), 404

        session_id = str(session[0])

        cursor.close()
        conn.close()

        # Calculate bottlenecks
        bottleneck_finder = BottleneckFinder()
        result = bottleneck_finder.find_top_k_bottlenecks(
            session_id=session_id,
            k=k,
            time_horizon=time_horizon,
            model_type=model_type,
            force_recalculate=True
        )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error calculating bottlenecks: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to calculate bottlenecks: {str(e)}'
        }), 500


@bottlenecks_bp.route('/what-if', methods=['POST'])
def what_if_analysis():
    """
    Perform what-if analysis for fixing specific roads
    """
    try:
        data = request.get_json()

        fixed_road_ids = data.get('fixed_roads', [])
        time_horizon = data.get('time_horizon', 30)
        model_type = data.get('model_type', 'LIM')

        if not fixed_road_ids:
            return jsonify({
                'success': False,
                'error': 'fixed_roads is required'
            }), 400

        # Get active session
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT session_id
            FROM upload_sessions
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """)

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'No active session found'
            }), 404

        session_id = str(session[0])

        cursor.close()
        conn.close()

        # Perform what-if analysis
        bottleneck_finder = BottleneckFinder()
        result = bottleneck_finder.what_if_analysis(
            session_id=session_id,
            fixed_roads=fixed_road_ids,
            time_horizon=time_horizon,
            model_type=model_type
        )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in what-if analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'What-if analysis failed: {str(e)}'
        }), 500


@bottlenecks_bp.route('/learn-influence', methods=['POST'])
def learn_influence():
    """
    Trigger learning of influence probabilities from historical data
    """
    try:
        data = request.get_json()

        time_horizons = data.get('time_horizons', [5, 15, 30])
        model_type = data.get('model_type', 'LIM')

        # Get active session
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT session_id
            FROM upload_sessions
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        """)

        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': 'No active session found'
            }), 404

        session_id = str(session[0])

        cursor.close()
        conn.close()

        # Learn influence probabilities
        influence_models = InfluenceModels()
        result = influence_models.learn_influence_probabilities(
            session_id=session_id,
            time_horizons=time_horizons,
            model_type=model_type
        )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error learning influence probabilities: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to learn influence probabilities: {str(e)}'
        }), 500
