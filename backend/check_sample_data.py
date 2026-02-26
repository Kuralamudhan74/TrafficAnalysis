#!/usr/bin/env python3
"""
Quick script to check and populate pre-inserted sample data with bottleneck rankings
"""

import sys
import os
import json
import uuid
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_config import get_db_connection
from datetime import datetime

SAMPLE_ROADS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sample_data', 'sample_roads.geojson')

def main():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("🔍 Checking pre-inserted sample data...")
        
        # Find pre-inserted session
        cursor.execute("""
            SELECT session_id, road_count, status
            FROM upload_sessions
            WHERE road_network_filename IS NULL 
              AND gps_trajectories_filename IS NULL 
              AND status = 'ready'
            LIMIT 1
        """)
        
        session = cursor.fetchone()
        if not session:
            print("❌ No pre-inserted session found")
            cursor.close()
            conn.close()
            return
        
        session_id, road_count, status = session
        print(f"✅ Found session: {session_id}")
        print(f"   Status: {status}, Roads: {road_count}")
        
        # Check if roads exist
        cursor.execute("""
            SELECT COUNT(*) FROM road_nodes WHERE session_id = %s
        """, (session_id,))
        
        road_count = cursor.fetchone()[0]
        print(f"   Actual roads in DB: {road_count}")
        
        if road_count == 0 and os.path.exists(SAMPLE_ROADS_FILE):
            print("   📁 Loading sample roads from GeoJSON...")
            
            with open(SAMPLE_ROADS_FILE, 'r') as f:
                roads_data = json.load(f)
            
            roads_loaded = 0
            for feature in roads_data.get('features', [])[:15]:  # Load first 15 roads
                try:
                    props = feature.get('properties', {})
                    road_id = props.get('id') or str(uuid.uuid4())
                    road_name = props.get('name') or f'Road_{road_id[:8]}'
                    geometry = json.dumps(feature.get('geometry', {}))
                    
                    cursor.execute("""
                        INSERT INTO road_nodes 
                        (session_id, road_id, road_name, geometry, length_meters, capacity)
                        VALUES (%s, %s, %s, ST_GeomFromGeoJSON(%s), %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (session_id, road_id, road_name, geometry, 1000, 1000))
                    
                    roads_loaded += 1
                except Exception as e:
                    print(f"      Warning: Could not insert road: {e}")
            
            conn.commit()
            print(f"   ✅ Loaded {roads_loaded} roads")
        
        # Check bottleneck rankings
        cursor.execute("""
            SELECT COUNT(*) FROM bottleneck_rankings 
            WHERE session_id = %s
        """, (session_id,))
        
        ranking_count = cursor.fetchone()[0]
        print(f"   Bottleneck rankings: {ranking_count}")
        
        if ranking_count == 0 and road_count > 0:
            print("   🔧 Generating sample bottleneck rankings...")
            
            # Get top 10 roads
            cursor.execute("""
                SELECT id FROM road_nodes 
                WHERE session_id = %s
                LIMIT 10
            """, (session_id,))
            
            roads = cursor.fetchall()
            
            # Create rankings
            now = datetime.now()
            for rank, (road_id,) in enumerate(roads, start=1):
                benefit_score = 100 - (rank * 8)
                affected_roads = 3 + rank
                
                cursor.execute("""
                    INSERT INTO bottleneck_rankings 
                    (session_id, road_node_id, rank_position, benefit_score, 
                     affected_roads_count, time_horizon_minutes, calculation_timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (session_id, road_id, rank, benefit_score, affected_roads, 30, now))
            
            conn.commit()
            print(f"   ✅ Created {len(roads)} bottleneck rankings")
        
        cursor.close()
        conn.close()
        print("\n✅ Sample data check complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
