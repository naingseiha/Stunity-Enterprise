import json

def detect_duplicates(pairs):
    d = {}
    for k, v in pairs:
        if k in d:
            print(f"Duplicate key found: {k}")
        d[k] = v
    return d

for lang in ['en', 'km']:
    print(f"Checking {lang}.json...")
    with open(f'/Users/naingseiha/Documents/projects/Stunity-Enterprise/apps/web/src/messages/{lang}.json', 'r') as f:
        json.load(f, object_pairs_hook=detect_duplicates)
