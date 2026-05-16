import json
import os

def analyze_auto_translations(en_path, km_path):
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(km_path, 'r', encoding='utf-8') as f:
        km_data = json.load(f)

    untranslated = {} # value -> list of paths
    
    def walk(en_obj, km_obj, path=""):
        for key, value in en_obj.items():
            current_path = f"{path}.{key}" if path else key
            if key.startswith('auto.') or path.startswith('auto.'):
                if key not in km_obj or value == km_obj[key]:
                    if isinstance(value, str) and value.strip() and len(value) > 1:
                        if value not in untranslated:
                            untranslated[value] = []
                        untranslated[value].append(current_path)
            
            if isinstance(value, dict):
                k_obj = km_obj.get(key, {})
                if isinstance(k_obj, dict):
                    walk(value, k_obj, current_path)
    
    walk(en_data, km_data)
    return untranslated

en_file = 'apps/web/src/messages/en.json'
km_file = 'apps/web/src/messages/km.json'

if os.path.exists(en_file) and os.path.exists(km_file):
    untranslated = analyze_auto_translations(en_file, km_file)
    print(f"Total unique untranslated auto values: {len(untranslated)}")
    # Print top 50 values to see what they are
    sorted_vals = sorted(untranslated.items(), key=lambda x: len(x[1]), reverse=True)
    for val, paths in sorted_vals[:50]:
        print(f"'{val}' ({len(paths)} occurrences)")
else:
    print("Files not found")
