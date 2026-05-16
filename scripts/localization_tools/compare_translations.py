import json
import os

def find_missing_translations(en_path, km_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(km_path, 'r', encoding='utf-8') as f:
        km_data = json.load(f)

    missing = []
    
    def walk(en_obj, km_obj, path=""):
        for key, value in en_obj.items():
            current_path = f"{path}.{key}" if path else key
            if key not in km_obj:
                missing.append((current_path, value, "MISSING"))
            elif isinstance(value, dict):
                if isinstance(km_obj[key], dict):
                    walk(value, km_obj[key], current_path)
                else:
                    missing.append((current_path, value, "TYPE_MISMATCH"))
            elif value == km_obj[key] and value != "" and not any(char.isdigit() for char in value) and len(value) > 3:
                # If value is same as English and not empty and not just numbers and longer than 3 chars
                # This is a heuristic for "likely not translated"
                # But some words like "Admin" or "SaaS" might be the same in both.
                # So we should be careful.
                missing.append((current_path, value, "SAME_AS_EN"))

    walk(en_data, km_data)
    return missing

en_file = 'apps/web/src/messages/en.json'
km_file = 'apps/web/src/messages/km.json'

if os.path.exists(en_file) and os.path.exists(km_file):
    results = find_missing_translations(en_file, km_file)
    for path, val, reason in results:
        print(f"{reason}: {path} -> {val}")
else:
    print("Files not found")
