"""
Feedback API routes - User feedback management and broadcast functionality.
Allows users to submit feedback and admins to broadcast responses.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from functools import wraps
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database_config import get_db_connection
from utils.jwt_handler import validate_jwt_token

feedback_bp = Blueprint('feedback', __name__)

# Feedback categories
FEEDBACK_CATEGORIES = [
    'bug_report', 'feature_request', 'general', 'usability',
    'performance', 'data_quality', 'other'
]

# Feedback statuses
FEEDBACK_STATUSES = ['pending', 'in_review', 'resolved', 'closed', 'broadcast']


def token_optional(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        request.current_user = None
        auth_header = request.headers.get('Authorization')

        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            success, data, _ = validate_jwt_token(token)
            if success:
                request.current_user = data.get('user', {})

        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401

        token = auth_header.split(' ')[1]
        success, data, status_code = validate_jwt_token(token)

        if not success:
            return jsonify(data), status_code

        user = data.get('user', {})
        if user.get('role') not in ['government', 'developer']:
            return jsonify({'error': 'Admin role required'}), 403

        request.current_user = user
        return f(*args, **kwargs)

    return decorated


@feedback_bp.route('/', methods=['GET'])
@admin_required
def list_feedback():
    """List all feedback with filtering (admin only)"""
    try:
        # Pagination
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Filters
        category = request.args.get('category')
        status = request.args.get('status')
        rating = request.args.get('rating', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT f.*, u.email as responded_by_email, u2.email as broadcast_by_email
            FROM feedback f
            LEFT JOIN users u ON f.responded_by = u.id
            LEFT JOIN users u2 ON f.broadcast_by = u2.id
            WHERE 1=1
        """
        params = []

        if category:
            query += " AND f.category = %s"
            params.append(category)

        if status:
            query += " AND f.status = %s"
            params.append(status)

        if rating:
            query += " AND f.rating = %s"
            params.append(rating)

        if date_from:
            query += " AND f.created_at >= %s"
            params.append(date_from)

        if date_to:
            query += " AND f.created_at <= %s"
            params.append(date_to)

        # Get total count
        count_query = query.replace(
            "SELECT f.*, u.email as responded_by_email, u2.email as broadcast_by_email",
            "SELECT COUNT(*)"
        )
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        # Add ordering and pagination
        query += " ORDER BY f.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        columns = [desc[0] for desc in cursor.description]
        feedbacks = []

        for row in cursor.fetchall():
            fb = dict(zip(columns, row))
            for key in ['created_at', 'responded_at', 'broadcast_at']:
                if fb.get(key):
                    fb[key] = fb[key].isoformat()
            feedbacks.append(fb)

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': {
                'feedback': feedbacks,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/<int:feedback_id>', methods=['GET'])
