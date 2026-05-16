import json
import os

def find_duplicates(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    def walk(obj, path=""):
        if isinstance(obj, dict):
            keys = list(obj.keys())
            for key in keys:
                walk(obj[key], f"{path}.{key}" if path else key)
        
    # Standard json.load handles duplicates by keeping the last one.
    # To find duplicates, we need to parse manually or use a custom hook.
    
    from collections import Counter
    
    def check_dupes(file_content):
        import re
        # Find all keys in the format "key":
        keys = re.findall(r'"([^"]+)":', file_content)
        # This is very rough as it finds all keys regardless of nesting.
        # But we can look for specific common keys.
        return Counter(keys)

    with open(file_path, 'r') as f:
        content = f.read()
        
    dupes = [k for k, v in check_dupes(content).items() if v > 1]
    print(f"Potential duplicates in {os.path.basename(file_path)}: {dupes}")

find_duplicates('/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/messages/en.json')
