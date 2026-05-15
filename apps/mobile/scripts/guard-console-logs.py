#!/usr/bin/env python3
"""
Guard all bare console.log/warn/error calls with if (__DEV__) in React Native screen files.

Rules:
- Skips lines already inside an `if (__DEV__)` block
- Only wraps standalone console.* statements (full statement on one line)
- Preserves indentation
- Does NOT touch lines that are already guarded
"""

import re
import os
import sys

# Patterns to match a standalone console.* call (the whole statement on one line)
# It must start with optional whitespace, then "console." and end with ");" optionally
CONSOLE_PATTERN = re.compile(r'^(\s*)(console\.(log|warn|error)\(.*\);?\s*)$')

def is_in_dev_block(lines, idx):
    """Check if this line is already within an if (__DEV__) { ... } block"""
    # Walk backwards looking for matching if (__DEV__)
    depth = 0
    for i in range(idx - 1, max(idx - 10, -1), -1):
        line = lines[i].strip()
        # Count braces to understand nesting
        depth += line.count('}') - line.count('{')
        if '__DEV__' in line and 'if' in line and depth <= 0:
            return True
    return False

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    modified = False
    i = 0
    
    while i < len(lines):
        line = lines[i]
        match = CONSOLE_PATTERN.match(line)
        
        if match:
            indent = match.group(1)
            statement = match.group(2).rstrip()
            
            # Check if already guarded
            if is_in_dev_block(lines, i):
                new_lines.append(line)
                i += 1
                continue
            
            # Wrap with __DEV__ guard
            new_lines.append(f"{indent}if (__DEV__) {{ {statement.lstrip()} }}")
            modified = True
        else:
            new_lines.append(line)
        
        i += 1
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        print(f"  Modified: {filepath}")
    
    return modified

def find_screen_files(base_dir):
    """Find all .tsx and .ts files under screens/"""
    result = []
    for root, dirs, files in os.walk(base_dir):
        # Skip node_modules
        dirs[:] = [d for d in dirs if d != 'node_modules']
        for fname in files:
            if fname.endswith('.tsx') or fname.endswith('.ts'):
                result.append(os.path.join(root, fname))
    return result

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # scripts/ lives one level inside apps/mobile, so go up one
    mobile_dir = os.path.dirname(script_dir)
    screens_dir = os.path.join(mobile_dir, 'src', 'screens')
    
    if not os.path.isdir(screens_dir):
        print(f"Error: {screens_dir} not found")
        sys.exit(1)
    
    files = find_screen_files(screens_dir)
    total_modified = 0
    
    print(f"Processing {len(files)} files in {screens_dir}...")
    for f in sorted(files):
        if process_file(f):
            total_modified += 1
    
    print(f"\nDone. {total_modified} files modified.")
