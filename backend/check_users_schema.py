from database_config import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

cursor.execute("""
    SELECT column_name, data_type, ordinal_position 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
""")

cols = cursor.fetchall()

print("\nUsers table columns:")
print("=" * 70)
for c in cols:
    print(f"{c[2]:3d}. {c[0]:35s} {c[1]}")
print("=" * 70)
print(f"Total columns: {len(cols)}")

# Check for duplicates
col_names = [c[0] for c in cols]
duplicates = [name for name in set(col_names) if col_names.count(name) > 1]
if duplicates:
    print(f"\n⚠️  DUPLICATE COLUMNS FOUND: {duplicates}")
else:
    print("\n✅ No duplicate column names")

cursor.close()
conn.close()
