from database_config import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

# Check actual columns using pg_attribute
cursor.execute("""
    SELECT attname, attnum 
    FROM pg_attribute 
    WHERE attrelid = 'users'::regclass 
    AND attnum > 0 
    AND NOT attisdropped 
    ORDER BY attnum;
""")

cols = cursor.fetchall()
print('\nActual columns from pg_attribute (system catalog):')
print('='*60)
for c in cols:
    print(f'{c[1]:3d}. {c[0]}')
print('='*60)
print(f'Total: {len(cols)} columns')

# Check for true duplicates
col_names = [c[0] for c in cols]
seen = set()
duplicates = []
for name in col_names:
    if name in seen:
        duplicates.append(name)
    seen.add(name)

if duplicates:
    print(f'\n⚠️  TRUE DUPLICATES: {duplicates}')
else:
    print('\n✅ No true duplicate column names!')

cursor.close()
conn.close()
