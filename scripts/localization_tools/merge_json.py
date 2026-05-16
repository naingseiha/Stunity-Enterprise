import json

# List of files to clean up
files = [
    '/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/messages/en.json',
    '/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/messages/km.json'
]

def merge_duplicates(pairs):
    d = {}
    for k, v in pairs:
        if k in d and isinstance(d[k], dict) and isinstance(v, dict):
            d[k].update(v)
        else:
            d[k] = v
    return d

for file_path in files:
    print(f"Merging duplicates in {file_path}")
    with open(file_path, 'r') as f:
        data = json.load(f, object_pairs_hook=merge_duplicates)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
