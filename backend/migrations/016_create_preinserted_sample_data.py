"""
Migration: Create pre-inserted sample data session with bottleneck rankings
This enables the "Restore Pre-inserted Data" feature to work
"""

import sys
import os
import json
import uuid
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database_config import get_db_connection

# Path to sample data
SAMPLE_ROADS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'sample_data', 'sample_roads.geojson')
SAMPLE_GPS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'sample_data', 'sample_gps.csv')


def _generate_sample_bottlenecks(cursor, session_id):
    """Generate sample bottleneck rankings for pre-inserted data"""
    try:
        # Get all roads
        cursor.execute("""
            SELECT id, road_id, road_name 
            FROM road_nodes 
            WHERE session_id = %s
            ORDER BY id ASC
            LIMIT 10
        """, (session_id,))
        
        roads = cursor.fetchall()
        
        if not roads:
            print("      ⚠️  No roads found, skipping bottleneck generation")
            return
        
        # Clear existing rankings
        cursor.execute("""
            DELETE FROM bottleneck_rankings 
            WHERE session_id = %s
        """, (session_id,))
        
        # Create sample rankings (mock data for demonstration)
        now = datetime.now()
        for rank, (road_id, road_db_id, road_name) in enumerate(roads, start=1):
            # Higher benefit scores for roads with lower rank
            benefit_score = 100 - (rank * 8)
            affected_roads = 3 + rank
            
            cursor.execute("""
                INSERT INTO bottleneck_rankings 
                (session_id, road_node_id, rank_position, benefit_score, 
                 affected_roads_count, time_horizon_minutes, calculation_timestamp, model_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (session_id, road_id, rank, benefit_score, affected_roads, 30, now, 'LIM'))
        
        print(f"      ✅ Generated {min(len(roads), 10)} sample bottleneck rankings")
        
    except Exception as e:
        print(f"      ⚠️  Could not generate bottleneck rankings: {e}")


def up(cursor):
    """Create pre-inserted sample data session"""
    try:
        print("🔄 Creating pre-inserted sample data session...")

        # Check if sample data already exists
        cursor.execute("""
            SELECT COUNT(*) FROM upload_sessions
            WHERE road_network_filename IS NULL 
              AND gps_trajectories_filename IS NULL 
              AND status = 'ready'
        """)
        
        if cursor.fetchone()[0] > 0:
            print("   ℹ️  Pre-inserted data session already exists, skipping...")
            return

        # Create a session for pre-inserted data
        session_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO upload_sessions 
            (session_id, status, road_network_filename, gps_trajectories_filename, 
             road_count, gps_point_count, preprocessing_completed_at, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (session_id, 'ready', None, None, 0, 0, False))

        print(f"   ✅ Created pre-inserted session: {session_id}")

        # Load sample road network if file exists
        if os.path.exists(SAMPLE_ROADS_FILE):
            print(f"   📁 Loading sample road network from {SAMPLE_ROADS_FILE}...")
            with open(SAMPLE_ROADS_FILE, 'r') as f:
                roads_geojson = json.load(f)
            
            # Insert roads
            road_count = 0
            for feature in roads_geojson.get('features', []):
                try:
                    road_id = feature.get('properties', {}).get('id') or str(uuid.uuid4())
                    road_name = feature.get('properties', {}).get('name') or f'Road_{road_id}'
                    geometry = json.dumps(feature.get('geometry'))
                    
                    cursor.execute("""
                        INSERT INTO road_nodes 
                        (session_id, road_id, road_name, geometry, length_meters, capacity)
                        VALUES (%s, %s, %s, ST_GeomFromGeoJSON(%s), %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (session_id, road_id, road_name, geometry, 1000, 1000))
                    
                    road_count += 1
                except Exception as e:
                    print(f"      Warning: Could not insert road {road_id}: {e}")
            
            print(f"   ✅ Loaded {road_count} roads")
            
            # Update road count
            cursor.execute("""
                UPDATE upload_sessions 
                SET road_count = %s
                WHERE session_id = %s
            """, (road_count, session_id))
            
            # Generate sample bottleneck rankings
            print("   🔧 Generating sample bottleneck rankings...")
            _generate_sample_bottlenecks(cursor, session_id)

        print("   ✅ Pre-inserted data session ready")

    except Exception as e:
        print(f"   ❌ Error creating pre-inserted data: {str(e)}")
        raise e


def down(cursor):
    """Rollback: Remove pre-inserted data session"""
    try:
        print("🔄 Removing pre-inserted sample data session...")

        cursor.execute("""
            SELECT session_id FROM upload_sessions
            WHERE road_network_filename IS NULL 
              AND gps_trajectories_filename IS NULL 
              AND status = 'ready'
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        if result:
            session_id = result[0]
            
            # Delete associated data
            cursor.execute("DELETE FROM road_nodes WHERE session_id = %s", (session_id,))
            cursor.execute("DELETE FROM upload_sessions WHERE session_id = %s", (session_id,))
            
            print(f"   ✅ Removed pre-inserted session: {session_id}")
        else:
            print("   ℹ️  No pre-inserted session found")

    except Exception as e:
        print(f"   ❌ Error removing pre-inserted data: {str(e)}")
        raise e


if __name__ == '__main__':
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        up(cursor)
        conn.commit()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()
