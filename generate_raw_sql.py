import requests
import json
import sys

url = 'https://gokups.hutsos.kehutanan.go.id/sharing/lembaga'
res = requests.get(url, auth=('pskl', '!@#$%6789'), headers={'User-Agent': 'Mozilla/5.0'})
try:
    data = res.json().get('data', [])
except Exception as e:
    print(f"Failed to parse JSON: {e}")
    sys.exit(1)

keys_set = set()
for r in data:
    keys_set.update(r.keys())
keys = sorted(list(keys_set))

create_table = "CREATE TABLE IF NOT EXISTS lembaga_raw (\n"
columns = []
for key in keys:
    columns.append(f'"{key}" TEXT')
create_table += ",\n".join(columns) + "\n);\n"

insert_statements = []
for row in data:
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
    
    insert_statements.append(f"INSERT INTO lembaga_raw ({col_str}) VALUES ({val_str});")

with open('import_lembaga_raw.sql', 'w', encoding='utf-8') as f:
    f.write("DROP TABLE IF EXISTS lembaga_raw;\n")
    f.write(create_table + "BEGIN;\n" + "\n".join(insert_statements) + "\nCOMMIT;\n")

print(f"SQL Generated for {len(data)} raw records.")
