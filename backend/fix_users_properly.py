"""
Properly fix users table by creating a clean table from scratch.
"""

from database_config import get_db_connection

def fix_users_table_properly():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("\n" + "="*70)
        print("FIXING USERS TABLE - CLEAN REBUILD")
        print("="*70)
        
        # Step 1: Get user data (using explicit column selection to avoid ambiguity)
        print("\n1. Extracting user data...")
        cursor.execute("""
            SELECT DISTINCT ON (u.email)
                u.id::INTEGER as id,
                u.email::VARCHAR,
                u.password_hash::TEXT,
                u.role::VARCHAR,
                COALESCE(u.is_active, TRUE) as is_active,
                u.created_at::TIMESTAMP,
                u.name::VARCHAR,
                u.last_login::TIMESTAMP,
                COALESCE(u.is_suspended, FALSE) as is_suspended,
                u.suspended_at::TIMESTAMP,
                u.suspended_reason::TEXT,
                u.last_checked_notifications::TIMESTAMP
            FROM users u
            ORDER BY u.email, u.id
        """)
        users_data = cursor.fetchall()
        print(f"   ✓ Extracted {len(users_data)} users")
        
        # Step 2: Drop and recreate table
        print("\n2. Dropping old table and creating clean table...")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE;")
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
        print("   ✓ Clean table created")
        
        # Step 3: Insert data
        print("\n3. Inserting user data...")
        inserted = 0
        for user in users_data:
            try:
                cursor.execute("""
                    INSERT INTO users (
                        id, email, password_hash, role, is_active, created_at,
                        name, last_login, is_suspended, suspended_at, 
                        suspended_reason, last_checked_notifications
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, user)
                inserted += 1
            except Exception as e:
                print(f"   ⚠️  Skipped duplicate user: {user[1]} - {e}")
        
        print(f"   ✓ Inserted {inserted} users")
        
        # Step 4: Reset sequence
        print("\n4. Resetting ID sequence...")
        cursor.execute("SELECT MAX(id) FROM users;")
        max_id = cursor.fetchone()[0]
        if max_id:
            cursor.execute(f"ALTER SEQUENCE users_id_seq RESTART WITH {max_id + 1};")
            print(f"   ✓ Sequence set to {max_id + 1}")
        
        # Step 5: Create indexes
        print("\n5. Creating indexes...")
        cursor.execute("CREATE INDEX idx_users_email ON users(email);")
        cursor.execute("CREATE INDEX idx_users_role ON users(role);")
        cursor.execute("CREATE INDEX idx_users_active ON users(is_active);")
        print("   ✓ Indexes created")
        
        # Step 6: Verify
        print("\n6. Verifying...")
        cursor.execute("SELECT COUNT(*) FROM users;")
        count = cursor.fetchone()[0]
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        
        # Check for duplicates
        col_names = [c[0] for c in columns]
        duplicates = [name for name in set(col_names) if col_names.count(name) > 1]
        
        if duplicates:
            raise Exception(f"Still have duplicates: {duplicates}")
        
        print(f"   ✓ Table has {count} users")
        print(f"   ✓ Table has {len(columns)} unique columns")
        
        # Commit
        conn.commit()
        
        print("\n" + "="*70)
        print("✅ USERS TABLE FIXED SUCCESSFULLY!")
        print("="*70)
        print("\nNew schema (NO DUPLICATES):")
        for i, col in enumerate(columns, 1):
            print(f"   {i:2d}. {col[0]:30s} {col[1]}")
        
        # Test a query
        print("\n7. Testing queries...")
        cursor.execute("SELECT id, email, role FROM users LIMIT 3;")
        test_users = cursor.fetchall()
        print("   Sample users:")
        for u in test_users:
            print(f"   - ID: {u[0]}, Email: {u[1]}, Role: {u[2]}")
        print("   ✓ Queries work correctly!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    fix_users_table_properly()
