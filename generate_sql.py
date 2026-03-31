import requests
import json
import sys
import hashlib

url = 'https://gokups.hutsos.kehutanan.go.id/sharing/lembaga'
res = requests.get(url, auth=('pskl', '!@#$%6789'), headers={'User-Agent': 'Mozilla/5.0'})
try:
    data = res.json().get('data', [])
except Exception as e:
    print(f"Failed to parse JSON: {e}")
    sys.exit(1)

if not data:
    print("No data found")
    sys.exit(1)

keys_set = set()
for r in data:
    keys_set.update(r.keys())
keys = sorted(list(keys_set))
if 'id' not in keys:
    keys.append('id')

create_table = "CREATE TABLE IF NOT EXISTS lembaga (\n"
columns = []
for key in keys:
    if key == 'id':
        columns.append(f'"{key}" VARCHAR PRIMARY KEY')
    else:
        columns.append(f'"{key}" TEXT')
create_table += ",\n".join(columns) + "\n);\n"

insert_statements = []
for row in data:
    # Ensure ID exists
    if not row.get('id'):
        # Generate a unique hash for the ID based on other fields
        hash_input = str(row.get('surat_keputusan', '')) + str(row.get('kelompok', '')) + str(row.get('tanggal_sk', ''))
        row['id'] = 'gen_' + hashlib.md5(hash_input.encode('utf-8')).hexdigest()

    cols = []
    vals = []
    for k in keys:
        cols.append(f'"{k}"')
        v = row.get(k)
        if v is None:
            vals.append('NULL')
        else:
            val = str(v).replace("'", "''")
            vals.append(f"'{val}'")
    
    col_str = ", ".join(cols)
    val_str = ", ".join(vals)
    
    update_cols = []
    for k in keys:
        if k != 'id':
            update_cols.append(f'"{k}" = EXCLUDED."{k}"')
    update_str = ", ".join(update_cols)
    
    insert_statements.append(f"INSERT INTO lembaga ({col_str}) VALUES ({val_str}) ON CONFLICT (id) DO UPDATE SET {update_str};")

with open('import_lembaga.sql', 'w', encoding='utf-8') as f:
    f.write(create_table + "\nBEGIN;\n" + "\n".join(insert_statements) + "\nCOMMIT;\n")

print(f"Generated SQL for {len(data)} records in import_lembaga.sql")
