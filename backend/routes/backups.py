"""
Backup & Restore API routes - Database backup and restore functionality.
Uses pg_dump for PostgreSQL backups.
"""

from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
from functools import wraps
import subprocess
import os
import sys
import gzip
import shutil

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database_config import get_db_connection
from utils.jwt_handler import validate_jwt_token

backups_bp = Blueprint('backups', __name__)

# Backup directory
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

# Tables to backup
BACKUP_TABLES = [
    'users', 'algorithms', 'permissions', 'role_permissions',
    'road_nodes', 'road_edges', 'congestion_states',
    'incidents', 'bookmarks', 'route_bookmarks',
    'upload_sessions', 'bottleneck_results',
    'model_schedules', 'system_logs', 'detected_anomalies',
    'feedback', 'backups'
]


def developer_required(f):
    """Decorator to require developer role"""
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
        if user.get('role') not in ['developer', 'government']:
            return jsonify({'error': 'Developer or Government role required'}), 403

        request.current_user = user
        return f(*args, **kwargs)

    return decorated


def get_db_config():
    """Get database configuration from environment"""
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'traffic_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', '')
    }


def run_pg_dump(output_file, tables=None, compress=True):
    """
    Create database backup using Python (no pg_dump required).
    Exports table data as SQL INSERT statements.
    """
    import json

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        backup_tables = tables if tables else BACKUP_TABLES

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Traffic Bottleneck Database Backup\n")
            f.write(f"-- Created: {datetime.now().isoformat()}\n")
            f.write(f"-- Tables: {', '.join(backup_tables)}\n\n")

            for table in backup_tables:
                try:
                    # Check if table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables
                            WHERE table_name = %s
                        )
                    """, (table,))

                    if not cursor.fetchone()[0]:
                        f.write(f"-- Table {table} does not exist, skipping\n\n")
                        continue

                    # Get column info
                    cursor.execute("""
                        SELECT column_name, data_type
                        FROM information_schema.columns
                        WHERE table_name = %s
                        ORDER BY ordinal_position
                    """, (table,))
                    columns = cursor.fetchall()
                    col_names = [c[0] for c in columns]

                    # Get row count
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    row_count = cursor.fetchone()[0]

                    f.write(f"-- Table: {table} ({row_count} rows)\n")

                    if row_count > 0:
                        # Export data
                        cursor.execute(f"SELECT * FROM {table}")
                        rows = cursor.fetchall()

                        for row in rows:
                            values = []
                            for val in row:
                                if val is None:
                                    values.append('NULL')
                                elif isinstance(val, bool):
                                    values.append('TRUE' if val else 'FALSE')
                                elif isinstance(val, (int, float)):
                                    values.append(str(val))
                                elif isinstance(val, datetime):
                                    values.append(f"'{val.isoformat()}'")
                                elif isinstance(val, dict) or isinstance(val, list):
                                    values.append(f"'{json.dumps(val)}'")
                                else:
                                    # Escape single quotes
                                    escaped = str(val).replace("'", "''")
                                    values.append(f"'{escaped}'")

                            f.write(f"INSERT INTO {table} ({', '.join(col_names)}) VALUES ({', '.join(values)});\n")

                    f.write("\n")

                except Exception as table_error:
                    f.write(f"-- Error backing up {table}: {str(table_error)}\n\n")

        cursor.close()
        conn.close()

        # Compress if requested
        if compress:
            with open(output_file, 'rb') as f_in:
                with gzip.open(f'{output_file}.gz', 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(output_file)
            return True, f'{output_file}.gz'

        return True, output_file

    except Exception as e:
        return False, str(e)


def run_pg_restore(backup_file):
    """Run psql to restore from SQL file"""
    config = get_db_config()

    env = os.environ.copy()
    env['PGPASSWORD'] = config['password']

    # Decompress if needed
    actual_file = backup_file
    if backup_file.endswith('.gz'):
        actual_file = backup_file[:-3]
        with gzip.open(backup_file, 'rb') as f_in:
            with open(actual_file, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

    cmd = [
        'psql',
        '-h', config['host'],
        '-p', config['port'],
        '-U', config['user'],
        '-d', config['database'],
        '-f', actual_file
    ]

    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            timeout=600  # 10 minute timeout
        )

        # Clean up decompressed file
        if actual_file != backup_file and os.path.exists(actual_file):
            os.remove(actual_file)

        if result.returncode != 0:
            error_msg = result.stderr.decode() if result.stderr else 'Unknown error'
            return False, error_msg

        return True, 'Restore completed successfully'

    except subprocess.TimeoutExpired:
        return False, 'Restore timed out'
    except Exception as e:
        return False, str(e)


@backups_bp.route('/', methods=['GET'])
@developer_required
def list_backups():
    """List all backups"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT b.*, u.email as created_by_email
            FROM backups b
            LEFT JOIN users u ON b.created_by = u.id
            WHERE b.is_deleted = FALSE
            ORDER BY b.created_at DESC
        """)

        columns = [desc[0] for desc in cursor.description]
        backups = []

        for row in cursor.fetchall():
            backup = dict(zip(columns, row))
            if backup.get('created_at'):
                backup['created_at'] = backup['created_at'].isoformat()
            if backup.get('deleted_at'):
                backup['deleted_at'] = backup['deleted_at'].isoformat()

            # Check if file still exists
            if backup.get('file_path'):
                backup['file_exists'] = os.path.exists(backup['file_path'])

            backups.append(backup)

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': {
                'backups': backups,
                'total': len(backups)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/', methods=['POST'])
@developer_required
def create_backup():
    """Create a new backup"""
    try:
        data = request.get_json() if request.is_json else {}
        user = request.current_user

        backup_type = data.get('type', 'full')  # full, partial
        tables = data.get('tables', BACKUP_TABLES if backup_type == 'full' else [])
        notes = data.get('notes', '')
        compress = data.get('compress', True)

        if backup_type == 'partial' and not tables:
            return jsonify({'error': 'Tables must be specified for partial backup'}), 400

        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"backup_{backup_type}_{timestamp}.sql"
        output_file = os.path.join(BACKUP_DIR, filename)

        # Run pg_dump
        success, result = run_pg_dump(output_file, tables if backup_type == 'partial' else None, compress)

        if not success:
            return jsonify({
                'success': False,
                'error': f'Backup failed: {result}'
            }), 500

        # Get file size
        file_path = result
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        final_filename = os.path.basename(file_path)

        # Record in database
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO backups
            (filename, file_path, file_size, backup_type, status, tables_included, created_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            final_filename,
            file_path,
            file_size,
            backup_type,
            'completed',
            tables,
            user.get('id'),
            notes
        ))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Backup created successfully',
            'data': {
                'id': result[0],
                'filename': final_filename,
                'file_size': file_size,
                'file_size_mb': round(file_size / (1024 * 1024), 2),
                'created_at': result[1].isoformat()
            }
        }), 201

    except Exception as e:
        print(f"Error creating backup: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/<int:backup_id>', methods=['GET'])
@developer_required
def get_backup(backup_id):
    """Get backup details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT b.*, u.email as created_by_email
            FROM backups b
            LEFT JOIN users u ON b.created_by = u.id
            WHERE b.id = %s
        """, (backup_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            return jsonify({'error': 'Backup not found'}), 404

        columns = [desc[0] for desc in cursor.description]
        backup = dict(zip(columns, row))

        if backup.get('created_at'):
            backup['created_at'] = backup['created_at'].isoformat()

        if backup.get('file_path'):
            backup['file_exists'] = os.path.exists(backup['file_path'])

        return jsonify({
            'success': True,
            'data': backup
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/<int:backup_id>/download', methods=['GET'])
@developer_required
def download_backup(backup_id):
    """Download a backup file"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT filename, file_path FROM backups WHERE id = %s", (backup_id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()

        if not row:
            return jsonify({'error': 'Backup not found'}), 404

        filename, file_path = row

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'Backup file not found on disk'}), 404

        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/<int:backup_id>/restore', methods=['POST'])