@admin_required
def get_feedback(feedback_id):
    """Get a specific feedback entry"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT f.*, u.email as responded_by_email, u2.email as broadcast_by_email
            FROM feedback f
            LEFT JOIN users u ON f.responded_by = u.id
            LEFT JOIN users u2 ON f.broadcast_by = u2.id
            WHERE f.id = %s
        """, (feedback_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({'error': 'Feedback not found'}), 404

        columns = [desc[0] for desc in cursor.description]
        fb = dict(zip(columns, row))

        for key in ['created_at', 'responded_at', 'broadcast_at']:
            if fb.get(key):
                fb[key] = fb[key].isoformat()

        return jsonify({
            'success': True,
            'data': fb
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/', methods=['POST'])
@token_optional
def submit_feedback():
    """Submit new feedback (authenticated or anonymous)"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json()

        message = data.get('message', '').strip()
        if not message:
            return jsonify({'error': 'Message is required'}), 400

        category = data.get('category', 'general')
        if category not in FEEDBACK_CATEGORIES:
            category = 'other'

        subject = data.get('subject', '').strip()
        rating = data.get('rating')
        if rating and (rating < 1 or rating > 5):
            rating = None

        user = request.current_user

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO feedback
            (user_id, user_email, user_name, category, subject, message, rating)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            user.get('id') if user else None,
            user.get('email') if user else data.get('email'),
            data.get('name'),
            category,
            subject,
            message,
            rating
        ))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully',
            'data': {
                'id': result[0],
                'created_at': result[1].isoformat()
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/<int:feedback_id>/respond', methods=['PUT'])
@admin_required
def respond_to_feedback(feedback_id):
    """Respond to a feedback entry"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json()
        response = data.get('response', '').strip()

        if not response:
            return jsonify({'error': 'Response message is required'}), 400

        user = request.current_user

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE feedback
            SET admin_response = %s,
                responded_by = %s,
                responded_at = CURRENT_TIMESTAMP,
                status = 'resolved'
            WHERE id = %s
            RETURNING id
        """, (response, user.get('id'), feedback_id))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        if not result:
            return jsonify({'error': 'Feedback not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Response saved successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/<int:feedback_id>/status', methods=['PUT'])
@admin_required
def update_feedback_status(feedback_id):
    """Update feedback status"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json()
        status = data.get('status')

        if status not in FEEDBACK_STATUSES:
            return jsonify({'error': f'Invalid status. Must be one of: {FEEDBACK_STATUSES}'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE feedback SET status = %s WHERE id = %s RETURNING id
        """, (status, feedback_id))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        if not result:
            return jsonify({'error': 'Feedback not found'}), 404

        return jsonify({
            'success': True,
            'message': f'Status updated to: {status}'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/<int:feedback_id>/broadcast', methods=['POST'])
@admin_required
def broadcast_feedback(feedback_id):
    """Broadcast feedback to all users (create an alert)"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json()
        broadcast_message = data.get('message', '').strip()

        if not broadcast_message:
            return jsonify({'error': 'Broadcast message is required'}), 400

        user = request.current_user

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE feedback
            SET is_broadcast = TRUE,
                broadcast_message = %s,
                broadcast_at = CURRENT_TIMESTAMP,
                broadcast_by = %s,
                status = 'broadcast'
            WHERE id = %s
            RETURNING id
        """, (broadcast_message, user.get('id'), feedback_id))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        if not result:
            return jsonify({'error': 'Feedback not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Feedback broadcast successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/broadcast', methods=['POST'])
@admin_required
def create_broadcast():
    """Create a new standalone broadcast message"""
    try:
        user = request.current_user

        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400

        data = request.get_json()

        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        priority = data.get('priority', 'normal')
        target_roles = data.get('target_roles', [])

        if not title or not message:
            return jsonify({'error': 'Title and message are required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Create a feedback entry as a broadcast
        cursor.execute("""
            INSERT INTO feedback
            (subject, message, category, status, is_broadcast, broadcast_message,
             broadcast_at, broadcast_by, user_id)
            VALUES (%s, %s, %s, %s, TRUE, %s, CURRENT_TIMESTAMP, %s, %s)
            RETURNING id, broadcast_at
        """, (
            title,
            message,
            'broadcast',
            'broadcast',
            message,
            user.get('id'),
            user.get('id')
        ))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Broadcast created successfully',
            'data': {
                'id': result[0],
                'broadcast_at': result[1].isoformat() if result[1] else None
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/broadcasts', methods=['GET'])
def get_broadcasts():
    """Get all broadcast messages (public endpoint)"""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, subject, broadcast_message, broadcast_at, category
            FROM feedback
            WHERE is_broadcast = TRUE
            ORDER BY broadcast_at DESC
            LIMIT %s
        """, (limit,))

        broadcasts = []
        for row in cursor.fetchall():
            broadcasts.append({
                'id': row[0],
                'subject': row[1],
                'message': row[2],
                'broadcast_at': row[3].isoformat() if row[3] else None,
                'category': row[4]
            })

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': {
                'broadcasts': broadcasts,
                'total': len(broadcasts)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/stats', methods=['GET'])
@admin_required
def get_feedback_stats():
    """Get feedback statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Overall stats
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN is_broadcast THEN 1 ELSE 0 END) as broadcast,
                AVG(rating) as avg_rating
            FROM feedback
        """)
        row = cursor.fetchone()

        # By category
        cursor.execute("""
            SELECT category, COUNT(*) as count
            FROM feedback
            GROUP BY category
            ORDER BY count DESC
        """)
        by_category = [{'category': r[0], 'count': r[1]} for r in cursor.fetchall()]

        # Recent (last 7 days)
        cursor.execute("""
            SELECT COUNT(*)
            FROM feedback
            WHERE created_at >= NOW() - INTERVAL '7 days'
        """)
        recent_count = cursor.fetchone()[0]

        # Rating distribution
        cursor.execute("""
            SELECT rating, COUNT(*) as count
            FROM feedback
            WHERE rating IS NOT NULL
            GROUP BY rating
            ORDER BY rating
        """)
        rating_dist = {str(r[0]): r[1] for r in cursor.fetchall()}

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': {
                'total': row[0] or 0,
                'by_status': {
                    'pending': row[1] or 0,
                    'in_review': row[2] or 0,
                    'resolved': row[3] or 0,
                    'broadcast': row[4] or 0
                },
                'average_rating': round(row[5], 2) if row[5] else None,
                'by_category': by_category,
                'last_7_days': recent_count,
                'rating_distribution': rating_dist
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@feedback_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get available feedback categories"""
    return jsonify({
        'success': True,
        'data': FEEDBACK_CATEGORIES
    }), 200


@feedback_bp.route('/statuses', methods=['GET'])
def get_statuses():
    """Get available feedback statuses"""
    return jsonify({
        'success': True,
        'data': FEEDBACK_STATUSES
    }), 200


@feedback_bp.route('/<int:feedback_id>', methods=['DELETE'])
@admin_required
def delete_feedback(feedback_id):
    """Delete a feedback entry"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM feedback WHERE id = %s RETURNING id", (feedback_id,))
        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        if not result:
            return jsonify({'error': 'Feedback not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Feedback deleted'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
