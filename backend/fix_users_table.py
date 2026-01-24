"""
Fix users table by removing duplicate columns.
This script will:
1. Create a backup of the users table
2. Create a new clean users table with correct schema
3. Migrate data to the new table
4. Replace the old table with the new one
"""

from database_config import get_db_connection
from datetime import datetime

def fix_users_table():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("\n" + "="*70)
        print("FIXING USERS TABLE - REMOVING DUPLICATE COLUMNS")
        print("="*70)
        
        # Step 1: Check current columns
        print("\n1. Checking current table structure...")
        cursor.execute("""
            SELECT column_name, data_type, ordinal_position 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print(f"   Found {len(columns)} column definitions")
        
        # Step 2: Create backup table
        print("\n2. Creating backup table (users_backup)...")
        cursor.execute("DROP TABLE IF EXISTS users_backup CASCADE;")
        cursor.execute("""
            CREATE TABLE users_backup AS 
            SELECT * FROM users;
        """)
        cursor.execute("SELECT COUNT(*) FROM users_backup;")
        backup_count = cursor.fetchone()[0]
        print(f"   ✓ Backed up {backup_count} user records")
        
        # Step 3: Get data from old table (selecting specific columns to avoid duplicates)
        print("\n3. Extracting data from old table...")
        cursor.execute("""
            SELECT 
                CAST(id AS INTEGER) as id,
                email,
                password_hash,
                role,
                is_active,
                created_at,
                name,
                last_login,
                is_suspended,
                suspended_at,
                suspended_reason,
                last_checked_notifications
            FROM users;
        """)
        users_data = cursor.fetchall()
        print(f"   ✓ Extracted {len(users_data)} users")
        
        # Step 4: Drop old users table
        print("\n4. Dropping old users table...")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE;")
        print("   ✓ Old table dropped")
        
        # Step 5: Create new clean users table
        print("\n5. Creating new users table with clean schema...")
        cursor.execute("""
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'public',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                name VARCHAR(255),
                last_login TIMESTAMP,
                is_suspended BOOLEAN DEFAULT FALSE,
                suspended_at TIMESTAMP,
                suspended_reason TEXT,
                last_checked_notifications TIMESTAMP
            );
        """)
        print("   ✓ New table created")
        
        # Step 6: Insert data into new table
        print("\n6. Migrating data to new table...")
        for user in users_data:
            cursor.execute("""
                INSERT INTO users (
                    id, email, password_hash, role, is_active, created_at,
                    name, last_login, is_suspended, suspended_at, 
                    suspended_reason, last_checked_notifications
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, user)
        print(f"   ✓ Migrated {len(users_data)} users")
        
        # Step 7: Reset sequence
        print("\n7. Resetting ID sequence...")
        cursor.execute("SELECT MAX(id) FROM users;")
        max_id = cursor.fetchone()[0]
        if max_id:
            cursor.execute(f"ALTER SEQUENCE users_id_seq RESTART WITH {max_id + 1};")
            print(f"   ✓ Sequence reset to {max_id + 1}")
        
        # Step 8: Create indexes
        print("\n8. Creating indexes...")
        cursor.execute("CREATE INDEX idx_users_email ON users(email);")
        cursor.execute("CREATE INDEX idx_users_role ON users(role);")
        print("   ✓ Indexes created")
        
        # Step 9: Verify
        print("\n9. Verifying migration...")
        cursor.execute("SELECT COUNT(*) FROM users;")
        new_count = cursor.fetchone()[0]
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        """)
        new_columns = cursor.fetchall()
        
        print(f"   ✓ New table has {new_count} users")
        print(f"   ✓ New table has {len(new_columns)} columns (no duplicates)")
        
        # Commit changes
        conn.commit()
        
        print("\n" + "="*70)
        print("✅ USERS TABLE FIXED SUCCESSFULLY!")
        print("="*70)
        print(f"\nNew schema:")
        for col in new_columns:
            print(f"   - {col[0]:30s} {col[1]}")
        print(f"\n📝 Backup table 'users_backup' retained for safety")
        print("   (You can drop it later with: DROP TABLE users_backup;)")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        conn.rollback()
        print("\n⚠️  Rolling back changes. Original table preserved.")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_users_table()
