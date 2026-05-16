import json
import os

def find_missing_explicit(en_path, km_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(km_path, 'r', encoding='utf-8') as f:
        km_data = json.load(f)

    missing = []
    
    def walk(en_obj, km_obj, path=""):
        for key, value in en_obj.items():
            if key.startswith('auto.'): continue
            current_path = f"{path}.{key}" if path else key
            if key not in km_obj:
                missing.append(current_path)
            elif isinstance(value, dict):
                if isinstance(km_obj[key], dict):
                    walk(value, km_obj[key], current_path)
    
    walk(en_data, km_data)
    return missing

en_file = 'apps/web/src/messages/en.json'
km_file = 'apps/web/src/messages/km.json'

if os.path.exists(en_file) and os.path.exists(km_file):
    results = find_missing_explicit(en_file, km_file)
    for path in results:
        print(path)