@developer_required
def restore_backup(backup_id):
    """Restore from a backup"""
    try:
        data = request.get_json() if request.is_json else {}
        confirm = data.get('confirm', False)

        if not confirm:
            return jsonify({
                'success': False,
                'error': 'Restore operation requires confirmation. Set confirm: true'
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT filename, file_path FROM backups WHERE id = %s", (backup_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Backup not found'}), 404

        filename, file_path = row

        if not file_path or not os.path.exists(file_path):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Backup file not found on disk'}), 404

        cursor.close()
        conn.close()

        # Perform restore
        success, message = run_pg_restore(file_path)

        if not success:
            return jsonify({
                'success': False,
                'error': f'Restore failed: {message}'
            }), 500

        return jsonify({
            'success': True,
            'message': 'Database restored successfully',
            'data': {
                'backup_id': backup_id,
                'filename': filename,
                'restored_at': datetime.utcnow().isoformat()
            }
        }), 200

    except Exception as e:
        print(f"Error restoring backup: {e}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/<int:backup_id>', methods=['DELETE'])
@developer_required
def delete_backup(backup_id):
    """Delete a backup (soft delete)"""
    try:
        data = request.get_json() if request.is_json else {}
        hard_delete = data.get('hard_delete', False)

        conn = get_db_connection()
        cursor = conn.cursor()

        if hard_delete:
            # Get file path first
            cursor.execute("SELECT file_path FROM backups WHERE id = %s", (backup_id,))
            row = cursor.fetchone()

            if row and row[0] and os.path.exists(row[0]):
                os.remove(row[0])

            cursor.execute("DELETE FROM backups WHERE id = %s RETURNING id", (backup_id,))
        else:
            cursor.execute("""
                UPDATE backups
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id
            """, (backup_id,))

        result = cursor.fetchone()
        conn.commit()

        cursor.close()
        conn.close()

        if not result:
            return jsonify({'error': 'Backup not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Backup deleted' + (' permanently' if hard_delete else '')
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/stats', methods=['GET'])
@developer_required
def get_backup_stats():
    """Get backup statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN backup_type = 'full' THEN 1 ELSE 0 END) as full_backups,
                SUM(CASE WHEN backup_type = 'partial' THEN 1 ELSE 0 END) as partial_backups,
                SUM(file_size) as total_size,
                MAX(created_at) as last_backup
            FROM backups
            WHERE is_deleted = FALSE
        """)

        row = cursor.fetchone()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': {
                'total': row[0] or 0,
                'full_backups': row[1] or 0,
                'partial_backups': row[2] or 0,
                'total_size_bytes': row[3] or 0,
                'total_size_mb': round((row[3] or 0) / (1024 * 1024), 2),
                'last_backup': row[4].isoformat() if row[4] else None
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/tables', methods=['GET'])
@developer_required
def get_available_tables():
    """Get list of tables available for backup"""
    return jsonify({
        'success': True,
        'data': {
            'tables': BACKUP_TABLES,
            'total': len(BACKUP_TABLES)
        }
    }), 200


@backups_bp.route('/cleanup', methods=['DELETE'])
@developer_required
def cleanup_old_backups():
    """Delete backups older than specified days"""
    try:
        days = int(request.args.get('days', 30))
        hard_delete = request.args.get('hard_delete', 'false').lower() == 'true'

        if days < 7:
            return jsonify({'error': 'Minimum retention period is 7 days'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        if hard_delete:
            # Get file paths first
            cursor.execute("""
                SELECT file_path FROM backups
                WHERE created_at < NOW() - INTERVAL '%s days'
                  AND is_deleted = FALSE
            """, (days,))

            for row in cursor.fetchall():
                if row[0] and os.path.exists(row[0]):
                    try:
                        os.remove(row[0])
                    except Exception:
                        pass

            cursor.execute("""
                DELETE FROM backups
                WHERE created_at < NOW() - INTERVAL '%s days'
                RETURNING id
            """, (days,))
        else:
            cursor.execute("""
                UPDATE backups
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP
                WHERE created_at < NOW() - INTERVAL '%s days'
                  AND is_deleted = FALSE
                RETURNING id
            """, (days,))

        deleted_count = cursor.rowcount
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Cleaned up {deleted_count} backups older than {days} days'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
